import { Line } from 'react-chartjs-2';
import { categoryAxis, INK, tooltipStyle, wonAxis } from './chartSetup';
import { formatWon, monthLabel } from '../../services/format';

/** Monthly spending trend, with the overall budget as a dashed reference line. */
export default function MonthlyLineChart({ months }) {
  const hasBudgets = months.some((m) => m.budget);

  const datasets = [{
    label: 'Spent',
    data: months.map((m) => m.total),
    borderColor: INK.navy,
    borderWidth: 2,
    pointRadius: 4,
    pointHoverRadius: 6,
    pointBackgroundColor: INK.navy,
    pointBorderColor: '#ffffff',
    pointBorderWidth: 2,
    cubicInterpolationMode: 'monotone', // smooth without overshooting real values
    fill: true,
    backgroundColor: (ctx) => {
      const { chart } = ctx;
      if (!chart.chartArea) return 'rgba(15, 39, 71, 0.08)';
      const g = chart.ctx.createLinearGradient(0, chart.chartArea.top, 0, chart.chartArea.bottom);
      g.addColorStop(0, 'rgba(15, 39, 71, 0.16)');
      g.addColorStop(1, 'rgba(15, 39, 71, 0)');
      return g;
    },
  }];
  if (hasBudgets) {
    datasets.push({
      label: 'Monthly budget',
      data: months.map((m) => m.budget ?? null),
      borderColor: INK.emerald,
      borderWidth: 2,
      borderDash: [6, 4],
      pointRadius: 0,
      pointHoverRadius: 5,
      pointBackgroundColor: INK.emerald,
      spanGaps: false,
      fill: false,
    });
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    scales: { x: categoryAxis, y: wonAxis },
    plugins: {
      legend: { display: hasBudgets, position: 'top', align: 'end' },
      tooltip: {
        ...tooltipStyle,
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y == null ? 'not set' : formatWon(ctx.parsed.y)}`,
        },
      },
    },
  };

  return (
    <div className="chart-box">
      <Line
        data={{ labels: months.map((m) => monthLabel(m.month, m.year, true)), datasets }}
        options={options}
        role="img"
        aria-label="Line chart of monthly spending"
      />
    </div>
  );
}
