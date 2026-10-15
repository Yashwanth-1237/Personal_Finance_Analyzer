import { Doughnut } from 'react-chartjs-2';
import { tooltipStyle } from './chartSetup';
import { FOLDED_COLOR } from '../../services/categoryStyle';
import { formatPercent, formatWon } from '../../services/format';
import { useAppData } from '../../context/AppDataContext';

/** Spending share by category, with a total in the centre and a labelled legend. */
export default function CategoryDoughnut({ rows }) {
  const { colorFor } = useAppData();

  // Keep category order (by id) so colours stay stable; fold 9th+ categories together.
  const slices = [];
  let folded = null;
  [...rows]
    .filter((r) => r.spent > 0)
    .sort((a, b) => a.category_id - b.category_id)
    .forEach((r) => {
      const color = colorFor(r.category_id);
      if (color === FOLDED_COLOR) {
        folded = folded || { label: 'More categories', value: 0, share: 0, color };
        folded.value += r.spent;
        folded.share += r.share_percent;
      } else {
        slices.push({ label: r.category_name, value: r.spent, share: r.share_percent, color });
      }
    });
  if (folded) slices.push(folded);

  const total = slices.reduce((sum, s) => sum + s.value, 0);

  const data = {
    labels: slices.map((s) => s.label),
    datasets: [{
      data: slices.map((s) => s.value),
      backgroundColor: slices.map((s) => s.color),
      borderColor: '#ffffff',
      borderWidth: 2,
      hoverOffset: 6,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: { display: false },
      tooltip: {
        ...tooltipStyle,
        callbacks: {
          label: (ctx) => ` ${ctx.label}: ${formatWon(ctx.parsed)} (${formatPercent(slices[ctx.dataIndex].share)})`,
        },
      },
    },
  };

  return (
    <div className="doughnut-wrap">
      <div className="doughnut-canvas">
        <Doughnut data={data} options={options} aria-label="Doughnut chart of spending by category" role="img" />
        <div className="doughnut-center">
          <small>Total</small>
          <strong>{formatWon(total)}</strong>
        </div>
      </div>
      <ul className="chart-legend">
        {slices.map((s) => (
          <li key={s.label}>
            <span className="swatch" style={{ background: s.color }} />
            <span className="legend-name">{s.label}</span>
            <span className="legend-value">{formatWon(s.value)}</span>
            <span className="legend-share">{formatPercent(s.share)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
