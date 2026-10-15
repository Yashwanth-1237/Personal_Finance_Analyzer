import { useState } from 'react';
import { Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import useFetch from '../services/useFetch';
import { cleanAmountInput, formatPercent, formatWon, groupDigits, monthLabel } from '../services/format';
import { useAppData } from '../context/AppDataContext';
import { useToast } from '../context/ToastContext';
import { AlertList, CategoryIcon, EmptyState, ErrorState, ProgressBar, Spinner, StatusPill } from '../components/ui';
import { WalletIllustration } from '../components/Illustrations';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';

function BudgetFormModal({ initial, categories, period, onClose, onSaved }) {
  const toast = useToast();
  const isOverall = initial.kind === 'overall';
  const editing = Boolean(initial.budget_id);
  const [amount, setAmount] = useState(initial.amount ? groupDigits(Math.round(initial.amount)) : '');
  const [categoryId, setCategoryId] = useState(initial.category_id ? String(initial.category_id) : '');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const value = Number(cleanAmountInput(amount));
    const errs = {};
    if (!value) errs.amount = 'Enter an amount greater than ₩0.';
    if (!isOverall && !categoryId) errs.category_id = 'Choose a category.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    try {
      if (editing) await api.updateBudget(initial.budget_id, { amount: value });
      else
        await api.saveBudget({
          ...period,
          amount: value,
          category_id: isOverall ? null : Number(categoryId),
        });
      toast.success('Budget saved.');
      onSaved();
    } catch (err) {
      setErrors({ ...(err.fields || {}), form: err.message });
    } finally {
      setBusy(false);
    }
  };

  const title = isOverall
    ? editing ? 'Edit monthly budget' : 'Set monthly budget'
    : editing ? `Edit ${initial.category_name} budget` : 'Add category budget';

  return (
    <Modal
      title={title}
      subtitle={monthLabel(period.month, period.year)}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" form="budget-form" className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save budget'}
          </button>
        </>
      }
    >
      <form id="budget-form" onSubmit={submit} noValidate>
        {errors.form && <div className="form-alert">{errors.form}</div>}
        {!isOverall && !editing && (
          <label className="field">
            <span>Category</span>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
              className={errors.category_id ? 'has-error' : ''}>
              <option value="">Choose a category…</option>
              {categories.map((c) => (
                <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
              ))}
            </select>
            {errors.category_id && <small className="field-error">{errors.category_id}</small>}
          </label>
        )}
        <label className="field">
          <span>Budget amount</span>
          <div className={`input-prefix ${errors.amount ? 'has-error' : ''}`}>
            <span>₩</span>
            <input inputMode="numeric" value={amount} placeholder={isOverall ? '600,000' : '150,000'}
              onChange={(e) => { setAmount(groupDigits(e.target.value)); setErrors({}); }} autoFocus />
          </div>
          {errors.amount && <small className="field-error">{errors.amount}</small>}
        </label>
      </form>
    </Modal>
  );
}

export default function BudgetsPage() {
  const { period, version, refresh, categories, colorFor } = useAppData();
  const toast = useToast();
  const [dialog, setDialog] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const { data, loading, error, reload } = useFetch(async () => {
    const [budgets, summary] = await Promise.all([api.listBudgets(period), api.summary(period)]);
    return { ...budgets, alerts: summary.alerts };
  }, [period.month, period.year, version]);

  if (loading && !data) return <Spinner label="Loading budgets…" />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;

  const { overall } = data;
  const budgetedIds = new Set(data.categories.map((c) => c.category_id));
  const unbudgeted = categories.filter((c) => !budgetedIds.has(c.category_id));
  const unallocated = overall.amount ? overall.amount - data.allocated_to_categories : null;

  const copyPrevious = async () => {
    try {
      const result = await api.copyPreviousBudgets(period);
      toast.success(result.message);
      refresh();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const confirmDelete = async () => {
    try {
      await api.deleteBudget(toDelete.budget_id);
      toast.success('Budget removed.');
      refresh();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const saved = () => {
    setDialog(null);
    refresh();
  };

  return (
    <div className="page">
      <section className="card budget-hero">
        <div className="card-header">
          <div>
            <h3>Monthly budget · {monthLabel(period.month, period.year)}</h3>
            <p className="muted small">Your overall spending limit for the month.</p>
          </div>
          <div className="btn-row">
            <button className="btn btn-ghost btn-sm" onClick={copyPrevious} title="Copy budgets from the previous month">
              <Copy size={15} /> Copy last month
            </button>
            {overall.budget_id ? (
              <>
                <button className="btn btn-secondary btn-sm"
                  onClick={() => setDialog({ kind: 'overall', budget_id: overall.budget_id, amount: overall.amount })}>
                  <Pencil size={15} /> Edit
                </button>
                <button className="icon-btn danger" aria-label="Remove monthly budget"
                  onClick={() => setToDelete({ budget_id: overall.budget_id, label: 'the monthly budget' })}>
                  <Trash2 size={17} />
                </button>
              </>
            ) : null}
          </div>
        </div>

        {overall.budget_id ? (
          <div className="budget-overview">
            <div className="budget-stats">
              <div><small>Budget</small><strong>{formatWon(overall.amount)}</strong></div>
              <div><small>Spent</small><strong>{formatWon(overall.spent)}</strong></div>
              <div>
                <small>Remaining</small>
                <strong className={overall.remaining < 0 ? 'text-danger' : 'text-success'}>{formatWon(overall.remaining)}</strong>
              </div>
              <div><small>Used</small><strong>{formatPercent(overall.percent_used)}</strong></div>
            </div>
            <ProgressBar percent={overall.percent_used} status={overall.status} />
            {unallocated !== null && data.categories.length > 0 && (
              <p className="muted small">
                {formatWon(data.allocated_to_categories)} assigned to category budgets
                {unallocated >= 0 ? ` · ${formatWon(unallocated)} unassigned` : ` · ${formatWon(-unallocated)} more than the monthly budget`}
              </p>
            )}
          </div>
        ) : (
          <EmptyState illustration={<WalletIllustration size={96} />} title="No monthly budget yet"
            text="Set an overall limit, for example ₩600,000, to track how much you have left."
            action={<button className="btn btn-primary btn-sm" onClick={() => setDialog({ kind: 'overall' })}>
              <Plus size={16} /> Set monthly budget</button>} />
        )}
      </section>

      <section className="card">
        <div className="card-header"><h3>Alerts</h3></div>
        <AlertList alerts={data.alerts} />
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <h3>Category budgets</h3>
            <p className="muted small">Limits for individual categories. You will be warned at 80% and when exceeded.</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setDialog({ kind: 'category' })}
            disabled={!unbudgeted.length}>
            <Plus size={16} /> Add category budget
          </button>
        </div>

        {data.categories.length ? (
          <ul className="budget-list">
            {data.categories.map((c) => (
              <li key={c.category_id} className={`budget-row status-${c.status}`}>
                <CategoryIcon name={c.category_name} color={colorFor(c.category_id)} />
                <div className="budget-row-main">
                  <div className="row-between">
                    <strong>{c.category_name}</strong>
                    <StatusPill status={c.status} percent={c.percent_used} />
                  </div>
                  <ProgressBar percent={c.percent_used} status={c.status} />
                  <div className="row-between small">
                    <span>{formatWon(c.spent)} spent of {formatWon(c.budget)}</span>
                    <span className={c.remaining < 0 ? 'text-danger' : 'muted'}>
                      {c.remaining < 0 ? `Over by ${formatWon(-c.remaining)}` : `${formatWon(c.remaining)} left`}
                    </span>
                  </div>
                </div>
                <div className="txn-actions">
                  <button className="icon-btn" aria-label={`Edit ${c.category_name} budget`}
                    onClick={() => setDialog({ kind: 'category', budget_id: c.budget_id, amount: c.budget,
                      category_id: c.category_id, category_name: c.category_name })}>
                    <Pencil size={16} />
                  </button>
                  <button className="icon-btn danger" aria-label={`Remove ${c.category_name} budget`}
                    onClick={() => setToDelete({ budget_id: c.budget_id, label: `the ${c.category_name} budget` })}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No category budgets for this month. Try adding Food: ₩150,000.</p>
        )}
      </section>

      {dialog && (
        <BudgetFormModal
          initial={dialog}
          categories={unbudgeted}
          period={period}
          onClose={() => setDialog(null)}
          onSaved={saved}
        />
      )}
      {toDelete && (
        <ConfirmDialog
          title="Remove budget?"
          message={`This removes ${toDelete.label} for ${monthLabel(period.month, period.year)}. Your expenses are not affected.`}
          confirmLabel="Remove"
          onConfirm={confirmDelete}
          onClose={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
