import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { useState } from 'react';
import useRecurring from '../hooks/useRecurring';
import { useCategories } from '../hooks/useCategories';

const FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly'];

const emptyRule = {
  type: 'expense', amount: '', description: '', category: '', frequency: 'monthly', startDate: '',
};

export default function SettingsPage() {
  const { user, setUser } = useAuth();
  const [currency, setCurrency]       = useState(user?.currency || 'PHP');
  const [emailAlerts, setEmailAlerts] = useState(user?.emailAlerts ?? true);
  const [saved, setSaved]             = useState(false);
  const [saveError, setSaveError]     = useState(null);

  const { rules, loading: rulesLoading, createRule, updateRule, deleteRule } = useRecurring();
  const { categories } = useCategories();

  const [showModal, setShowModal]     = useState(false);
  const [editing, setEditing]         = useState(null);
  const [form, setForm]               = useState(emptyRule);
  const [formError, setFormError]     = useState(null);
  const [submitting, setSubmitting]   = useState(false);

  const handleSave = async () => {
    setSaveError(null);
    try {
      const res = await axiosInstance.put('/auth/me', { currency, emailAlerts });
      setUser(res.data.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setSaveError(err?.response?.data?.message || 'Failed to save settings');
    }
  };

  const openNew = () => {
    setEditing(null);
    setForm(emptyRule);
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (rule) => {
    setEditing(rule);
    setForm({
      type:        rule.type,
      amount:      rule.amount,
      description: rule.description,
      category:    rule.category?._id || rule.category,
      frequency:   rule.frequency,
      startDate:   rule.startDate ? rule.startDate.slice(0, 10) : '',
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      if (editing) {
        await updateRule(editing._id, form);
      } else {
        await createRule(form);
      }
      setShowModal(false);
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Failed to save rule');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this recurring rule?')) return;
    await deleteRule(id);
  };

  return (
    <div style={styles.page}>
      {/* ── Profile & Preferences ── */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Preferences</h3>

        <div style={styles.field}>
          <label style={styles.label}>Display Name</label>
          <p style={styles.value}>{user?.displayName}</p>
        </div>

        <div style={styles.field}>
          <label style={styles.label} htmlFor="currency">Default Currency</label>
          <select id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} style={styles.input}>
            {['PHP', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'SGD'].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div style={styles.field}>
          <label style={styles.checkLabel}>
            <input type="checkbox" checked={emailAlerts} onChange={(e) => setEmailAlerts(e.target.checked)} />
            {' '}Email budget alerts
          </label>
        </div>

        {saveError && <p style={styles.error}>{saveError}</p>}
        <button onClick={handleSave} style={styles.btn}>
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </section>

      {/* ── Recurring Rules ── */}
      <section style={styles.section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ ...styles.sectionTitle, margin: 0 }}>Recurring Transactions</h3>
          <button onClick={openNew} style={styles.addBtn}>+ Add Rule</button>
        </div>

        {rulesLoading ? (
          <p style={{ color: 'var(--color-text-muted)' }}>Loading…</p>
        ) : rules.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
            No recurring rules yet. Add one to auto-post transactions on a schedule.
          </p>
        ) : (
          <div style={styles.ruleList}>
            {rules.map((rule) => (
              <div key={rule._id} style={styles.ruleRow} data-testid="rule-row">
                <div style={styles.ruleMeta}>
                  <span style={{ marginRight: '0.5rem' }}>
                    {rule.category?.icon}
                  </span>
                  <span style={{ fontWeight: 600 }}>{rule.description}</span>
                  <span style={{ ...styles.badge, background: rule.type === 'income' ? '#dcfce7' : '#fee2e2', color: rule.type === 'income' ? '#15803d' : '#b91c1c' }}>
                    {rule.type}
                  </span>
                  {!rule.isActive && <span style={{ ...styles.badge, background: '#f3f4f6', color: '#6b7280' }}>paused</span>}
                </div>
                <div style={styles.ruleSub}>
                  {rule.amount} {rule.currency} · {rule.frequency} · {rule.category?.name}
                </div>
                <div style={styles.ruleActions}>
                  <button onClick={() => openEdit(rule)} style={styles.linkBtn}>Edit</button>
                  <button onClick={() => handleDelete(rule._id)} style={{ ...styles.linkBtn, color: '#ef4444' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Modal ── */}
      {showModal && (
        <div style={styles.overlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 1rem' }}>{editing ? 'Edit Rule' : 'New Recurring Rule'}</h3>
            <form onSubmit={handleSubmit}>
              <div style={styles.field}>
                <label style={styles.label}>Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={styles.input}>
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Description</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  style={styles.input}
                  placeholder="e.g. Netflix, Rent"
                  required
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Amount</label>
                <input
                  type="number" min="0.01" step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={styles.input} required>
                  <option value="">Select category…</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Frequency</label>
                <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} style={styles.input}>
                  {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Start Date</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  style={styles.input}
                />
              </div>

              {editing && (
                <div style={styles.field}>
                  <label style={styles.checkLabel}>
                    <input
                      type="checkbox"
                      checked={form.isActive ?? true}
                      onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    />
                    {' '}Active
                  </label>
                </div>
              )}

              {formError && <p style={styles.error}>{formError}</p>}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="submit" style={styles.btn} disabled={submitting}>
                  {submitting ? 'Saving…' : editing ? 'Update' : 'Create'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} style={styles.cancelBtn}>
                  Cancel
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
  page:         { maxWidth: 600 },
  section:      { background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '0.5rem', padding: '1.5rem', marginBottom: '1.5rem' },
  sectionTitle: { fontSize: '1rem', fontWeight: 600, color: 'var(--color-text)', marginTop: 0 },
  field:        { marginBottom: '1.1rem' },
  label:        { display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.35rem' },
  value:        { color: 'var(--color-text)' },
  input:        { padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: '0.375rem', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' },
  checkLabel:   { display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' },
  btn:          { background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '0.375rem', padding: '0.6rem 1.5rem', fontWeight: 600, cursor: 'pointer' },
  cancelBtn:    { background: 'none', border: '1px solid var(--color-border)', borderRadius: '0.375rem', padding: '0.6rem 1.5rem', cursor: 'pointer', color: 'var(--color-text)' },
  addBtn:       { background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '0.375rem', padding: '0.45rem 1rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' },
  linkBtn:      { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: '0.85rem', padding: '0.25rem' },
  error:        { color: '#ef4444', fontSize: '0.875rem', marginBottom: '0.5rem' },
  ruleList:     { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  ruleRow:      { background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '0.375rem', padding: '0.9rem 1rem' },
  ruleMeta:     { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' },
  ruleSub:      { fontSize: '0.82rem', color: 'var(--color-text-muted)' },
  ruleActions:  { display: 'flex', gap: '0.5rem', marginTop: '0.5rem' },
  badge:        { fontSize: '0.72rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: '999px' },
  overlay:      { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modal:        { background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '0.5rem', padding: '1.75rem', width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto' },
};
