import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, Legend,
} from 'recharts';
import { formatCurrency } from '../../utils/formatCurrency';

const MONTH_NAMES = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Returns just the currency symbol (e.g. "₱" for PHP, "$" for USD)
const currencySymbol = (currency) =>
  new Intl.NumberFormat('en', { style: 'currency', currency })
    .formatToParts(0)
    .find(p => p.type === 'currency')?.value || currency;

const axisFormatter = (currency) => (v) => {
  const sym = currencySymbol(currency);
  return v >= 1000 ? `${sym}${(v / 1000).toFixed(1)}k` : `${sym}${v}`;
};

export default function SpendingBarChart({ data, currency = 'PHP' }) {
  if (!data?.length) {
    return <EmptyState label="No spending data for this period" />;
  }

  return (
    <div style={styles.wrap} data-testid="spending-bar-chart">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} width={60}
            tickFormatter={axisFormatter(currency)} />
          <Tooltip
            formatter={(v) => [formatCurrency(v, currency), 'Spent']}
            contentStyle={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '0.375rem' }}
          />
          <Bar dataKey="total" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color || '#3b82f6'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Used by the trend chart to show month labels */
export function TrendLineChart({ data, currency = 'PHP' }) {
  if (!data?.length) return <EmptyState label="No trend data" />;

  const formatted = data.map(d => ({
    ...d,
    label: `${MONTH_NAMES[d.month]} ${String(d.year).slice(2)}`,
  }));

  return (
    <div style={styles.wrap} data-testid="trend-line-chart">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={formatted} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} width={60}
            tickFormatter={axisFormatter(currency)} />
          <Tooltip
            formatter={(v, name) => [formatCurrency(v, currency), name.charAt(0).toUpperCase() + name.slice(1)]}
            contentStyle={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '0.375rem' }}
          />
          <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
          <Line type="monotone" dataKey="income"  stroke="#22c55e" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div style={styles.empty}>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>{label}</p>
    </div>
  );
}

const styles = {
  wrap:  { width: '100%' },
  empty: { height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', borderRadius: '0.375rem', border: '1px dashed var(--color-border)' },
};
