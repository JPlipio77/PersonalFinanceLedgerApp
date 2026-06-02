const axios = require('axios');
const logger = require('../utils/logger');

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

let _rates = {};
let _fetchedAt = 0;

const fetchRates = async () => {
  const appId = process.env.OXR_APP_ID;
  if (!appId) return;

  try {
    const { data } = await axios.get(
      `https://openexchangerates.org/api/latest.json?app_id=${appId}&base=USD`
    );
    _rates = data.rates || {};
    _fetchedAt = Date.now();
    logger.info(`Currency rates refreshed (${Object.keys(_rates).length} currencies)`);
  } catch (err) {
    logger.warn('Failed to fetch currency rates — using cached/fallback values', { message: err.message });
  }
};

const getRates = async () => {
  if (Date.now() - _fetchedAt > CACHE_TTL_MS) {
    await fetchRates();
  }
  return _rates;
};

/**
 * Converts an amount in `currency` to USD.
 * Returns amount unchanged if rates unavailable or currency is USD.
 */
const convertToUSD = async (amount, currency) => {
  if (!currency || currency === 'USD') return amount;
  const rates = await getRates();
  const rate = rates[currency];
  if (!rate || rate === 0) return amount;
  return parseFloat((amount / rate).toFixed(6));
};

/**
 * Returns all cached rates (USD base).
 */
const getAllRates = async () => {
  const rates = await getRates();
  return rates;
};

const _resetCache = () => { _rates = {}; _fetchedAt = 0; };

module.exports = { convertToUSD, getAllRates, fetchRates, _resetCache };
