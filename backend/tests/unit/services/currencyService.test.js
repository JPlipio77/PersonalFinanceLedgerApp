jest.mock('axios');
const axios = require('axios');
const currencyService = require('../../../src/services/currencyService');

beforeEach(() => {
  jest.clearAllMocks();
  currencyService._resetCache();
  delete process.env.OXR_APP_ID;
});

describe('currencyService', () => {
  it('returns amount unchanged when currency is USD', async () => {
    const result = await currencyService.convertToUSD(100, 'USD');
    expect(result).toBe(100);
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('returns amount unchanged when no currency provided', async () => {
    const result = await currencyService.convertToUSD(50, null);
    expect(result).toBe(50);
  });

  it('converts amount using fetched rate', async () => {
    process.env.OXR_APP_ID = 'test-app-id';
    axios.get.mockResolvedValue({ data: { rates: { EUR: 0.92, PHP: 56.5 } } });

    const result = await currencyService.convertToUSD(92, 'EUR');
    // 92 EUR / 0.92 = 100 USD
    expect(parseFloat(result.toFixed(2))).toBeCloseTo(100, 1);
    expect(axios.get).toHaveBeenCalledTimes(1);
  });

  it('uses cached rates on second call without re-fetching', async () => {
    process.env.OXR_APP_ID = 'test-app-id';
    axios.get.mockResolvedValue({ data: { rates: { EUR: 0.92 } } });

    await currencyService.convertToUSD(100, 'EUR');
    await currencyService.convertToUSD(200, 'EUR');

    // Rates were cached — only one HTTP call
    expect(axios.get).toHaveBeenCalledTimes(1);
  });

  it('returns amount unchanged when API call fails', async () => {
    process.env.OXR_APP_ID = 'test-app-id';
    axios.get.mockRejectedValue(new Error('Network error'));

    const result = await currencyService.convertToUSD(100, 'EUR');
    // rate not found in empty cache → return original
    expect(result).toBe(100);
  });

  it('returns amount unchanged when OXR_APP_ID is not set', async () => {
    const result = await currencyService.convertToUSD(100, 'EUR');
    expect(result).toBe(100);
    expect(axios.get).not.toHaveBeenCalled();
  });
});
