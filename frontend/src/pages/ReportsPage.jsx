import { useState } from 'react';
import { Award, Download, PiggyBank, Receipt, TrendingUp, Wallet } from 'lucide-react';
import { api, reportCsvUrl } from '../services/api';
import useFetch from '../services/useFetch';
import { formatPercent, formatWon, monthLabel } from '../services/format';
import { useAppData } from '../context/AppDataContext';
import { useToast } from '../context/ToastContext';
import { EmptyState, ErrorState, Spinner, StatusPill } from '../components/ui';
import { ChartIllustration } from '../components/Illustrations';
import CategoryDoughnut from '../components/charts/CategoryDoughnut';
import CategoryBarChart from '../components/charts/CategoryBarChart';
import MonthlyLineChart from '../components/charts/MonthlyLineChart';

function Stat({ icon: Icon, label, value, sub }) {
  return (
    <div className="stat">
      <span className="stat-icon"><Icon size={18} /></span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        {sub && <span className="muted small">{sub}</span>}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const { period, version } = useAppData();
  const toast = useToast();
  const [trendMonths, setTrendMonths] = useState(6);
  const [exporting, setExporting] = useState(false);

  const { data, loading, error, reload } = useFetch(async () => {
    const [summary, categories, monthly] = await Promise.all([
      api.summary(period),
      api.categoryAnalytics(period),
      api.monthly(period, trendMonths),
    ]);
    return { summary, categories: categories.categories, months: monthly.months };
  }, [period.month, period.year, trendMonths, version]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const response = await fetch(reportCsvUrl(period), { credentials: 'same-origin' });
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || 'Export failed.');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expense-report-${period.year}-${String(period.month).padStart(2, '0')}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Report downloaded.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setExporting(false);
    }
  };

  if (loading && !data) return <Spinner label="Building your report…" />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;

  const { summary: s, categories, months } = data;
  const hasSpending = categories.some((c) => c.spent > 0);
  const periodTotal = months.reduce((sum, m) => sum + m.total, 0);

  return (
    <div className="page">
      <div className="page-intro">
        <div>
          <h2>{monthLabel(s.month, s.year)} report</h2>
          <p className="muted">Summary of spending, budgets and trends, calculated from your saved expenses.</p>
        </div>
        <button className="btn btn-secondary" onClick={exportCsv} disabled={exporting}>
          <Download size={17} /> {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

      <section className="card">
        <div className="stats-grid">
          <Stat icon={Wallet} label="Total spent" value={formatWon(s.total_spent)}
            sub={`${formatWon(s.daily_average)} per day`} />
          <Stat icon={PiggyBank} label="Remaining budget"
            value={s.monthly_budget ? formatWon(s.remaining) : 'No budget'}
            sub={s.monthly_budget ? `${formatPercent(s.percent_used)} of ${formatWon(s.monthly_budget)}` : 'Set one on Budgets'} />
          <Stat icon={Award} label="Highest category"
            value={s.highest_category ? s.highest_category.category_name : '—'}
            sub={s.highest_category ? `${formatWon(s.highest_category.spent)} · ${formatPercent(s.highest_category.share_percent)}` : ''} />
          <Stat icon={Receipt} label="Transactions" value={s.transaction_count} />
        </div>
      </section>

      {!hasSpending ? (
        <section className="card">
          <EmptyState illustration={<ChartIllustration />} title="Nothing to report for this month"
            text="Add expenses or choose a different month with the arrows above." />
        </section>
      ) : (
        <div className="grid-2">
          <section className="card">
            <div className="card-header"><h3>Spending by category</h3></div>
            <CategoryDoughnut rows={categories} />
          </section>
          <section className="card">
            <div className="card-header"><h3>Budget vs actual</h3></div>
            <CategoryBarChart rows={categories} />
          </section>
        </div>
      )}

      <section className="card">
        <div className="card-header">
          <div>
            <h3><TrendingUp size={18} className="inline-icon" /> Monthly spending trend</h3>
            <p className="muted small">{formatWon(periodTotal)} spent over the last {trendMonths} months</p>
          </div>
          <div className="segmented" role="group" aria-label="Trend length">
            {[6, 12].map((n) => (
              <button key={n} className={trendMonths === n ? 'active' : ''} onClick={() => setTrendMonths(n)}>
                {n} months
              </button>
            ))}
          </div>
        </div>
        <MonthlyLineChart months={months} />
      </section>

      <section className="card">
        <div className="card-header"><h3>Budget vs actual — table</h3></div>
        {categories.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th className="num">Spent</th>
                  <th className="num">Budget</th>
                  <th className="num">Remaining</th>
                  <th className="num">Share</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.category_id}>
                    <td>{c.category_name}</td>
                    <td className="num">{formatWon(c.spent)}</td>
                    <td className="num">{c.budget ? formatWon(c.budget) : '—'}</td>
                    <td className={`num ${c.remaining < 0 ? 'text-danger' : ''}`}>
                      {c.remaining === null ? '—' : formatWon(c.remaining)}
                    </td>
                    <td className="num">{formatPercent(c.share_percent)}</td>
                    <td><StatusPill status={c.status} percent={c.percent_used} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total</td>
                  <td className="num">{formatWon(s.total_spent)}</td>
                  <td className="num">{s.monthly_budget ? formatWon(s.monthly_budget) : '—'}</td>
                  <td className={`num ${s.remaining < 0 ? 'text-danger' : ''}`}>
                    {s.remaining === null ? '—' : formatWon(s.remaining)}
                  </td>
                  <td className="num">100%</td>
                  <td><StatusPill status={s.status} percent={s.percent_used} /></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <p className="muted">No categories with spending or budgets this month.</p>
        )}
      </section>

      <section className="card">
        <div className="card-header"><h3>Monthly totals — table</h3></div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Month</th><th className="num">Spent</th><th className="num">Budget</th><th className="num">Difference</th></tr>
            </thead>
            <tbody>
              {[...months].reverse().map((m) => (
                <tr key={`${m.year}-${m.month}`}>
                  <td>{monthLabel(m.month, m.year)}</td>
                  <td className="num">{formatWon(m.total)}</td>
                  <td className="num">{m.budget ? formatWon(m.budget) : '—'}</td>
                  <td className={`num ${m.budget && m.total > m.budget ? 'text-danger' : ''}`}>
                    {m.budget ? formatWon(m.budget - m.total) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
