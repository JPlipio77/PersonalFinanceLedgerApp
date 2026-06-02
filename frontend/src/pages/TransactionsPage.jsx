import { useState } from 'react';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { exportTransactions } from '../api/transactionsApi';
import { formatCurrency, formatDate } from '../utils/formatCurrency';
import { useAuth } from '../context/AuthContext';

const EMPTY_FORM = { type: 'expense', amount: '', description: '', category: '', date: '' };

export default function TransactionsPage() {
  const { user } = useAuth();
  const { transactions, pagination, loading, error, create, update, remove, goToPage } = useTransactions();
  const { categories } = useCategories();
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filters, setFilters] = useState({ type: '', category: '', search: '', startDate: '', endDate: '' });

  const openCreate = () => { setForm(EMPTY_FORM); setEditTarget(null); setFormError(''); setShowModal(true); };
  const openEdit = (tx) => {
    setForm({
      type: tx.type,
      amount: tx.amount,
      description: tx.description,
      category: tx.category._id,
      date: tx.date?.slice(0, 10) || '',
    });
    setEditTarget(tx);
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      const payload = { ...form, amount: parseFloat(form.amount) };
      if (editTarget) {
        await update(editTarget._id, payload);
      } else {
        await create(payload);
      }
      setShowModal(false);
    } catch (err) {
      const errors = err.response?.data?.errors;
      setFormError(errors ? errors.map((e) => e.msg).join(', ') : err.response?.data?.message || 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (tx) => {
    if (!window.confirm('Delete this transaction?')) return;
    await remove(tx._id);
  };

  const handleExport = async (fmt) => {
    try {
      const res = await exportTransactions(fmt);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions.${fmt}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Export failed');
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <h2>Transactions</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button style={styles.exportBtn} onClick={() => handleExport('csv')}>⬇ CSV</button>
          <button style={styles.exportBtn} onClick={() => handleExport('xlsx')}>⬇ Excel</button>
          <button style={styles.addBtn} onClick={openCreate}>+ Add</button>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filterRow}>
        <input
          style={styles.filterInput}
          placeholder="Search…"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <select
          style={styles.filterInput}
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
        >
          <option value="">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <select
          style={styles.filterInput}
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
        >
          <option value="">All categories</option>
          {categories.map((c) => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
        </select>
        <input type="date" style={styles.filterInput} value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} />
        <input type="date" style={styles.filterInput} value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} />
      </div>

      {/* List */}
      {loading ? (
        <p style={{ color: 'var(--color-text-muted)' }}>Loading…</p>
      ) : error ? (
        <p style={{ color: 'var(--color-danger)' }}>{error}</p>
      ) : transactions.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)', marginTop: '2rem', textAlign: 'center' }}>
          No transactions yet. Add your first one!
        </p>
      ) : (
        <>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {['Date', 'Description', 'Category', 'Type', 'Amount', ''].map((h) => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx._id} style={styles.tr}>
                    <td style={styles.td}>{formatDate(tx.date)}</td>
                    <td style={styles.td}>{tx.description}</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.catBadge, background: tx.category?.color + '22', color: tx.category?.color }}>
                        {tx.category?.icon} {tx.category?.name}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.typeBadge, background: tx.type === 'income' ? '#22c55e22' : '#ef444422', color: tx.type === 'income' ? '#22c55e' : '#ef4444' }}>
                        {tx.type}
                      </span>
                    </td>
                    <td style={{ ...styles.td, fontWeight: 600, color: tx.type === 'income' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, tx.currency || user?.currency)}
                    </td>
                    <td style={styles.td}>
                      <button style={styles.iconBtn} onClick={() => openEdit(tx)} title="Edit">✏️</button>
                      <button style={styles.iconBtn} onClick={() => handleDelete(tx)} title="Delete">🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div style={styles.pagination}>
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  style={{ ...styles.pageBtn, ...(p === pagination.page ? styles.pageBtnActive : {}) }}
                  onClick={() => goToPage(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={{ marginBottom: '1.25rem' }}>{editTarget ? 'Edit Transaction' : 'New Transaction'}</h3>
            <form onSubmit={handleSubmit}>
              <div style={styles.row}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Type</label>
                  <select style={styles.input} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Amount</label>
                  <input style={styles.input} type="number" min="0.01" step="0.01" value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })} required placeholder="0.00" />
                </div>
              </div>

              <label style={styles.label}>Description</label>
              <input style={styles.input} value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} required placeholder="e.g. Grocery run" />

              <label style={styles.label}>Category</label>
              <select style={styles.input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
                <option value="">Select category…</option>
                {categories.map((c) => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
              </select>

              <label style={styles.label}>Date</label>
              <input style={styles.input} type="date" value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })} />

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
  header:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  addBtn:     { background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '0.375rem', padding: '0.5rem 1rem', fontWeight: 600, cursor: 'pointer' },
  exportBtn:  { background: 'none', border: '1px solid var(--color-border)', borderRadius: '0.375rem', padding: '0.45rem 0.75rem', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '0.85rem' },
  filterRow:  { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' },
  filterInput:{ padding: '0.4rem 0.6rem', border: '1px solid var(--color-border)', borderRadius: '0.375rem', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.85rem' },
  tableWrap:  { overflowX: 'auto' },
  table:      { width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' },
  th:         { textAlign: 'left', padding: '0.6rem 0.75rem', borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', fontWeight: 600, whiteSpace: 'nowrap' },
  tr:         { borderBottom: '1px solid var(--color-border)' },
  td:         { padding: '0.65rem 0.75rem', color: 'var(--color-text)', verticalAlign: 'middle' },
  catBadge:   { display: 'inline-flex', alignItems: 'center', gap: '0.25rem', borderRadius: '999px', padding: '0.15rem 0.6rem', fontSize: '0.8rem', fontWeight: 500 },
  typeBadge:  { display: 'inline-block', borderRadius: '999px', padding: '0.1rem 0.6rem', fontSize: '0.8rem', fontWeight: 500 },
  iconBtn:    { background: 'none', border: 'none', cursor: 'pointer', padding: '0.15rem 0.2rem', fontSize: '0.9rem' },
  pagination: { display: 'flex', gap: '0.4rem', justifyContent: 'center', marginTop: '1.25rem' },
  pageBtn:    { padding: '0.3rem 0.6rem', border: '1px solid var(--color-border)', borderRadius: '0.25rem', cursor: 'pointer', background: 'none', color: 'var(--color-text)' },
  pageBtnActive: { background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' },
  overlay:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modal:      { background: 'var(--color-bg-card)', borderRadius: '0.5rem', padding: '1.5rem', width: '460px', maxWidth: '95vw' },
  row:        { display: 'flex', gap: '0.75rem' },
  label:      { display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.3rem', marginTop: '1rem' },
  input:      { width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: '0.375rem', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem' },
  cancelBtn:  { background: 'none', border: '1px solid var(--color-border)', borderRadius: '0.375rem', padding: '0.5rem 1rem', cursor: 'pointer', color: 'var(--color-text)' },
  saveBtn:    { background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '0.375rem', padding: '0.5rem 1.25rem', fontWeight: 600, cursor: 'pointer' },
};
