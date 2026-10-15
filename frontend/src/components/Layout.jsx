import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3, FolderKanban, LayoutDashboard, LogOut, Menu, PiggyBank, Plus, ReceiptText, Settings, X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import { BrandMark } from './Illustrations';
import MonthPicker from './MonthPicker';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, monthly: true },
  { to: '/expenses', label: 'Expenses', icon: ReceiptText },
  { to: '/categories', label: 'Categories', icon: FolderKanban },
  { to: '/budgets', label: 'Budgets', icon: PiggyBank, monthly: true },
  { to: '/reports', label: 'Reports', icon: BarChart3, monthly: true },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { openExpenseForm } = useAppData();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  const current = NAV.find((n) => location.pathname.startsWith(n.to));
  const initials = (user?.full_name || '?')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <BrandMark />
          <div>
            <strong>Expense Analyzer</strong>
            <small>Team Pentagon</small>
          </div>
          <button className="icon-btn sidebar-close" onClick={() => setMenuOpen(false)} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="avatar">{initials}</span>
            <div>
              <strong>{user?.full_name}</strong>
              <small>{user?.email}</small>
            </div>
          </div>
          <button className="nav-link logout" onClick={handleLogout}>
            <LogOut size={19} />
            Logout
          </button>
        </div>
      </aside>
      {menuOpen && <div className="sidebar-scrim" onClick={() => setMenuOpen(false)} />}

      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Menu size={22} />
          </button>
          <h1 className="topbar-title">{current?.label || 'Expense Analyzer'}</h1>
          <div className="topbar-actions">
            {current?.monthly && <MonthPicker />}
            <button className="btn btn-primary" onClick={() => openExpenseForm()}>
              <Plus size={18} />
              <span className="hide-sm">Add expense</span>
            </button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
