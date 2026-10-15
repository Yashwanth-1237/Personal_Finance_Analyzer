import { useEffect, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { api } from '../services/api';
import useFetch from '../services/useFetch';
import { formatWon, monthBounds, todayIso } from '../services/format';
import { useAppData } from '../context/AppDataContext';
import { useToast } from '../context/ToastContext';
import { EmptyState, ErrorState, Spinner } from '../components/ui';
import { ReceiptIllustration } from '../components/Illustrations';
import TransactionList from '../components/TransactionList';
import ConfirmDialog from '../components/ConfirmDialog';

function presetRange(preset) {
  const now = new Date();
  if (preset === 'this-month') return monthBounds(now.getMonth() + 1, now.getFullYear());
  if (preset === 'last-month') {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return monthBounds(d.getMonth() + 1, d.getFullYear());
  }
  if (preset === 'last-30') {
    const start = new Date(now);
    start.setDate(start.getDate() - 29);
    const offset = start.getTimezoneOffset() * 60000;
    return { start: new Date(start - offset).toISOString().slice(0, 10), end: todayIso() };
  }
  return { start: '', end: '' };
}

const PRESETS = [
  ['all', 'All time'],
  ['this-month', 'This month'],
  ['last-month', 'Last month'],
  ['last-30', 'Last 30 days'],
];

export default function ExpensesPage() {
  const { categories, version, refresh, openExpenseForm } = useAppData();
  const toast = useToast();
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [preset, setPreset] = useState('all');
  const [range, setRange] = useState({ start: '', end: '' });
  const [toDelete, setToDelete] = useState(null);

  // Wait until the user stops typing before searching
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchText.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  const invalidRange = Boolean(range.start && range.end && range.start > range.end);

  const { data, loading, error, reload } = useFetch(
    () => invalidRange
      ? Promise.resolve(null)
      : api.listExpenses({ search, category_id: categoryId, start_date: range.start, end_date: range.end }),
    [search, categoryId, range.start, range.end, invalidRange, version],
  );

  const choosePreset = (key) => {
    setPreset(key);
    setRange(presetRange(key));
  };

  const setDate = (field) => (e) => {
    setPreset('custom');
    setRange((r) => ({ ...r, [field]: e.target.value }));
  };

  const filtersActive = search || categoryId || range.start || range.end;
  const clearFilters = () => {
    setSearchText('');
    setSearch('');
    setCategoryId('');
    choosePreset('all');
  };

  const confirmDelete = async () => {
    try {
      await api.deleteExpense(toDelete.expense_id);
      toast.success('Expense deleted.');
      refresh();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="page">
      <section className="card filters-card">
        <div className="filters">
          <div className="search-box">
            <Search size={18} />
            <input
              placeholder="Search description or category…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              aria-label="Search transactions"
            />
          </div>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Filter by category">
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
            ))}
          </select>
          <div className="date-range">
            <input type="date" value={range.start} onChange={setDate('start')} aria-label="From date"
              className={invalidRange ? 'has-error' : ''} max={range.end || undefined} />
            <span className="muted">to</span>
            <input type="date" value={range.end} onChange={setDate('end')} aria-label="To date"
              className={invalidRange ? 'has-error' : ''} min={range.start || undefined} />
          </div>
        </div>
        <div className="filter-row-2">
          <div className="segmented" role="group" aria-label="Date presets">
            {PRESETS.map(([key, label]) => (
              <button key={key} className={preset === key ? 'active' : ''} onClick={() => choosePreset(key)}>
                {label}
              </button>
            ))}
          </div>
          {filtersActive && (
            <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
              <X size={15} /> Clear filters
            </button>
          )}
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <h3>Expense history</h3>
          {data && !invalidRange && (
            <span className="muted small">
              {data.count} result{data.count === 1 ? '' : 's'} · Total <strong>{formatWon(data.total)}</strong>
            </span>
          )}
        </div>
        {invalidRange ? (
          <p className="field-error">The “from” date must be on or before the “to” date.</p>
        ) : loading && !data ? (
          <Spinner />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : data.expenses.length ? (
          <TransactionList expenses={data.expenses} onEdit={openExpenseForm} onDelete={setToDelete} />
        ) : filtersActive ? (
          <EmptyState illustration={<ReceiptIllustration size={96} />} title="No matching expenses"
            text="Try a different search or date range."
            action={<button className="btn btn-secondary btn-sm" onClick={clearFilters}>Clear filters</button>} />
        ) : (
          <EmptyState illustration={<ReceiptIllustration size={96} />} title="No expenses yet"
            text="Add your first expense — like a ₩7,000 lunch — to start tracking."
            action={<button className="btn btn-primary btn-sm" onClick={() => openExpenseForm()}>
              <Plus size={16} /> Add expense</button>} />
        )}
      </section>

      {toDelete && (
        <ConfirmDialog
          title="Delete expense?"
          message={`"${toDelete.note || toDelete.category_name}" (${formatWon(toDelete.amount)}) will be permanently removed.`}
          onConfirm={confirmDelete}
          onClose={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
