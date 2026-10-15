import { useState } from 'react';
import { Lock, Plus, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { useAppData } from '../context/AppDataContext';
import { useToast } from '../context/ToastContext';
import { CategoryIcon } from '../components/ui';
import ConfirmDialog from '../components/ConfirmDialog';

export default function CategoriesPage() {
  const { categories, colorFor, refresh } = useAppData();
  const toast = useToast();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const defaults = categories.filter((c) => c.is_default);
  const custom = categories.filter((c) => !c.is_default);

  const add = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError('Enter a category name.');
    if (trimmed.length > 50) return setError('Maximum 50 characters.');
    setBusy(true);
    setError('');
    try {
      await api.createCategory({ category_name: trimmed });
      toast.success(`Category "${trimmed}" added.`);
      setName('');
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    try {
      const result = await api.deleteCategory(toDelete.category_id);
      toast.success(result.moved_expenses
        ? `Category deleted. ${result.moved_expenses} expense(s) moved to Other.`
        : 'Category deleted.');
      refresh();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const renderCard = (c) => (
    <li key={c.category_id} className="category-card">
      <CategoryIcon name={c.category_name} color={colorFor(c.category_id)} size={42} />
      <div>
        <strong>{c.category_name}</strong>
        <small className="muted">{c.expense_count} expense{c.expense_count === 1 ? '' : 's'}</small>
      </div>
      {c.is_default ? (
        <span className="pill pill-neutral" title="Default categories cannot be deleted"><Lock size={12} /> Default</span>
      ) : (
        <button className="icon-btn danger" onClick={() => setToDelete(c)} aria-label={`Delete ${c.category_name}`}>
          <Trash2 size={17} />
        </button>
      )}
    </li>
  );

  return (
    <div className="page">
      <section className="card">
        <div className="card-header">
          <div>
            <h3>Add a custom category</h3>
            <p className="muted small">For spending that doesn’t fit the defaults, e.g. “Gym” or “Gifts”.</p>
          </div>
        </div>
        <form className="inline-form" onSubmit={add} noValidate>
          <input
            value={name}
            onChange={(e) => { setName(e.target.value); setError(''); }}
            placeholder="Category name"
            maxLength={50}
            className={error ? 'has-error' : ''}
            aria-label="New category name"
          />
          <button className="btn btn-primary" disabled={busy}>
            <Plus size={17} /> {busy ? 'Adding…' : 'Add category'}
          </button>
        </form>
        {error && <small className="field-error">{error}</small>}
      </section>

      <section className="card">
        <div className="card-header"><h3>Default categories</h3></div>
        <ul className="category-grid">{defaults.map(renderCard)}</ul>
      </section>

      <section className="card">
        <div className="card-header"><h3>Your categories</h3></div>
        {custom.length ? (
          <ul className="category-grid">{custom.map(renderCard)}</ul>
        ) : (
          <p className="muted">You haven’t added any custom categories yet.</p>
        )}
      </section>

      {toDelete && (
        <ConfirmDialog
          title={`Delete "${toDelete.category_name}"?`}
          message={`Its ${toDelete.expense_count} expense(s) will be moved to "Other" and any budgets for this category will be removed.`}
          onConfirm={confirmDelete}
          onClose={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
