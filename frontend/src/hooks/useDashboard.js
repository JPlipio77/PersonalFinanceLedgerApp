import { useState, useEffect } from 'react';
import * as dashboardApi from '../api/dashboardApi';

export function useDashboard(month, year, trendMonths = 6) {
  const [overview,  setOverview]  = useState(null);
  const [recent,    setRecent]    = useState([]);
  const [byCategory, setByCategory] = useState([]);
  const [trend,     setTrend]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  useEffect(() => {
    const params = {};
    if (month) params.month = month;
    if (year)  params.year  = year;

    setLoading(true);
    Promise.all([
      dashboardApi.getOverview(params),
      dashboardApi.getRecentTransactions({ limit: 10 }),
      dashboardApi.getSpendingByCategory(params),
      dashboardApi.getTrend({ months: trendMonths }),
    ])
      .then(([ov, rec, cat, tr]) => {
        setOverview(ov);
        setRecent(rec);
        setByCategory(cat);
        setTrend(tr);
      })
      .catch(err => setError(err.response?.data?.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, [month, year, trendMonths]);

  return { overview, recent, byCategory, trend, loading, error };
}
