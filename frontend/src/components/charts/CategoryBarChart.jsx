import { Bar } from 'react-chartjs-2';
import { categoryAxis, INK, tooltipStyle, wonAxis } from './chartSetup';
import { formatWon } from '../../services/format';

/** Spent vs budget for each category (one shared ₩ axis). */
export default function CategoryBarChart({ rows }) {
  const sorted = [...rows].sort((a, b) => a.category_id - b.category_id);
  const hasBudgets = sorted.some((r) => r.budget);

  const datasets = [{
    label: 'Spent',
    data: sorted.map((r) => r.spent),
    backgroundColor: INK.navy,
    hoverBackgroundColor: '#1e3a66',
    borderRadius: 4,
    borderSkipped: 'start',
    maxBarThickness: 28,
  }];
  if (hasBudgets) {
    datasets.push({
      label: 'Budget',
      data: sorted.map((r) => r.budget ?? null),
      backgroundColor: '#a7f3d0',
      hoverBackgroundColor: '#6ee7b7',
      borderRadius: 4,
      borderSkipped: 'start',
      maxBarThickness: 28,
    });
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    datasets: { bar: { categoryPercentage: 0.7, barPercentage: 0.9 } },
    scales: { x: categoryAxis, y: wonAxis },
    plugins: {
      legend: { display: hasBudgets, position: 'top', align: 'end' },
      tooltip: {
        ...tooltipStyle,
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y == null ? 'not set' : formatWon(ctx.parsed.y)}`,
          afterBody: (items) => {
            const row = sorted[items[0].dataIndex];
            if (!row.budget) return '';
            return row.spent > row.budget
              ? `Over budget by ${formatWon(row.spent - row.budget)}`
              : `${formatWon(row.budget - row.spent)} remaining`;
          },
        },
      },
    },
  };

  return (
    <div className="chart-box">
      <Bar
        data={{ labels: sorted.map((r) => r.category_name), datasets }}
        options={options}
        role="img"
        aria-label="Bar chart comparing spending and budget by category"
      />
    </div>
  );
}
