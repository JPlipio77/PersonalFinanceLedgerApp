import { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import useReports from '../hooks/useReports';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatCurrency';
import Spinner from '../components/common/Spinner';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function ReportsPage() {
  const { user } = useAuth();
  const now = new Date();
  const [view, setView]   = useState('monthly');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear]   = useState(now.getFullYear());

  const { data, loading, error } = useReports(view, month, year);

  const currency = user?.currency || 'PHP';
  const fmt = (n) => formatCurrency(n, currency);

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h2 style={{ margin: 0 }}>Reports</h2>
        <div style={styles.controls}>
          <div style={styles.tabs}>
            <button
              onClick={() => setView('monthly')}
              style={view === 'monthly' ? styles.tabActive : styles.tab}
            >Monthly</button>
            <button
              onClick={() => setView('yearly')}
              style={view === 'yearly' ? styles.tabActive : styles.tab}
            >Yearly</button>
          </div>

          {view === 'monthly' && (
            <select value={month} onChange={(e) => setMonth(+e.target.value)} style={styles.select}>
              {MONTH_NAMES.map((name, i) => (
                <option key={name} value={i + 1}>{name}</option>
              ))}
            </select>
          )}

          <select value={year} onChange={(e) => setYear(+e.target.value)} style={styles.select}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loading && <Spinner />}
      {error   && <p style={styles.error}>{error}</p>}

      {data && !loading && (
        view === 'monthly' ? (
          <MonthlyView data={data} fmt={fmt} />
        ) : (
          <YearlyView data={data} fmt={fmt} currency={currency} />
        )
      )}
    </div>
  );
}

function MonthlyView({ data, fmt }) {
  const { income, expense, net, transactionCount, byCategory, budgets } = data;

  return (
    <div>
      <div style={styles.cards} data-testid="monthly-overview">
        <StatCard label="Income"       value={fmt(income)}  accent="#22c55e" />
        <StatCard label="Expenses"     value={fmt(expense)} accent="#ef4444" />
        <StatCard label="Net"          value={fmt(net)}     accent={net >= 0 ? '#22c55e' : '#ef4444'} />
        <StatCard label="Transactions" value={transactionCount} accent="#6366f1" />
      </div>

      {byCategory.length > 0 && (
        <div style={styles.section} data-testid="category-breakdown">
          <h3 style={styles.sectionTitle}>Spending by Category</h3>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {['Category', 'Transactions', 'Total Spent'].map((h) => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {byCategory.map((c) => (
                  <tr key={c.categoryId}>
                    <td style={styles.td}>
                      <span style={{ marginRight: '0.5rem' }}>{c.icon}</span>{c.name}
                    </td>
                    <td style={styles.td}>{c.count}</td>
                    <td style={styles.td}>{fmt(c.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {budgets.length > 0 && (
        <div style={styles.section} data-testid="budget-status">
          <h3 style={styles.sectionTitle}>Budget Status</h3>
          {budgets.map((b) => (
            <BudgetBar key={b._id} budget={b} fmt={fmt} />
          ))}
        </div>
      )}
    </div>
  );
}

function YearlyView({ data, fmt, currency }) {
  const { totalIncome, totalExpense, net, months, byCategory } = data;

  const chartData = months.map((m) => ({
    month: MONTH_NAMES[m.month - 1],
    Income:  parseFloat(m.income.toFixed(2)),
    Expense: parseFloat(m.expense.toFixed(2)),
  }));

  return (
    <div>
      <div style={styles.cards} data-testid="yearly-overview">
        <StatCard label="Total Income"  value={fmt(totalIncome)}  accent="#22c55e" />
        <StatCard label="Total Expense" value={fmt(totalExpense)} accent="#ef4444" />
        <StatCard label="Net"           value={fmt(net)}          accent={net >= 0 ? '#22c55e' : '#ef4444'} />
      </div>

      <div style={styles.section} data-testid="yearly-trend-chart">
        <h3 style={styles.sectionTitle}>Monthly Breakdown</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => formatCurrency(v, currency)} />
            <Legend />
            <Bar dataKey="Income"  fill="#22c55e" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Expense" fill="#ef4444" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {byCategory.length > 0 && (
        <div style={styles.section} data-testid="yearly-category-chart">
          <h3 style={styles.sectionTitle}>Top Spending Categories</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={byCategory.slice(0, 8).map((c) => ({ name: `${c.icon} ${c.name}`, Total: parseFloat(c.total.toFixed(2)) }))}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
              <Tooltip formatter={(v) => formatCurrency(v, currency)} />
              <Bar dataKey="Total" fill="#6366f1" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div style={styles.card}>
      <p style={{ ...styles.cardLabel, color: accent }}>{label}</p>
      <p style={styles.cardValue}>{value}</p>
    </div>
  );
}

function BudgetBar({ budget, fmt }) {
  const pct = Math.min(100, budget.percentUsed || 0);
  const color = pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#22c55e';
  return (
    <div style={styles.budgetRow}>
      <div style={styles.budgetMeta}>
        <span>{budget.category?.icon} {budget.category?.name || 'Unknown'}</span>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
          {fmt(budget.spent)} / {fmt(budget.limitAmount)} ({pct}%)
        </span>
      </div>
      <div style={styles.progressTrack}>
        <div style={{ ...styles.progressFill, width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

const styles = {
  page:          { padding: '0 0.25rem' },
  header:        { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' },
  controls:      { display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' },
  tabs:          { display: 'flex', border: '1px solid var(--color-border)', borderRadius: '0.375rem', overflow: 'hidden' },
  tab:           { padding: '0.4rem 1rem', border: 'none', background: 'var(--color-bg)', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.875rem' },
  tabActive:     { padding: '0.4rem 1rem', border: 'none', background: 'var(--color-primary)', color: '#fff', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 },
  select:        { padding: '0.4rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: '0.375rem', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.875rem' },
  cards:         { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' },
  card:          { background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '0.5rem', padding: '1.25rem' },
  cardLabel:     { fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.4rem' },
  cardValue:     { fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 },
  section:       { background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '0.5rem', padding: '1.25rem', marginBottom: '1.5rem' },
  sectionTitle:  { margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600, color: 'var(--color-text)' },
  tableWrap:     { overflowX: 'auto' },
  table:         { width: '100%', borderCollapse: 'collapse' },
  th:            { textAlign: 'left', padding: '0.6rem 0.75rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)' },
  td:            { padding: '0.7rem 0.75rem', fontSize: '0.9rem', color: 'var(--color-text)', borderBottom: '1px solid var(--color-border)' },
  budgetRow:     { marginBottom: '0.75rem' },
  budgetMeta:    { display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.875rem' },
  progressTrack: { height: 8, background: 'var(--color-border)', borderRadius: 4, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: 4, transition: 'width 0.3s ease' },
  error:         { color: 'var(--color-danger)', marginTop: '1rem' },
};
