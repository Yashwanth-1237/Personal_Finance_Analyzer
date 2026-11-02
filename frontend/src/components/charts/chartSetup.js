import {
  ArcElement, BarElement, CategoryScale, Chart as ChartJS, Filler, Legend, LinearScale,
  LineElement, PointElement, Tooltip,
} from 'chart.js';
import { formatCompactWon } from '../../services/format';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, LineElement, PointElement, Filler, Legend, Tooltip);

export function createChartTheme(theme) {
  const light = theme === 'light';
  const INK = light
    ? {
      primary: '#111827',
      secondary: '#465166',
      muted: '#69758a',
      grid: '#e4e8f0',
      baseline: '#c4cada',
      navy: '#456dff',
      emerald: '#729719',
    }
    : {
      primary: '#f3f5fa',
      secondary: '#b6becc',
      muted: '#8993a4',
      grid: '#2a303c',
      baseline: '#414959',
      navy: '#456dff',
      emerald: '#c8f34a',
    };

  return {
    INK,
    chartSurface: light ? '#ffffff' : '#11141b',
    fillFallback: light ? 'rgba(69, 109, 255, 0.1)' : 'rgba(69, 109, 255, 0.12)',
    fillTop: light ? 'rgba(69, 109, 255, 0.2)' : 'rgba(69, 109, 255, 0.28)',
    tooltipStyle: {
      backgroundColor: light ? '#ffffff' : '#11141b',
      titleColor: INK.primary,
      bodyColor: INK.secondary,
      borderColor: light ? '#dce1ec' : '#414959',
      borderWidth: 1,
      padding: 10,
      cornerRadius: 8,
      boxPadding: 4,
      usePointStyle: true,
      titleFont: { weight: '600' },
    },
    wonAxis: {
      beginAtZero: true,
      grid: { color: INK.grid, drawTicks: false },
      border: { display: false },
      ticks: { color: INK.muted, padding: 8, callback: (v) => formatCompactWon(v) },
    },
    categoryAxis: {
      grid: { display: false },
      border: { color: INK.baseline },
      ticks: { color: INK.secondary },
    },
  };
}

ChartJS.defaults.font.family = "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";
ChartJS.defaults.font.size = 12;
ChartJS.defaults.color = '#8993a4';
ChartJS.defaults.plugins.legend.labels.boxWidth = 10;
ChartJS.defaults.plugins.legend.labels.boxHeight = 10;
ChartJS.defaults.plugins.legend.labels.usePointStyle = true;
ChartJS.defaults.plugins.legend.labels.color = '#b6becc';
