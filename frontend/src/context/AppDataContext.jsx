import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { buildColorMap } from '../services/categoryStyle';
import ExpenseFormModal from '../components/ExpenseFormModal';

// Shared state for the logged-in area:
//  - the month being viewed (used by Dashboard, Budgets, Reports)
//  - the category list and each category's chart colour
//  - a "version" number that increases after any change, so every page re-fetches
//  - the global "Add expense" dialog
const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  const now = new Date();
  const [period, setPeriod] = useState({ month: now.getMonth() + 1, year: now.getFullYear() });
  const [categories, setCategories] = useState([]);
  const [version, setVersion] = useState(0);
  const [expenseDialog, setExpenseDialog] = useState(null); // null | { expense?: {...} }

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  const loadCategories = useCallback(async () => {
    try {
      const data = await api.listCategories();
      setCategories(data.categories);
    } catch {
      // pages show their own error states
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories, version]);

  const colorMap = useMemo(() => buildColorMap(categories), [categories]);

  const value = {
    period,
    setPeriod,
    categories,
    colorFor: (categoryId) => colorMap[categoryId] || '#a8a7a1',
    version,
    refresh,
    openExpenseForm: (expense = null) => setExpenseDialog({ expense }),
  };

  return (
    <AppDataContext.Provider value={value}>
      {children}
      {expenseDialog && (
        <ExpenseFormModal
          expense={expenseDialog.expense}
          categories={categories}
          onClose={() => setExpenseDialog(null)}
          onSaved={() => {
            setExpenseDialog(null);
            refresh();
          }}
        />
      )}
    </AppDataContext.Provider>
  );
}

export const useAppData = () => useContext(AppDataContext);
