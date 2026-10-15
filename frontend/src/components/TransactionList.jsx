import { Pencil, Trash2 } from 'lucide-react';
import { CategoryIcon } from './ui';
import { formatDate, formatWon } from '../services/format';
import { useAppData } from '../context/AppDataContext';

export default function TransactionList({ expenses, onEdit, onDelete, compact = false }) {
  const { colorFor } = useAppData();
  return (
    <ul className={`txn-list ${compact ? 'compact' : ''}`}>
      {expenses.map((e) => (
        <li key={e.expense_id} className="txn">
          <CategoryIcon name={e.category_name} color={colorFor(e.category_id)} />
          <div className="txn-main">
            <strong>{e.note || e.category_name}</strong>
            <small>
              {e.category_name} · {formatDate(e.expense_date)}
            </small>
          </div>
          <span className="txn-amount">-{formatWon(e.amount)}</span>
          {(onEdit || onDelete) && (
            <div className="txn-actions">
              {onEdit && (
                <button className="icon-btn" onClick={() => onEdit(e)} aria-label="Edit expense" title="Edit">
                  <Pencil size={16} />
                </button>
              )}
              {onDelete && (
                <button className="icon-btn danger" onClick={() => onDelete(e)} aria-label="Delete expense" title="Delete">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
