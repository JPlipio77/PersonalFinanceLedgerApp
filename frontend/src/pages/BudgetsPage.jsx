import { useState } from 'react';
import { useBudgets } from '../hooks/useBudgets';
import { useCategories } from '../hooks/useCategories';
import { formatCurrency } from '../utils/formatCurrency';

const now = new Date();
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function ProgressBar({ percent, threshold }) {
  const pct    = Math.min(1, percent) * 100;
  const isWarn = percent >= threshold;
  const color  = percent >= 1 ? 'var(--color-danger)' : isWarn ? 'var(--color-warning)' : 'var(--color-success)';
  return (
    <div style={{ background: 'var(--color-border)', borderRadius: '999px', height: 8, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '999px', transition: 'width 0.3s' }} />
    </div>
  );
}

function BudgetCard({ budget, onEdit, onDelete }) {
  const { category, limitAmount, spent, remaining, percentUsed, alertThreshold, currency } = budget;
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <span style={{ fontSize: '1.4rem' }}>{category.icon}</span>
        <div style={{ flex: 1 }}>
          <p style={styles.catName}>{category.name}</p>
          <p style={styles.catSub}>
            {formatCurrency(spent, currency)} of {formatCurrency(limitAmount, currency)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button style={styles.iconBtn} onClick={() => onEdit(budget)} title="Edit">✏️</button>
          <button style={styles.iconBtn} onClick={() => onDelete(budget._id)} title="Delete">🗑️</button>
        </div>
      </div>
      <ProgressBar percent={percentUsed} threshold={alertThreshold} />
      <div style={styles.cardFooter}>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
          {Math.round(percentUsed * 100)}% used
        </span>
        <span style={{ fontSize: '0.8rem', color: remaining === 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
          {formatCurrency(remaining, currency)} left
        </span>
      </div>
      {percentUsed >= alertThreshold && (
        <p style={styles.alertBanner}>⚠️ Alert threshold reached ({Math.round(alertThreshold * 100)}%)</p>
      )}
    </div>
  );
}

const EMPTY_FORM = { category: '', limitAmount: '', alertThreshold: '0.8', month: now.getMonth() + 1, year: now.getFullYear() };

export default function BudgetsPage() {
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());
  const { budgets, summary, loading, error, upsert, update, remove } = useBudgets(month, year);
  const { categories } = useCategories();
  const [showModal,  setShowModal]  = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [formError,  setFormError]  = useState('');
  const [submitting, setSubmitting] = useState(false);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, month, year });
    setEditTarget(null); setFormError(''); setShowModal(true);
  };
  const openEdit = (b) => {
    setForm({ category: b.category._id, limitAmount: b.limitAmount, alertThreshold: b.alertThreshold, month: b.month, year: b.year });
    setEditTarget(b); setFormError(''); setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true); setFormError('');
    try {
      const payload = { ...form, limitAmount: parseFloat(form.limitAmount), alertThreshold: parseFloat(form.alertThreshold) };
      if (editTarget) {
        await update(editTarget._id, { limitAmount: payload.limitAmount, alertThreshold: payload.alertThreshold });
      } else {
        await upsert(payload);
      }
      setShowModal(false);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Error saving budget');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this budget?')) return;
    await remove(id);
  };

  const availableCategories = categories.filter(
    (c) => !budgets.some((b) => b.category._id === c._id)
  );

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <h2>Budgets</h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select style={styles.select} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select style={styles.select} value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button style={styles.addBtn} onClick={openCreate}>+ Set Budget</button>
        </div>
      </div>

      {/* Summary banner */}
      {summary && (
        <div style={styles.summaryBanner}>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>Total Budget</span>
            <span style={styles.summaryValue}>{formatCurrency(summary.totalLimit)}</span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>Total Spent</span>
            <span style={{ ...styles.summaryValue, color: 'var(--color-danger)' }}>{formatCurrency(summary.totalSpent)}</span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryLabel}>Remaining</span>
            <span style={{ ...styles.summaryValue, color: 'var(--color-success)' }}>{formatCurrency(summary.totalRemaining)}</span>
          </div>
        </div>
      )}

      {/* Budget cards */}
      {loading ? (
        <p style={{ color: 'var(--color-text-muted)' }}>Loading…</p>
      ) : error ? (
        <p style={{ color: 'var(--color-danger)' }}>{error}</p>
      ) : budgets.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)', marginTop: '2rem', textAlign: 'center' }}>
          No budgets set for {MONTHS[month - 1]} {year}. Click &quot;+ Set Budget&quot; to add one.
        </p>
      ) : (
        <div style={styles.grid}>
          {budgets.map((b) => (
            <BudgetCard key={b._id} budget={b} onEdit={openEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={{ marginBottom: '1.25rem' }}>{editTarget ? 'Edit Budget' : 'Set Budget'}</h3>
            <form onSubmit={handleSubmit}>
              {!editTarget && (
                <>
                  <label style={styles.label}>Category</label>
                  <select style={styles.input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
                    <option value="">Select category…</option>
                    {availableCategories.map((c) => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
                  </select>
                </>
              )}

              <label style={styles.label}>Monthly Limit</label>
              <input style={styles.input} type="number" min="0.01" step="0.01" value={form.limitAmount}
                onChange={(e) => setForm({ ...form, limitAmount: e.target.value })} required placeholder="e.g. 500" />

              <label style={styles.label}>Alert Threshold ({Math.round(parseFloat(form.alertThreshold || 0.8) * 100)}%)</label>
              <input style={styles.input} type="range" min="0.1" max="1.0" step="0.05" value={form.alertThreshold}
                onChange={(e) => setForm({ ...form, alertThreshold: e.target.value })} />
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                Alert fires when spending reaches {Math.round(parseFloat(form.alertThreshold || 0.8) * 100)}% of the limit.
              </p>

              {formError && <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginTop: '0.5rem' }}>{formError}</p>}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="button" style={styles.cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" style={styles.saveBtn} disabled={submitting}>
                  {submitting ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  header:       { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' },
  addBtn:       { background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '0.375rem', padding: '0.5rem 1rem', fontWeight: 600, cursor: 'pointer' },
  select:       { padding: '0.4rem 0.6rem', border: '1px solid var(--color-border)', borderRadius: '0.375rem', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.875rem' },
  summaryBanner:{ display: 'flex', gap: '1rem', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '0.5rem', padding: '1rem 1.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' },
  summaryItem:  { display: 'flex', flexDirection: 'column', gap: '0.15rem' },
  summaryLabel: { fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  summaryValue: { fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)' },
  grid:         { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' },
  card:         { background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '0.5rem', padding: '1rem' },
  cardHeader:   { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' },
  catName:      { fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text)' },
  catSub:       { fontSize: '0.8rem', color: 'var(--color-text-muted)' },
  cardFooter:   { display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem' },
  alertBanner:  { marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--color-warning)', background: 'rgba(245,158,11,0.1)', borderRadius: '0.25rem', padding: '0.3rem 0.5rem' },
  iconBtn:      { background: 'none', border: 'none', cursor: 'pointer', padding: '0.1rem', fontSize: '0.85rem' },
  overlay:      { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modal:        { background: 'var(--color-bg-card)', borderRadius: '0.5rem', padding: '1.5rem', width: '420px', maxWidth: '95vw' },
  label:        { display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.3rem', marginTop: '1rem' },
  input:        { width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: '0.375rem', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem' },
  cancelBtn:    { background: 'none', border: '1px solid var(--color-border)', borderRadius: '0.375rem', padding: '0.5rem 1rem', cursor: 'pointer', color: 'var(--color-text)' },
  saveBtn:      { background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '0.375rem', padding: '0.5rem 1.25rem', fontWeight: 600, cursor: 'pointer' },
};
