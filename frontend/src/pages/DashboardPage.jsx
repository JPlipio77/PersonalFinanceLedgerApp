import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDashboard } from '../hooks/useDashboard';
import { useAuth } from '../context/AuthContext';
import SpendingBarChart, { TrendLineChart } from '../components/charts/SpendingBarChart';
import BudgetDonutChart from '../components/charts/BudgetDonutChart';
import { formatCurrency, formatDate } from '../utils/formatCurrency';
import Spinner from '../components/common/Spinner';

const MONTHS = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function OverviewCard({ label, value, sub, color }) {
  return (
    <div style={styles.card}>
      <p style={styles.cardLabel}>{label}</p>
      <p style={{ ...styles.cardValue, color: color || 'var(--color-text)' }}>{value}</p>
      {sub && <p style={styles.cardSub}>{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const now = new Date();
  const [month] = useState(now.getMonth() + 1);
  const [year]  = useState(now.getFullYear());
  const { overview, recent, byCategory, trend, loading, error } = useDashboard(month, year);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
        <Spinner />
      </div>
    );
  }

  if (error) {
    return <p style={{ color: 'var(--color-danger)' }}>{error}</p>;
  }

  const currency = user?.currency || 'PHP';

  return (
    <div>
      <div style={styles.pageHeader}>
        <div>
          <h2 style={styles.greeting}>Good {timeOfDay()}, {user?.displayName?.split(' ')[0]}!</h2>
          <p style={styles.period}>{MONTHS[month]} {year} overview</p>
        </div>
      </div>

      {/* ── Overview Cards ─────────────────────────────────── */}
      <div style={styles.cardGrid}>
        <OverviewCard
          label="Total Income"
          value={formatCurrency(overview?.income || 0, currency)}
          color="var(--color-success)"
        />
        <OverviewCard
          label="Total Expenses"
          value={formatCurrency(overview?.expense || 0, currency)}
          color="var(--color-danger)"
        />
        <OverviewCard
          label="Net Balance"
          value={formatCurrency(overview?.net || 0, currency)}
          color={(overview?.net || 0) >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}
          sub={`${overview?.transactionCount || 0} transactions`}
        />
        <OverviewCard
          label="Budget Adherence"
          value={`${Math.round((overview?.adherenceRate ?? 1) * 100)}%`}
          color={(overview?.adherenceRate ?? 1) >= 0.8 ? 'var(--color-success)' : 'var(--color-warning)'}
          sub={`${overview?.budgetCount || 0} budgets set`}
        />
      </div>

      {/* ── Charts row ─────────────────────────────────────── */}
      <div style={styles.chartsRow}>
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Spending by Category</h3>
          <SpendingBarChart data={byCategory} currency={currency} />
        </div>
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Budget vs Spent</h3>
          <BudgetDonutChart budgets={overview?.budgetCount ? byCategory.map(c => ({
            category: { name: c.name, color: c.color },
            spent: c.total,
            limitAmount: c.total + 50, // approximate — full data on BudgetsPage
          })) : []} />
        </div>
      </div>

      {/* ── Trend chart ────────────────────────────────────── */}
      <div style={{ ...styles.chartCard, marginBottom: '1.5rem' }}>
        <h3 style={styles.chartTitle}>Income vs Expenses — last 6 months</h3>
        <TrendLineChart data={trend} currency={currency} />
      </div>

      {/* ── Recent transactions ────────────────────────────── */}
      <div style={styles.recentCard}>
        <div style={styles.recentHeader}>
          <h3 style={styles.chartTitle}>Recent Transactions</h3>
          <Link to="/transactions" style={styles.viewAll}>View all →</Link>
        </div>
        {recent.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', padding: '1rem 0' }}>
            No transactions yet. <Link to="/transactions" style={{ color: 'var(--color-primary)' }}>Add your first one</Link>.
          </p>
        ) : (
          <table style={styles.table}>
            <tbody>
              {recent.map(tx => (
                <tr key={tx._id} style={styles.row}>
                  <td style={styles.iconCell}>
                    <span style={{ ...styles.catDot, background: tx.category?.color + '33', color: tx.category?.color }}>
                      {tx.category?.icon}
                    </span>
                  </td>
                  <td style={styles.descCell}>
                    <p style={styles.desc}>{tx.description}</p>
                    <p style={styles.descSub}>{tx.category?.name} · {formatDate(tx.date)}</p>
                  </td>
                  <td style={{ ...styles.amountCell, color: tx.type === 'income' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, tx.currency || currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function timeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

const styles = {
  pageHeader:  { marginBottom: '1.5rem' },
  greeting:    { fontSize: '1.4rem', fontWeight: 700 },
  period:      { color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' },
  cardGrid:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' },
  card:        { background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '0.5rem', padding: '1rem 1.25rem' },
  cardLabel:   { fontSize: '0.78rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' },
  cardValue:   { fontSize: '1.5rem', fontWeight: 700 },
  cardSub:     { fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' },
  chartsRow:   { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' },
  chartCard:   { background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '0.5rem', padding: '1rem 1.25rem' },
  chartTitle:  { fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.75rem' },
  recentCard:  { background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '0.5rem', padding: '1rem 1.25rem' },
  recentHeader:{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' },
  viewAll:     { fontSize: '0.8rem', color: 'var(--color-primary)' },
  table:       { width: '100%', borderCollapse: 'collapse' },
  row:         { borderBottom: '1px solid var(--color-border)' },
  iconCell:    { padding: '0.6rem 0', width: 36 },
  catDot:      { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', fontSize: '1rem' },
  descCell:    { padding: '0.6rem 0.75rem' },
  desc:        { fontSize: '0.875rem', color: 'var(--color-text)' },
  descSub:     { fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' },
  amountCell:  { padding: '0.6rem 0', textAlign: 'right', fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap' },
};
