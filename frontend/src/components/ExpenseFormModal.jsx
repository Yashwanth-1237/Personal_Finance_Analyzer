import { useEffect, useRef, useState } from 'react';
import { Camera, FileImage, ScanLine, X } from 'lucide-react';
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
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const scanRequestId = useRef(0);

  useEffect(() => {
    if (!receiptFile) {
      setReceiptPreview('');
      return undefined;
    }
    const previewUrl = URL.createObjectURL(receiptFile);
    setReceiptPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [receiptFile]);

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

  const chooseReceipt = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setScanMessage('Choose a JPEG, PNG, or WebP receipt image.');
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setScanMessage('Receipt images must be no larger than 6 MB.');
      return;
    }

    const requestId = ++scanRequestId.current;
    const formAtScanStart = form;
    setReceiptFile(file);
    setScanMessage('Scanning receipt…');
    setScanning(true);
    try {
      const { suggestions } = await api.scanReceipt(file);
      if (requestId !== scanRequestId.current) return;
      setForm((current) => ({
        ...current,
        ...(suggestions.amount && current.amount === formAtScanStart.amount
          ? { amount: groupDigits(suggestions.amount) }
          : {}),
        ...(suggestions.expense_date && current.expense_date === formAtScanStart.expense_date
          ? { expense_date: suggestions.expense_date }
          : {}),
      }));
      setScanMessage(suggestions.amount || suggestions.expense_date
        ? 'Receipt scanned. Check the suggested amount and date before saving.'
        : 'No amount or date found. You can enter them manually.');
    } catch (err) {
      if (requestId === scanRequestId.current) setScanMessage(err.message);
    } finally {
      if (requestId === scanRequestId.current) setScanning(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (scanning) return;
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const values = {
      amount: Number(cleanAmountInput(form.amount)),
      expense_date: form.expense_date,
      category_id: Number(form.category_id),
      note: form.note.trim(),
    };
    let payload = values;
    if (receiptFile) {
      payload = new FormData();
      Object.entries(values).forEach(([key, value]) => payload.append(key, value));
      payload.append('receipt', receiptFile);
    }
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
          <button type="submit" form="expense-form" className="btn btn-primary" disabled={saving || scanning}>
            {scanning ? 'Scanning receipt…' : saving ? 'Saving…' : editing ? 'Save changes' : 'Save expense'}
          </button>
        </>
      }
    >
      <form id="expense-form" onSubmit={handleSubmit} noValidate>
        {formError && <div className="form-alert">{formError}</div>}
        <div className="field receipt-field">
          <span>Receipt photo <em className="muted">(optional)</em></span>
          <div className="receipt-buttons">
            <label className="btn btn-secondary btn-sm">
              <Camera size={16} /> Take photo
              <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment"
                onChange={chooseReceipt} hidden />
            </label>
            <label className="btn btn-secondary btn-sm">
              <FileImage size={16} /> Upload image
              <input type="file" accept="image/jpeg,image/png,image/webp"
                onChange={chooseReceipt} hidden />
            </label>
          </div>
          {receiptPreview ? (
            <div className="receipt-preview">
              <img src={receiptPreview} alt="Selected receipt preview" />
              <button type="button" className="icon-btn" onClick={() => {
                scanRequestId.current += 1;
                setReceiptFile(null);
                setScanning(false);
                setScanMessage('');
              }} aria-label="Remove selected receipt">
                <X size={16} />
              </button>
            </div>
          ) : editing && expense?.receipt_url ? (
            <a href={expense.receipt_url} target="_blank" rel="noreferrer">View saved receipt</a>
          ) : null}
          {scanning && <small className="hint"><ScanLine size={14} /> Reading amount and date…</small>}
          {scanMessage && !scanning && <small className="hint">{scanMessage}</small>}
        </div>

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
