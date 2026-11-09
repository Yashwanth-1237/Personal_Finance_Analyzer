#!/bin/bash
# Stops everything started by start-mac.sh, including the portable MySQL server.
TOOLS="$HOME/.local/expense-tools"
pkill -f "venv/bin/python app.py" 2>/dev/null && echo "Stopped Flask"
pkill -f "personal-expense-analyzer/frontend/node_modules/.bin/vite" 2>/dev/null && echo "Stopped React"
"$TOOLS/mysql/bin/mysqladmin" --defaults-file="$TOOLS/my.cnf" -uroot \
  --password="$(cat "$TOOLS/.mysql_root_password")" shutdown 2>/dev/null && echo "Stopped MySQL"
echo "Done."
