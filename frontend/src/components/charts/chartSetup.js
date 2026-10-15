import {
  ArcElement, BarElement, CategoryScale, Chart as ChartJS, Filler, Legend, LinearScale,
  LineElement, PointElement, Tooltip,
} from 'chart.js';
import { formatCompactWon, formatWon } from '../../services/format';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, LineElement, PointElement, Filler, Legend, Tooltip);

export const INK = {
  primary: '#0f172a',
  secondary: '#52514e',
  muted: '#898781',
  grid: '#e1e0d9',
  baseline: '#c3c2b7',
  navy: '#0f2747',
  emerald: '#059669',
};

ChartJS.defaults.font.family = "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";
ChartJS.defaults.font.size = 12;
ChartJS.defaults.color = INK.muted;
ChartJS.defaults.plugins.legend.labels.boxWidth = 10;
ChartJS.defaults.plugins.legend.labels.boxHeight = 10;
ChartJS.defaults.plugins.legend.labels.usePointStyle = true;
ChartJS.defaults.plugins.legend.labels.color = INK.secondary;

export const tooltipStyle = {
  backgroundColor: '#ffffff',
  titleColor: INK.primary,
  bodyColor: INK.secondary,
  borderColor: 'rgba(15, 23, 42, 0.12)',
  borderWidth: 1,
  padding: 10,
  cornerRadius: 8,
  boxPadding: 4,
  usePointStyle: true,
  titleFont: { weight: '600' },
};

export const wonAxis = {
  beginAtZero: true,
  grid: { color: INK.grid, drawTicks: false },
  border: { display: false },
  ticks: { padding: 8, callback: (v) => formatCompactWon(v) },
};

export const categoryAxis = {
  grid: { display: false },
  border: { color: INK.baseline },
  ticks: { color: INK.secondary },
};

