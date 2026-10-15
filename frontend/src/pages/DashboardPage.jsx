import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Gauge, PiggyBank, Plus, Wallet } from 'lucide-react';
import { api } from '../services/api';
import useFetch from '../services/useFetch';
import { formatPercent, formatWon, monthLabel } from '../services/format';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { AlertList, CategoryIcon, EmptyState, ErrorState, ProgressBar, Spinner, StatusPill } from '../components/ui';
import { ChartIllustration, ReceiptIllustration, WalletIllustration } from '../components/Illustrations';
import TransactionList from '../components/TransactionList';
import CategoryDoughnut from '../components/charts/CategoryDoughnut';
import MonthlyLineChart from '../components/charts/MonthlyLineChart';

function SummaryCard({ icon: Icon, label, value, hint, tone = 'navy', children }) {
  return (
    <div className={`card summary-card tone-${tone}`}>
      <div className="summary-top">
        <span className="summary-icon"><Icon size={20} /></span>
        <span className="summary-label">{label}</span>
      </div>
      <div className="summary-value">{value}</div>
      {children}
      {hint && <div className="summary-hint">{hint}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { period, version, colorFor, openExpenseForm } = useAppData();

  const { data, loading, error, reload } = useFetch(async () => {
    const [summary, categories, monthly] = await Promise.all([
      api.summary(period),
      api.categoryAnalytics(period),
      api.monthly(period, 6),
    ]);
    return { summary, categories: categories.categories, months: monthly.months };
  }, [period.month, period.year, version]);

  if (loading && !data) return <Spinner label="Loading your dashboard…" />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;

  const { summary: s, categories, months } = data;
  const hasBudget = s.monthly_budget !== null;
  const remainingTone = !hasBudget ? 'gray' : s.remaining < 0 ? 'red' : 'emerald';
  const budgetRows = categories.filter((c) => c.budget);

  return (
    <div className="page">
      <div className="page-intro">
        <div>
          <h2>Hi, {user?.full_name} 👋</h2>
          <p className="muted">Here is your spending overview for {monthLabel(s.month, s.year)}.</p>
        </div>
      </div>

      <div className="summary-grid">
        <SummaryCard icon={Wallet} label="Total spent this month" value={formatWon(s.total_spent)}
          hint={`${s.transaction_count} transaction${s.transaction_count === 1 ? '' : 's'} · ${formatWon(s.daily_average)}/day avg`} />
        <SummaryCard icon={PiggyBank} label="Monthly budget" tone="emerald"
          value={hasBudget ? formatWon(s.monthly_budget) : 'Not set'}
          hint={hasBudget ? 'Overall limit for the month' : <Link to="/budgets">Set a monthly budget →</Link>} />
        <SummaryCard icon={CalendarDays} label="Remaining budget" tone={remainingTone}
          value={hasBudget ? formatWon(s.remaining) : '—'}
          hint={!hasBudget ? 'Set a budget to track this' : s.remaining < 0
            ? `Over by ${formatWon(-s.remaining)}` : 'Left to spend this month'} />
        <SummaryCard icon={Gauge} label="Budget used" tone={s.status === 'over' ? 'red' : s.status === 'warning' ? 'amber' : 'navy'}
          value={hasBudget ? formatPercent(s.percent_used) : '—'}>
          {hasBudget && <ProgressBar percent={s.percent_used} status={s.status} />}
        </SummaryCard>
      </div>

      <section className="card">
        <div className="card-header">
          <h3>Budget alerts</h3>
          <Link to="/budgets" className="link-btn">Manage budgets <ArrowRight size={15} /></Link>
        </div>
        {hasBudget || budgetRows.length ? (
          <AlertList alerts={s.alerts} />
        ) : (
          <p className="muted">No budgets yet. Set a monthly or category budget to get overspending warnings.</p>
        )}
      </section>

      <div className="grid-2">
        <section className="card">
          <div className="card-header">
            <h3>Spending by category</h3>
            {s.highest_category && (
              <span className="muted small">Top: <strong>{s.highest_category.category_name}</strong></span>
            )}
          </div>
          {categories.some((c) => c.spent > 0) ? (
            <CategoryDoughnut rows={categories} />
          ) : (
            <EmptyState illustration={<ChartIllustration size={96} />} title="No spending yet"
              text="Your category breakdown will appear after you add an expense." />
          )}
        </section>

        <section className="card">
          <div className="card-header">
            <h3>Monthly trend</h3>
            <span className="muted small">Last 6 months</span>
          </div>
          {months.some((m) => m.total > 0) ? (
            <MonthlyLineChart months={months} />
          ) : (
            <EmptyState illustration={<ChartIllustration size={96} />} title="No history yet"
              text="Spending over time shows up here." />
          )}
        </section>
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="card-header">
            <h3>Category budgets</h3>
            <Link to="/budgets" className="link-btn">Edit <ArrowRight size={15} /></Link>
          </div>
          {budgetRows.length ? (
            <ul className="budget-mini-list">
              {budgetRows.map((c) => (
                <li key={c.category_id}>
                  <CategoryIcon name={c.category_name} color={colorFor(c.category_id)} size={32} />
                  <div className="budget-mini-main">
                    <div className="row-between">
                      <strong>{c.category_name}</strong>
                      <StatusPill status={c.status} percent={c.percent_used} />
                    </div>
                    <ProgressBar percent={c.percent_used} status={c.status} />
                    <small className="muted">{formatWon(c.spent)} of {formatWon(c.budget)}</small>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState illustration={<WalletIllustration size={96} />} title="No category budgets"
              text="Give Food, Transportation and others their own limits."
              action={<Link to="/budgets" className="btn btn-secondary btn-sm">Set budgets</Link>} />
          )}
        </section>

        <section className="card">
          <div className="card-header">
            <h3>Recent transactions</h3>
            <Link to="/expenses" className="link-btn">View all <ArrowRight size={15} /></Link>
          </div>
          {s.recent_transactions.length ? (
            <TransactionList expenses={s.recent_transactions} onEdit={openExpenseForm} compact />
          ) : (
            <EmptyState illustration={<ReceiptIllustration size={96} />} title="No transactions this month"
              text="Record your first expense to see it here."
              action={<button className="btn btn-primary btn-sm" onClick={() => openExpenseForm()}>
                <Plus size={16} /> Add expense</button>} />
          )}
        </section>
      </div>
    </div>
  );
}
