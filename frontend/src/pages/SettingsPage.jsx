import { useState } from 'react';
import { Database, FlaskConical, KeyRound, TriangleAlert, UserRound } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';

export default function SettingsPage() {
  const { user, setUser } = useAuth();
  const { refresh } = useAppData();
  const toast = useToast();

  const [name, setName] = useState(user.full_name);
  const [nameError, setNameError] = useState('');
  const [savingName, setSavingName] = useState(false);

  const [pw, setPw] = useState({ current_password: '', new_password: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [savingPw, setSavingPw] = useState(false);

  const [seeding, setSeeding] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetText, setResetText] = useState('');
  const [resetting, setResetting] = useState(false);

  const saveName = async (e) => {
    e.preventDefault();
    if (name.trim().length < 2) return setNameError('Enter your full name (at least 2 characters).');
    setSavingName(true);
    try {
      const data = await api.updateProfile({ full_name: name.trim() });
      setUser(data.user);
      toast.success('Profile updated.');
    } catch (err) {
      setNameError(err.message);
    } finally {
      setSavingName(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!pw.current_password) errs.current_password = 'Enter your current password.';
    if (pw.new_password.length < 8 || !/[A-Za-z]/.test(pw.new_password) || !/\d/.test(pw.new_password))
      errs.new_password = 'At least 8 characters with a letter and a number.';
    if (pw.confirm !== pw.new_password) errs.confirm = 'Passwords do not match.';
    setPwErrors(errs);
    if (Object.keys(errs).length) return;
    setSavingPw(true);
    try {
      await api.changePassword({ current_password: pw.current_password, new_password: pw.new_password });
      setPw({ current_password: '', new_password: '', confirm: '' });
      toast.success('Password changed.');
    } catch (err) {
      setPwErrors(err.fields || { form: err.message });
    } finally {
      setSavingPw(false);
    }
  };

  const seed = async () => {
    setSeeding(true);
    try {
      const data = await api.seedDemo();
      toast.success(data.message);
      refresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSeeding(false);
    }
  };

  const reset = async () => {
    setResetting(true);
    try {
      const data = await api.resetData(resetText);
      toast.success(data.message);
      setResetOpen(false);
      setResetText('');
      refresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setResetting(false);
    }
  };

  const setPwField = (field) => (e) => {
    setPw((p) => ({ ...p, [field]: e.target.value }));
    setPwErrors((errs) => ({ ...errs, [field]: undefined, form: undefined }));
  };

  return (
    <div className="page settings-page">
      <section className="card">
        <div className="card-header"><h3><UserRound size={18} className="inline-icon" /> Profile</h3></div>
        <form onSubmit={saveName} className="settings-form" noValidate>
          <label className="field">
            <span>Full name</span>
            <input value={name} onChange={(e) => { setName(e.target.value); setNameError(''); }}
              className={nameError ? 'has-error' : ''} maxLength={100} />
            {nameError && <small className="field-error">{nameError}</small>}
          </label>
          <label className="field">
            <span>Email</span>
            <input value={user.email} disabled />
            <small className="hint">Email is used to log in and cannot be changed.</small>
          </label>
          <label className="field">
            <span>Currency</span>
            <input value="Korean won (₩)" disabled />
          </label>
          <div>
            <button className="btn btn-primary" disabled={savingName || name.trim() === user.full_name}>
              {savingName ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <div className="card-header"><h3><KeyRound size={18} className="inline-icon" /> Change password</h3></div>
        <form onSubmit={savePassword} className="settings-form" noValidate>
          {pwErrors.form && <div className="form-alert">{pwErrors.form}</div>}
          {[
            ['current_password', 'Current password', 'current-password'],
            ['new_password', 'New password', 'new-password'],
            ['confirm', 'Confirm new password', 'new-password'],
          ].map(([field, label, auto]) => (
            <label className="field" key={field}>
              <span>{label}</span>
              <input type="password" value={pw[field]} onChange={setPwField(field)} autoComplete={auto}
                className={pwErrors[field] ? 'has-error' : ''} />
              {pwErrors[field] && <small className="field-error">{pwErrors[field]}</small>}
            </label>
          ))}
          <div>
            <button className="btn btn-primary" disabled={savingPw}>
              {savingPw ? 'Updating…' : 'Update password'}
            </button>
          </div>
        </form>
      </section>

      <section className="card demo-card">
        <div className="card-header">
          <h3><FlaskConical size={18} className="inline-icon" /> Demo mode</h3>
          <span className="pill pill-warning">Sample data</span>
        </div>
        <p className="muted">
          For presentations: fills an <strong>empty</strong> account with labelled sample expenses for the last
          four months (each note starts with “[Demo]”), plus a ₩600,000 monthly budget and Food, Transportation
          and Entertainment budgets. Real users should add their own data instead.
        </p>
        <button className="btn btn-secondary" onClick={seed} disabled={seeding}>
          <Database size={16} /> {seeding ? 'Loading…' : 'Load demo data'}
        </button>
      </section>

      <section className="card danger-card">
        <div className="card-header"><h3><TriangleAlert size={18} className="inline-icon" /> Danger zone</h3></div>
        <p className="muted">Permanently delete all of your expenses, budgets and custom categories. Your account stays.</p>
        <button className="btn btn-danger" onClick={() => setResetOpen(true)}>Delete all my data</button>
      </section>

      {resetOpen && (
        <Modal
          title="Delete all data?"
          size="sm"
          onClose={() => setResetOpen(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setResetOpen(false)}>Cancel</button>
              <button className="btn btn-danger" disabled={resetText !== 'DELETE' || resetting} onClick={reset}>
                {resetting ? 'Deleting…' : 'Delete everything'}
              </button>
            </>
          }
        >
          <p>This cannot be undone. Type <strong>DELETE</strong> to confirm.</p>
          <input value={resetText} onChange={(e) => setResetText(e.target.value)} placeholder="DELETE" autoFocus />
        </Modal>
      )}
    </div>
  );
}
