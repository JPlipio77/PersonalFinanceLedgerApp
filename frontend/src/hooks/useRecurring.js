import { useState, useEffect, useCallback } from 'react';
import * as recurringApi from '../api/recurringApi';

export default function useRecurring() {
  const [rules, setRules]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await recurringApi.listRules({ limit: 50 });
      setRules(result.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load recurring rules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const createRule = async (payload) => {
    const rule = await recurringApi.createRule(payload);
    setRules((prev) => [rule, ...prev]);
    return rule;
  };

  const updateRule = async (id, payload) => {
    const updated = await recurringApi.updateRule(id, payload);
    setRules((prev) => prev.map((r) => (r._id === id ? updated : r)));
    return updated;
  };

  const deleteRule = async (id) => {
    await recurringApi.deleteRule(id);
    setRules((prev) => prev.filter((r) => r._id !== id));
  };

  return { rules, loading, error, createRule, updateRule, deleteRule, refetch: fetchRules };
}
