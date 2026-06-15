import { useState, useEffect, useCallback } from 'react';
import * as budgetsApi from '../api/budgetsApi';

export function useBudgets(month, year) {
  const [budgets,  setBudgets]  = useState([]);
  const [summary,  setSummary]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (month) params.month = month;
      if (year)  params.year  = year;
      const [data, sum] = await Promise.all([
        budgetsApi.getBudgets(params),
        budgetsApi.getBudgetSummary(params),
      ]);
      setBudgets(data);
      setSummary(sum);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load budgets');
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  const upsert = async (data) => {
    const b = await budgetsApi.upsertBudget(data);
    await load();
    return b;
  };

  const update = async (id, data) => {
    const b = await budgetsApi.updateBudget(id, data);
    await load();
    return b;
  };

  const remove = async (id) => {
    await budgetsApi.deleteBudget(id);
    setBudgets(prev => prev.filter(b => b._id !== id));
  };

  return { budgets, summary, loading, error, upsert, update, remove, reload: load };
}
