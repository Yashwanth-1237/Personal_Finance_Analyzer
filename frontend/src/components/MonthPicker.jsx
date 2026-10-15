import { ChevronLeft, ChevronRight } from 'lucide-react';
import { monthLabel } from '../services/format';
import { useAppData } from '../context/AppDataContext';

export default function MonthPicker() {
  const { period, setPeriod } = useAppData();
  const now = new Date();
  const isCurrent = period.month === now.getMonth() + 1 && period.year === now.getFullYear();

  const index = period.year * 12 + (period.month - 1);
  const MIN = 2000 * 12;
  const MAX = 2100 * 12 + 11; // the server accepts years 2000–2100

  const shift = (delta) => {
    const next = index + delta;
    setPeriod({ month: (next % 12) + 1, year: Math.floor(next / 12) });
  };

  return (
    <div className="month-picker">
      <button className="icon-btn" onClick={() => shift(-1)} aria-label="Previous month" disabled={index <= MIN}>
        <ChevronLeft size={18} />
      </button>
      <span className="month-picker-label">{monthLabel(period.month, period.year)}</span>
      <button className="icon-btn" onClick={() => shift(1)} aria-label="Next month" disabled={index >= MAX}>
        <ChevronRight size={18} />
      </button>
      {!isCurrent && (
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setPeriod({ month: now.getMonth() + 1, year: now.getFullYear() })}
        >
          Today
        </button>
      )}
    </div>
  );
}
