import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, PieChart, ShieldCheck, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BrandMark } from '../components/Illustrations';

function AuthShell({ title, subtitle, children }) {
  return (
    <div className="auth-page">
      <section className="auth-hero">
        <div className="auth-brand">
          <BrandMark size={40} />
          <div>
            <strong>Personal Expense Analyzer</strong>
            <small>Team Pentagon · Woosong University</small>
          </div>
        </div>
        <div className="auth-hero-copy">
          <h2>Know where every won goes.</h2>
          <p>Track daily spending, set monthly budgets and see clear charts — built for student life.</p>
          <ul>
            <li><Wallet size={18} /> Monthly and category budgets in ₩</li>
            <li><PieChart size={18} /> Charts that update the moment you save</li>
            <li><ShieldCheck size={18} /> Your data is private to your account</li>
          </ul>
        </div>
        <div className="auth-preview" aria-hidden="true">
          <div className="preview-row"><span>Monthly budget</span><strong>₩600,000</strong></div>
          <div className="preview-bar"><div style={{ width: '68.7%' }} /></div>
          <div className="preview-row muted"><span>68.7% used</span><span>₩188,000 left</span></div>
        </div>
      </section>
      <section className="auth-form-side">
        <div className="auth-card">
          <h1>{title}</h1>
          <p className="muted">{subtitle}</p>
          {children}
        </div>
      </section>
    </div>
  );
}

function PasswordInput({ value, onChange, error, autoComplete, placeholder }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className={`input-suffix ${error ? 'has-error' : ''}`}>
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        placeholder={placeholder}
      />
      <button type="button" className="icon-btn" onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}>
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((errs) => ({ ...errs, [field]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!EMAIL_RE.test(form.email.trim())) errs.email = 'Enter a valid email address.';
    if (!form.password) errs.password = 'Enter your password.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    setFormError('');
    try {
      await login(form.email.trim(), form.password);
      navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Log in to see your spending dashboard.">
      <form onSubmit={submit} noValidate className="auth-form">
        {formError && <div className="form-alert">{formError}</div>}
        <label className="field">
          <span>Email</span>
          <input type="email" value={form.email} onChange={set('email')} autoComplete="email"
            placeholder="you@wsu.ac.kr" className={errors.email ? 'has-error' : ''} autoFocus />
          {errors.email && <small className="field-error">{errors.email}</small>}
        </label>
        <label className="field">
          <span>Password</span>
          <PasswordInput value={form.password} onChange={set('password')} error={errors.password}
            autoComplete="current-password" placeholder="Your password" />
          {errors.password && <small className="field-error">{errors.password}</small>}
        </label>
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
        <p className="auth-switch">New here? <Link to="/register">Create an account</Link></p>
      </form>
    </AuthShell>
  );
}

export function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((errs) => ({ ...errs, [field]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (form.full_name.trim().length < 2) errs.full_name = 'Enter your full name.';
    if (!EMAIL_RE.test(form.email.trim())) errs.email = 'Enter a valid email address.';
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password))
      errs.password = 'At least 8 characters with a letter and a number.';
    if (form.confirm !== form.password) errs.confirm = 'Passwords do not match.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    setFormError('');
    try {
      await register({ full_name: form.full_name.trim(), email: form.email.trim(), password: form.password });
      navigate('/dashboard', { replace: true, state: { welcome: true } });
    } catch (err) {
      setErrors(err.fields || {});
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Create your account" subtitle="Start tracking your student budget in under a minute.">
      <form onSubmit={submit} noValidate className="auth-form">
        {formError && <div className="form-alert">{formError}</div>}
        <label className="field">
          <span>Full name</span>
          <input value={form.full_name} onChange={set('full_name')} autoComplete="name"
            placeholder="Kim Minji" className={errors.full_name ? 'has-error' : ''} autoFocus />
          {errors.full_name && <small className="field-error">{errors.full_name}</small>}
        </label>
        <label className="field">
          <span>Email</span>
          <input type="email" value={form.email} onChange={set('email')} autoComplete="email"
            placeholder="you@wsu.ac.kr" className={errors.email ? 'has-error' : ''} />
          {errors.email && <small className="field-error">{errors.email}</small>}
        </label>
        <label className="field">
          <span>Password</span>
          <PasswordInput value={form.password} onChange={set('password')} error={errors.password}
            autoComplete="new-password" placeholder="At least 8 characters" />
          {errors.password
            ? <small className="field-error">{errors.password}</small>
            : <small className="hint">Use 8+ characters with at least one letter and one number.</small>}
        </label>
        <label className="field">
          <span>Confirm password</span>
          <PasswordInput value={form.confirm} onChange={set('confirm')} error={errors.confirm}
            autoComplete="new-password" placeholder="Repeat your password" />
          {errors.confirm && <small className="field-error">{errors.confirm}</small>}
        </label>
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
        <p className="auth-switch">Already registered? <Link to="/login">Log in</Link></p>
      </form>
    </AuthShell>
  );
}
