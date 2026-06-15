import { useState } from 'react';
import { useCategories } from '../hooks/useCategories';

const PRESET_COLORS = ['#f59e0b','#3b82f6','#8b5cf6','#ef4444','#22c55e','#06b6d4','#ec4899','#f97316','#6b7280'];
const PRESET_ICONS  = ['🍔','💡','🚗','🎮','🏥','📚','✈️','🛍️','🎬','💰','📈','🏠','🔄','📦','⭐','🎯','💼','🎵'];

const initialForm = { name: '', icon: '📁', color: '#6b7280' };

export default function CategoriesPage() {
  const { categories, loading, error, create, update, remove } = useCategories();
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const systemCats  = categories.filter((c) => c.isSystem);
  const customCats  = categories.filter((c) => !c.isSystem);

  const openCreate = () => { setForm(initialForm); setEditTarget(null); setFormError(''); setShowModal(true); };
  const openEdit   = (cat) => { setForm({ name: cat.name, icon: cat.icon, color: cat.color }); setEditTarget(cat); setFormError(''); setShowModal(true); };
  const closeModal = () => setShowModal(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      if (editTarget) {
        await update(editTarget._id, form);
      } else {
        await create(form);
      }
      closeModal();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Error saving category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (cat) => {
    if (!window.confirm(`Delete "${cat.name}"?`)) return;
    try {
      await remove(cat._id);
    } catch (err) {
      alert(err.response?.data?.message || 'Cannot delete category');
    }
  };

  if (loading) return <p style={{ color: 'var(--color-text-muted)' }}>Loading categories…</p>;
  if (error)   return <p style={{ color: 'var(--color-danger)' }}>{error}</p>;

  return (
    <div>
      <div style={styles.header}>
        <h2>Categories</h2>
        <button style={styles.addBtn} onClick={openCreate}>+ New Category</button>
      </div>

      <section style={{ marginBottom: '2rem' }}>
        <h3 style={styles.sectionTitle}>System Categories</h3>
        <div style={styles.grid}>
          {systemCats.map((cat) => (
            <div key={cat._id} style={{ ...styles.chip, borderLeft: `4px solid ${cat.color}` }}>
              <span>{cat.icon}</span>
              <span style={styles.catName}>{cat.name}</span>
              <span style={styles.systemBadge}>system</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 style={styles.sectionTitle}>My Categories {customCats.length > 0 && `(${customCats.length})`}</h3>
        {customCats.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>No custom categories yet. Create one!</p>
        ) : (
          <div style={styles.grid}>
            {customCats.map((cat) => (
              <div key={cat._id} style={{ ...styles.chip, borderLeft: `4px solid ${cat.color}` }}>
                <span>{cat.icon}</span>
                <span style={styles.catName}>{cat.name}</span>
                <button style={styles.iconAction} onClick={() => openEdit(cat)} title="Edit">✏️</button>
                <button style={styles.iconAction} onClick={() => handleDelete(cat)} title="Delete">🗑️</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {showModal && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={{ marginBottom: '1.25rem' }}>{editTarget ? 'Edit Category' : 'New Category'}</h3>
            <form onSubmit={handleSubmit}>
              <label style={styles.label}>Name</label>
              <input
                style={styles.input}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Gym, Side Projects…"
                required
              />

              <label style={styles.label}>Icon</label>
              <div style={styles.iconGrid}>
                {PRESET_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setForm({ ...form, icon })}
                    style={{ ...styles.iconPick, ...(form.icon === icon ? styles.iconPickSelected : {}) }}
                  >
                    {icon}
                  </button>
                ))}
              </div>

              <label style={styles.label}>Colour</label>
              <div style={styles.colorRow}>
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    style={{ ...styles.colorSwatch, background: c, ...(form.color === c ? styles.colorSwatchSelected : {}) }}
                  />
                ))}
                <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} style={styles.colorInput} />
              </div>

              {formError && <p style={styles.err}>{formError}</p>}

              <div style={styles.modalActions}>
                <button type="button" style={styles.cancelBtn} onClick={closeModal}>Cancel</button>
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
  header:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  addBtn:   { background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '0.375rem', padding: '0.5rem 1rem', fontWeight: 600, cursor: 'pointer' },
  sectionTitle: { fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' },
  grid:     { display: 'flex', flexWrap: 'wrap', gap: '0.5rem' },
  chip:     { display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '0.375rem', padding: '0.4rem 0.75rem', fontSize: '0.875rem' },
  catName:  { color: 'var(--color-text)' },
  systemBadge: { fontSize: '0.7rem', background: 'var(--color-border)', color: 'var(--color-text-muted)', borderRadius: '999px', padding: '0.1rem 0.4rem' },
  iconAction: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', padding: '0 0.15rem' },
  overlay:  { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modal:    { background: 'var(--color-bg-card)', borderRadius: '0.5rem', padding: '1.5rem', width: '420px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' },
  label:    { display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.35rem', marginTop: '1rem' },
  input:    { width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: '0.375rem', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.9rem' },
  iconGrid: { display: 'flex', flexWrap: 'wrap', gap: '0.4rem' },
  iconPick: { background: 'var(--color-bg)', border: '2px solid transparent', borderRadius: '0.375rem', padding: '0.3rem 0.5rem', cursor: 'pointer', fontSize: '1.1rem' },
  iconPickSelected: { borderColor: 'var(--color-primary)' },
  colorRow: { display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' },
  colorSwatch: { width: 26, height: 26, borderRadius: '50%', border: '2px solid transparent', cursor: 'pointer' },
  colorSwatchSelected: { border: '2px solid white', outline: '2px solid var(--color-primary)' },
  colorInput: { width: 32, height: 32, padding: 0, border: 'none', background: 'none', cursor: 'pointer' },
  err:      { color: 'var(--color-danger)', fontSize: '0.85rem', marginTop: '0.5rem' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' },
  cancelBtn: { background: 'none', border: '1px solid var(--color-border)', borderRadius: '0.375rem', padding: '0.5rem 1rem', cursor: 'pointer', color: 'var(--color-text)' },
  saveBtn:   { background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '0.375rem', padding: '0.5rem 1.25rem', fontWeight: 600, cursor: 'pointer' },
};
