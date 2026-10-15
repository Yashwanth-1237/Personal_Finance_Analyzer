import { useState } from 'react';
import Modal from './Modal';
import { api } from '../services/api';
import { cleanAmountInput, groupDigits, todayIso } from '../services/format';
import { iconFor } from '../services/categoryStyle';
import { useToast } from '../context/ToastContext';

export default function ExpenseFormModal({ expense, categories, onClose, onSaved }) {
  const toast = useToast();
  const editing = Boolean(expense?.expense_id);
  const [form, setForm] = useState({
    amount: expense ? groupDigits(Math.round(expense.amount)) : '',
    expense_date: expense?.expense_date || todayIso(),
    category_id: expense?.category_id ? String(expense.category_id) : '',
    note: expense?.note || '',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => {
    const value = field === 'amount' ? groupDigits(e.target.value) : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((errs) => ({ ...errs, [field]: undefined }));
  };

  const validate = () => {
    const errs = {};
    const amount = Number(cleanAmountInput(form.amount));
    if (!amount) errs.amount = 'Enter an amount greater than ₩0.';
    else if (amount > 100_000_000) errs.amount = 'Maximum is ₩100,000,000.';
    if (!form.expense_date) errs.expense_date = 'Choose a date.';
    if (!form.category_id) errs.category_id = 'Choose a category.';
    if (form.note.length > 255) errs.note = 'Maximum 255 characters.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const payload = {
      amount: Number(cleanAmountInput(form.amount)),
      expense_date: form.expense_date,
      category_id: Number(form.category_id),
      note: form.note.trim(),
    };
    setSaving(true);
    setFormError('');
    try {
      if (editing) await api.updateExpense(expense.expense_id, payload);
      else await api.createExpense(payload);
      toast.success(editing ? 'Expense updated.' : 'Expense saved.');
      onSaved();
    } catch (err) {
      setErrors(err.fields || {});
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={editing ? 'Edit expense' : 'Add expense'}
      subtitle={editing ? 'Update the details of this transaction.' : 'Record money you spent.'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" form="expense-form" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Save expense'}
          </button>
        </>
      }
    >
      <form id="expense-form" onSubmit={handleSubmit} noValidate>
        {formError && <div className="form-alert">{formError}</div>}

        <label className="field">
          <span>Amount</span>
          <div className={`input-prefix ${errors.amount ? 'has-error' : ''}`}>
            <span>₩</span>
            <input
              inputMode="numeric"
              placeholder="7,000"
              value={form.amount}
              onChange={set('amount')}
              autoFocus
            />
          </div>
          {errors.amount && <small className="field-error">{errors.amount}</small>}
        </label>

        <div className="field">
          <span>Category</span>
          <div className="category-picker" role="radiogroup" aria-label="Category">
            {categories.map((c) => {
              const Icon = iconFor(c.category_name);
              const selected = form.category_id === String(c.category_id);
              return (
                <button
                  type="button"
                  key={c.category_id}
                  role="radio"
                  aria-checked={selected}
                  className={`category-chip ${selected ? 'selected' : ''}`}
                  onClick={() => set('category_id')({ target: { value: String(c.category_id) } })}
                >
                  <Icon size={16} />
                  {c.category_name}
                </button>
              );
            })}
          </div>
          {errors.category_id && <small className="field-error">{errors.category_id}</small>}
        </div>

        <label className="field">
          <span>Date</span>
          <input
            type="date"
            className={errors.expense_date ? 'has-error' : ''}
            value={form.expense_date}
            onChange={set('expense_date')}
          />
          {errors.expense_date && <small className="field-error">{errors.expense_date}</small>}
        </label>

        <label className="field">
          <span>Description <em className="muted">(optional)</em></span>
          <input
            placeholder="e.g. Lunch at campus cafeteria"
            value={form.note}
            onChange={set('note')}
            maxLength={255}
            className={errors.note ? 'has-error' : ''}
          />
          {errors.note && <small className="field-error">{errors.note}</small>}
        </label>
      </form>
    </Modal>
  );
}
