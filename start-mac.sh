#!/bin/bash
# Starts MySQL, Flask and React for this Mac, using the portable tools in
# ~/.local/expense-tools.  Run from VS Code's terminal:   ./start-mac.sh
# Press Ctrl+C to stop the app (MySQL keeps running; ./stop-mac.sh stops it too).
set -e
TOOLS="$HOME/.local/expense-tools"
ROOT="$(cd "$(dirname "$0")" && pwd)"
export PATH="$TOOLS/node/bin:$PATH"
mkdir -p "$ROOT/logs"

if ! "$TOOLS/mysql/bin/mysqladmin" --defaults-file="$TOOLS/my.cnf" -uroot --password="$(cat "$TOOLS/.mysql_root_password")" ping >/dev/null 2>&1; then
  echo "▶ Starting MySQL (port 3307)…"
  nohup "$TOOLS/mysql/bin/mysqld" --defaults-file="$TOOLS/my.cnf" >/dev/null 2>&1 &
  for _ in $(seq 1 30); do
    "$TOOLS/mysql/bin/mysqladmin" --defaults-file="$TOOLS/my.cnf" -uroot --password="$(cat "$TOOLS/.mysql_root_password")" ping >/dev/null 2>&1 && break
    sleep 1
  done
fi
echo "✔ MySQL is running"

echo "▶ Starting Flask backend (port 5001)…  log: logs/flask.log"
cd "$ROOT/backend"
./venv/bin/python app.py > "$ROOT/logs/flask.log" 2>&1 &
FLASK_PID=$!
trap 'echo; echo "Stopping Flask…"; kill $FLASK_PID 2>/dev/null' EXIT

for _ in $(seq 1 20); do
  if ! kill -0 $FLASK_PID 2>/dev/null; then echo "✘ Flask failed to start:"; tail -20 "$ROOT/logs/flask.log"; exit 1; fi
  curl -s http://127.0.0.1:5001/api/health >/dev/null 2>&1 && break
  sleep 0.5
done
sleep 1
if ! kill -0 $FLASK_PID 2>/dev/null; then echo "✘ Flask failed to start:"; tail -20 "$ROOT/logs/flask.log"; exit 1; fi
echo "✔ Flask is running"

echo "▶ Starting React frontend…"
echo
echo "   Open  ➜  http://localhost:5173"
echo
(sleep 3 && open http://localhost:5173) &
cd "$ROOT/frontend"
npm run dev
