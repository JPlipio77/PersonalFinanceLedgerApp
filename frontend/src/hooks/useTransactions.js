import { useState, useEffect, useCallback } from 'react';
import * as transactionsApi from '../api/transactionsApi';

export function useTransactions(initialFilters = {}) {
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [filters, setFilters] = useState(initialFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      const merged = { ...filters, ...params };
      const data = await transactionsApi.getTransactions(merged);
      setTransactions(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const create = async (data) => {
    const tx = await transactionsApi.createTransaction(data);
    setTransactions((prev) => [tx, ...prev]);
    return tx;
  };

  const update = async (id, data) => {
    const tx = await transactionsApi.updateTransaction(id, data);
    setTransactions((prev) => prev.map((t) => (t._id === id ? tx : t)));
    return tx;
  };

  const remove = async (id) => {
    await transactionsApi.deleteTransaction(id);
    setTransactions((prev) => prev.filter((t) => t._id !== id));
  };

  const applyFilters = (newFilters) => {
    setFilters(newFilters);
  };

  const goToPage = (page) => load({ ...filters, page });

  return {
    transactions, pagination, filters, loading, error,
    create, update, remove, applyFilters, goToPage, reload: load,
  };
}
