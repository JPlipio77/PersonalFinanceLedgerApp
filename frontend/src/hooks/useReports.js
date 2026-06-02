import { useState, useEffect } from 'react';
import { getMonthlyReport, getYearlyReport } from '../api/reportsApi';

export default function useReports(view, month, year) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetch = view === 'yearly'
      ? getYearlyReport(year)
      : getMonthlyReport(month, year);

    fetch
      .then((d) => { if (!cancelled) setData(d); })
      .catch((err) => { if (!cancelled) setError(err?.response?.data?.message || 'Failed to load report'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [view, month, year]);

  return { data, loading, error };
}
