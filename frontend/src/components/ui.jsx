// Small presentational building blocks used across pages.
import { AlertTriangle, CheckCircle2, OctagonAlert, RefreshCw } from 'lucide-react';
import { iconFor } from '../services/categoryStyle';
import { formatPercent } from '../services/format';

export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="loading-state" role="status">
      <span className="spinner" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="error-state" role="alert">
      <OctagonAlert size={22} />
      <div>
        <strong>Could not load data</strong>
        <p>{message}</p>
      </div>
      {onRetry && (
        <button className="btn btn-ghost btn-sm" onClick={onRetry}>
          <RefreshCw size={15} /> Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ illustration, title, text, action }) {
  return (
    <div className="empty-state">
      {illustration}
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function CategoryIcon({ name, color, size = 36 }) {
  const Icon = iconFor(name);
  return (
    <span
      className="category-icon"
      style={{ width: size, height: size, color, background: `${color}1a` }}
      aria-hidden="true"
    >
      <Icon size={Math.round(size * 0.48)} />
    </span>
  );
}

/** status: ok | warning | over | no_budget */
export function ProgressBar({ percent, status }) {
  const width = Math.min(Number(percent) || 0, 100);
  return (
    <div
      className={`progress progress-${status}`}
      role="progressbar"
      aria-valuenow={Math.round(Number(percent) || 0)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="progress-fill" style={{ width: `${width}%` }} />
    </div>
  );
}

export function StatusPill({ status, percent }) {
  if (status === 'over')
    return <span className="pill pill-over"><OctagonAlert size={13} /> Over budget</span>;
  if (status === 'warning')
    return <span className="pill pill-warning"><AlertTriangle size={13} /> {formatPercent(percent)} used</span>;
  if (status === 'ok')
    return <span className="pill pill-ok"><CheckCircle2 size={13} /> On track</span>;
  return <span className="pill pill-neutral">No budget</span>;
}

export function AlertList({ alerts }) {
  if (!alerts?.length) {
    return (
      <div className="alert alert-ok">
        <CheckCircle2 size={18} />
        <span>All budgets are on track for this month.</span>
      </div>
    );
  }
  return (
    <div className="alert-list">
      {alerts.map((a, i) => (
        <div key={i} className={`alert alert-${a.level}`} role="alert">
          {a.level === 'danger' ? <OctagonAlert size={18} /> : <AlertTriangle size={18} />}
          <span>{a.message}</span>
        </div>
      ))}
    </div>
  );
}
