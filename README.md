# Personal Expense Analyzer for Students

**Freshmen Capstone Design · Team Pentagon · Woosong University**

A full-stack web app that helps university students record daily spending, set monthly and category budgets in Korean won (₩), get overspending warnings, and understand their habits through charts and reports.

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, React Router, Chart.js + react-chartjs-2, lucide-react icons |
| Backend | Python Flask REST API, Flask-SQLAlchemy |
| Database | MySQL 8 (via PyMySQL) |
| Auth | Session cookie (HttpOnly) + PBKDF2-SHA256 password hashing |

---

## Features

- **Accounts**: register, log in, log out, change name and password. Each student can only see their own data; the server checks this on every request.
- **Dashboard**: four summary cards (total spent this month, monthly budget, remaining budget, % used), budget alerts, a spending-by-category doughnut chart, a 6-month trend line, category budget progress and recent transactions.
- **Expenses**: add, edit and delete expenses. View the full history, search by description or category, filter by category and date range (with quick presets).
- **Categories**: seven defaults (Food, Transportation, Shopping, Study, Entertainment, Housing, Other) plus your own custom categories.
- **Budgets**: an overall monthly budget plus per-category budgets, with remaining money, % used and status. Warnings appear at 80% and when a budget is exceeded, e.g. *"Warning: Your Food budget has been exceeded by ₩4,000."* You can also copy last month's budgets.
- **Reports**: monthly summary, highest spending category, budget vs actual (chart and table), a 6- or 12-month trend, and **CSV export** (opens correctly in Excel).
- **Month selector**: view any past or future month on Dashboard, Budgets and Reports.
- **Demo mode** (Settings): fills an *empty* account with clearly labelled `[Demo]` sample data for presentations. Real data is never hard-coded.

Every number comes from the database. Adding, editing or deleting an expense immediately refreshes totals, budgets and charts.

---

## Project structure

```
personal-expense-analyzer/
├── backend/
│   ├── app.py              # Flask app factory + entry point (python app.py)
│   ├── config.py           # Settings loaded from .env
│   ├── models.py           # SQLAlchemy models (Users, Categories, Expenses, Budgets)
│   ├── calculations.py     # Budget usage, alerts, category & monthly analytics
│   ├── utils.py            # Auth guard, validation helpers, date helpers
│   ├── routes/
│   │   ├── auth.py         # /api/register, /login, /logout, /me
│   │   ├── expenses.py     # /api/expenses CRUD + search/filter
│   │   ├── categories.py   # /api/categories
│   │   ├── budgets.py      # /api/budgets
│   │   ├── analytics.py    # /api/analytics/* and /api/reports/export (CSV)
│   │   └── demo.py         # /api/demo/seed and /api/demo/reset (Settings page)
│   ├── tests/test_api.py   # Automated end-to-end API tests
│   └── requirements.txt
├── database/
│   └── schema.sql          # Creates the database, tables, keys, indexes + default categories
├── frontend/
│   ├── index.html
│   ├── vite.config.js      # Dev server on :5173, forwards /api to Flask on :5001
│   ├── package.json
│   └── src/
│       ├── main.jsx, App.jsx
│       ├── components/     # Layout, modals, charts, shared UI
│       ├── context/        # Auth, toasts, shared month/category state
│       ├── pages/          # Dashboard, Expenses, Categories, Budgets, Reports, Settings, Login/Register
│       ├── services/       # API client, formatting, colours
│       └── styles/global.css
├── .env.example
├── .gitignore
└── README.md
```

---

## 1. Required software

Install these first (all free):

| Software | Version | Download |
|---|---|---|
| Python | 3.10 or newer (tick **"Add python.exe to PATH"** during install) | https://www.python.org/downloads/ |
| Node.js | 18 LTS or newer (includes npm) | https://nodejs.org/ |
| MySQL Community Server | 8.0 or newer (remember the **root password** you set) | https://dev.mysql.com/downloads/installer/ |
| Visual Studio Code | latest | https://code.visualstudio.com/ |

Check them in the VS Code terminal (**Terminal → New Terminal**, PowerShell):

```powershell
python --version
node --version
npm --version
mysql --version
```

> If `mysql` is "not recognized", add MySQL to PATH (usually `C:\Program Files\MySQL\MySQL Server 8.0\bin`) or use **MySQL Workbench** for step 2.

---

## 2. Create the MySQL database

Open the project folder in VS Code (**File → Open Folder → personal-expense-analyzer**), then:

```powershell
# Run from the project root. Enter your MySQL root password when asked.
Get-Content database\schema.sql | mysql -u root -p
```

**Using MySQL Workbench instead:** connect to your local server, open `database/schema.sql` (**File → Open SQL Script**), and click the ⚡ *Execute* button.

Check that it worked:

```powershell
mysql -u root -p -e "USE expense_analyzer; SHOW TABLES; SELECT * FROM categories;"
```

You should see 4 tables (`budgets`, `categories`, `expenses`, `users`) and 7 default categories.

> **Created your database with an older copy of `schema.sql`?** Upgrade it (your data is kept):
> `Get-Content database\migrations\001_fix_cascade_deletes.sql | mysql -u root -p`

---

## 3. Configure environment variables

```powershell
Copy-Item .env.example .env
```

Open `.env` and set at least:

```
MYSQL_PASSWORD=your_mysql_root_password
SECRET_KEY=<paste a random string>
```

Generate a secret key with:

```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## 4. Backend: virtual environment, dependencies, start Flask

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

Flask runs at **http://localhost:5001**. Test it at http://localhost:5001/api/health, which should show `{"status": "ok"}`.

Leave this terminal running. Next time you only need:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python app.py
```

---

## 5. Frontend: install dependencies and start React

Open a **second** terminal (click **+** in the VS Code terminal panel):

```powershell
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser. 🎉

| URL | What it is |
|---|---|
| http://localhost:5173 | The app (use this one) |
| http://localhost:5001/api/health | Backend health check |

The Vite dev server forwards every `/api/...` request to Flask, so you don't need any CORS setup.

---

## Quick start on this team Mac

This Mac has portable copies of Python, Node.js and MySQL in `~/.local/expense-tools`
(MySQL runs on port **3307**, and its password is already in `.env`). In VS Code's terminal, run:

```bash
./start-mac.sh     # starts MySQL + Flask + React and opens http://localhost:5173
./stop-mac.sh      # stops everything (Ctrl+C stops just the app)
```

## 6. Test the example workflow

1. Click **Create an account** and register (e.g. *Kim Minji*, `minji@wsu.ac.kr`, password `pentagon123`).
2. Log out (sidebar), then log back in.
3. Go to **Budgets → Set monthly budget**, enter `600000`, and save.
4. Click **Add category budget**, choose **Food**, enter `150000`, and save.
5. Click **+ Add expense** (top right), enter `7000`, choose **Food**, set the note to *Lunch*, and save.
6. The expense is stored in MySQL (check with `SELECT * FROM expense_analyzer.expenses;`).
7. Budgets shows **₩7,000 spent of ₩150,000** for Food.
8. Dashboard shows Remaining **₩593,000** and Budget used **1.2%**.
9. The charts show the new spending straight away.
10. Add another Food expense of `147000`. The dashboard now shows **"Warning: Your Food budget has been exceeded by ₩4,000."**

For a presentation with realistic charts, create a fresh account and click **Settings → Load demo data**.

### Automated tests

The backend includes tests that run this whole workflow, plus validation checks and checks that users cannot see each other's data. They use a temporary SQLite file, so MySQL isn't needed:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python -m unittest discover tests -v
```

---

## REST API reference

All responses are JSON. Errors look like `{"error": "message", "fields": {"amount": "..."}}`.
Every endpoint except register/login/logout requires login (otherwise `401`).

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/register` | `{full_name, email, password}` → 201, logs in |
| POST | `/api/login` | `{email, password}` → 200 / 401 |
| POST | `/api/logout` | Ends the session |
| GET | `/api/me` | Current user |
| PUT | `/api/me` | Update `{full_name}` |
| PUT | `/api/me/password` | `{current_password, new_password}` |
| GET | `/api/expenses` | Filters: `search`, `category_id`, `start_date`, `end_date`, `limit` |
| POST | `/api/expenses` | `{amount, expense_date, category_id, note}` → 201 |
| PUT | `/api/expenses/:id` | Update an expense (404 if it isn't yours) |
| DELETE | `/api/expenses/:id` | Delete an expense |
| GET | `/api/categories` | Default + your custom categories |
| POST | `/api/categories` | `{category_name}` → 201 / 409 duplicate |
| DELETE | `/api/categories/:id` | Delete a custom category (expenses move to "Other") |
| GET | `/api/budgets?month=&year=` | Overall + category budgets with usage |
| POST | `/api/budgets` | `{month, year, amount, category_id?}`; no `category_id` = overall budget |
| PUT | `/api/budgets/:id` | `{amount}` |
| DELETE | `/api/budgets/:id` | Remove a budget |
| POST | `/api/budgets/copy-previous` | `{month, year}`; copies last month's budgets |
| GET | `/api/analytics/summary?month=&year=` | Dashboard cards, alerts, recent transactions |
| GET | `/api/analytics/categories?month=&year=` | Spending/budget per category |
| GET | `/api/analytics/monthly?month=&year=&months=6` | Monthly totals ending at the month |
| GET | `/api/reports/export?month=&year=` | CSV download |
| POST | `/api/demo/seed` | Demo data (empty accounts only) |
| POST | `/api/demo/reset` | `{confirm: "DELETE"}`; deletes all your data |

## Database design

- **users**: `user_id` PK, unique `email`, `password_hash` (never the plain password).
- **categories**: `user_id` NULL = shared default; otherwise owned by one user (FK, cascade delete). Unique `(user_id, category_name)`.
- **expenses**: FK to `users` (cascade) and `categories` (restrict). `CHECK amount > 0`. Index on `(user_id, expense_date)` for fast monthly queries.
- **budgets**: `category_id` NULL = overall monthly budget. `CHECK` on month 1–12 and amount > 0. A generated `category_key` column makes `UNIQUE (user_id, category_key, month, year)` work, so there is only one budget per category (and one overall budget) per month.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `.\venv\Scripts\Activate.ps1 cannot be loaded because running scripts is disabled` | Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, answer **Y**, then try again. |
| `python` opens the Microsoft Store / is not recognized | Reinstall Python with **Add to PATH** ticked, or use `py` instead of `python`. |
| `Could not connect to the database` / `Can't connect to MySQL server` | Start MySQL: **Win + R → services.msc → MySQL80 → Start**. Check `MYSQL_HOST`/`MYSQL_PORT` in `.env`. |
| `Access denied for user 'root'@'localhost'` | Wrong `MYSQL_PASSWORD` in `.env`. Special characters are fine; don't add quotes. |
| `Unknown database 'expense_analyzer'` | You skipped step 2. Run `schema.sql`. |
| `'cryptography' package is required for sha256_password or caching_sha2_password` | Activate the venv and run `pip install -r requirements.txt` again. |
| Browser shows "Cannot reach the server" or a 500 error on login | Flask isn't running. Start it in the first terminal (`python app.py`). |
| `npm` is not recognized | Install Node.js, then **close and reopen VS Code**. |
| `npm install` fails with `EACCES`/`EPERM` | Close other terminals/editors using the folder; delete `frontend\node_modules` and retry. |
| Port 5001 or 5173 already in use | Close the other program. For Flask, change `FLASK_PORT` in `.env` in `app.py` **and** the proxy target in `frontend/vite.config.js`. |
| Logged out right after logging in | Make sure you open **http://localhost:5173** (not 127.0.0.1:5001) so the cookie and proxy match. |
| "Demo data can only be loaded into an account with no expenses" | Use **Settings → Delete all my data** first, or register a new account. |
| Charts are empty | Charts only show stored data. Add expenses or load demo data, and check the selected month. |

---

## Security notes

- Passwords are hashed with PBKDF2-SHA256 (600,000 iterations) and are never stored or returned in plain text.
- Sessions use a signed, HttpOnly, SameSite=Lax cookie. Set a strong `SECRET_KEY` and keep `.env` out of git (it's already in `.gitignore`).
- Every expense, budget and category query is scoped to the logged-in user. Requests for another user's records return 404.
- All input is validated on both the client and the server.
