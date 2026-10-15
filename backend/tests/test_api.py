"""End-to-end API tests using a temporary SQLite database (MySQL not required).

Run from the backend folder:   python -m unittest discover tests -v
"""
import os
import sys
import tempfile
import unittest
from datetime import date

DB_FILE = os.path.join(tempfile.gettempdir(), "expense_analyzer_test.db")
os.environ["DATABASE_URL"] = f"sqlite:///{DB_FILE}"
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app  # noqa: E402
from models import db  # noqa: E402

TODAY = date.today()
PERIOD = {"month": TODAY.month, "year": TODAY.year}


class ExpenseAnalyzerTest(unittest.TestCase):
    def setUp(self):
        if os.path.exists(DB_FILE):
            os.remove(DB_FILE)
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.engine.dispose()

    def register(self, client=None, email="minji@wsu.ac.kr"):
        client = client or self.client
        return client.post("/api/register", json={
            "full_name": "Kim Minji", "email": email, "password": "pentagon123"})

    def category_id(self, name):
        cats = self.client.get("/api/categories").get_json()["categories"]
        return next(c["category_id"] for c in cats if c["category_name"] == name)

    def test_full_student_workflow(self):
        # 1–2. Register (logs in automatically), log out, log back in
        self.assertEqual(self.register().status_code, 201)
        self.assertEqual(self.client.post("/api/logout").status_code, 200)
        self.assertEqual(self.client.get("/api/me").status_code, 401)
        bad = self.client.post("/api/login", json={"email": "minji@wsu.ac.kr", "password": "wrong"})
        self.assertEqual(bad.status_code, 401)
        ok = self.client.post("/api/login", json={"email": "minji@wsu.ac.kr", "password": "pentagon123"})
        self.assertEqual(ok.status_code, 200)

        # 3. Monthly budget ₩600,000
        r = self.client.post("/api/budgets", json={**PERIOD, "amount": 600000})
        self.assertEqual(r.status_code, 201)
        # 4. Food budget ₩150,000
        food = self.category_id("Food")
        r = self.client.post("/api/budgets", json={**PERIOD, "amount": 150000, "category_id": food})
        self.assertEqual(r.status_code, 201)

        # 5–6. ₩7,000 lunch
        r = self.client.post("/api/expenses", json={
            "amount": 7000, "expense_date": TODAY.isoformat(), "category_id": food, "note": "Lunch"})
        self.assertEqual(r.status_code, 201)
        lunch_id = r.get_json()["expense"]["expense_id"]

        # 7–8. Totals recalculated
        s = self.client.get("/api/analytics/summary", query_string=PERIOD).get_json()
        self.assertEqual(s["total_spent"], 7000)
        self.assertEqual(s["monthly_budget"], 600000)
        self.assertEqual(s["remaining"], 593000)
        self.assertEqual(s["percent_used"], 1.2)
        self.assertEqual(s["alerts"], [])
        self.assertEqual(len(s["recent_transactions"]), 1)

        # 10. Push Food over budget: 7,000 + 147,000 = 154,000
        self.client.post("/api/expenses", json={
            "amount": 147000, "expense_date": TODAY.isoformat(), "category_id": food, "note": "Groceries"})
        s = self.client.get("/api/analytics/summary", query_string=PERIOD).get_json()
        messages = [a["message"] for a in s["alerts"]]
        self.assertIn("Warning: Your Food budget has been exceeded by ₩4,000.", messages)

        # 9. Chart endpoints reflect stored data
        cats = self.client.get("/api/analytics/categories", query_string=PERIOD).get_json()["categories"]
        food_row = next(c for c in cats if c["category_name"] == "Food")
        self.assertEqual(food_row["spent"], 154000)
        self.assertEqual(food_row["status"], "over")
        trend = self.client.get("/api/analytics/monthly", query_string=PERIOD).get_json()["months"]
        self.assertEqual(len(trend), 6)
        self.assertEqual(trend[-1]["total"], 154000)

        # Edit and delete update the numbers too
        r = self.client.put(f"/api/expenses/{lunch_id}", json={
            "amount": 3000, "expense_date": TODAY.isoformat(), "category_id": food, "note": "Lunch"})
        self.assertEqual(r.status_code, 200)
        s = self.client.get("/api/analytics/summary", query_string=PERIOD).get_json()
        self.assertEqual(s["total_spent"], 150000)
        self.assertEqual(self.client.delete(f"/api/expenses/{lunch_id}").status_code, 200)
        s = self.client.get("/api/analytics/summary", query_string=PERIOD).get_json()
        self.assertEqual(s["total_spent"], 147000)

        # Search / filter
        r = self.client.get("/api/expenses", query_string={"search": "groc"}).get_json()
        self.assertEqual(r["count"], 1)
        r = self.client.get("/api/expenses", query_string={"category_id": self.category_id("Study")}).get_json()
        self.assertEqual(r["count"], 0)

        # Budgets endpoint and CSV export
        b = self.client.get("/api/budgets", query_string=PERIOD).get_json()
        self.assertEqual(b["overall"]["amount"], 600000)
        self.assertEqual(len(b["categories"]), 1)
        csv = self.client.get("/api/reports/export", query_string=PERIOD)
        self.assertEqual(csv.status_code, 200)
        self.assertIn("Groceries", csv.get_data(as_text=True))

    def test_validation(self):
        r = self.client.post("/api/register", json={"full_name": "A", "email": "bad", "password": "short"})
        self.assertEqual(r.status_code, 400)
        self.register()
        self.assertEqual(self.register().status_code, 409)  # duplicate email
        r = self.client.post("/api/expenses", json={"amount": -5, "expense_date": "nope", "category_id": 999})
        self.assertEqual(r.status_code, 400)
        self.assertEqual(set(r.get_json()["fields"]), {"amount", "expense_date", "category_id"})

    def test_search_and_date_filters(self):
        self.register()
        food = self.category_id("Food")
        for note in ("50% off pizza", "Bus_card", "Coffee"):
            self.client.post("/api/expenses", json={
                "amount": 1000, "expense_date": TODAY.isoformat(), "category_id": food, "note": note})
        count = lambda q: self.client.get("/api/expenses", query_string=q).get_json()["count"]
        self.assertEqual(count({"search": "%"}), 1)   # literal %, not "match everything"
        self.assertEqual(count({"search": "_"}), 1)
        self.assertEqual(count({"search": "food"}), 3)  # category name matches too
        r = self.client.get("/api/expenses", query_string={"start_date": "2026-05-02", "end_date": "2026-05-01"})
        self.assertEqual(r.status_code, 400)

    def test_users_cannot_see_each_other(self):
        self.register()
        food = self.category_id("Food")
        expense = self.client.post("/api/expenses", json={
            "amount": 5000, "expense_date": TODAY.isoformat(), "category_id": food}).get_json()["expense"]
        custom = self.client.post("/api/categories", json={"category_name": "Gym"}).get_json()["category"]

        other = self.app.test_client()
        self.register(other, email="jisoo@wsu.ac.kr")
        self.assertEqual(other.get("/api/expenses").get_json()["count"], 0)
        self.assertEqual(other.delete(f"/api/expenses/{expense['expense_id']}").status_code, 404)
        self.assertEqual(other.put(f"/api/expenses/{expense['expense_id']}", json={
            "amount": 1, "expense_date": TODAY.isoformat(), "category_id": food}).status_code, 404)
        names = [c["category_name"] for c in other.get("/api/categories").get_json()["categories"]]
        self.assertNotIn("Gym", names)
        r = other.post("/api/expenses", json={
            "amount": 1, "expense_date": TODAY.isoformat(), "category_id": custom["category_id"]})
        self.assertEqual(r.status_code, 400)

    def test_categories_and_demo(self):
        self.register()
        gym = self.client.post("/api/categories", json={"category_name": "Gym"}).get_json()["category"]
        self.assertEqual(self.client.post("/api/categories", json={"category_name": "gym"}).status_code, 409)
        self.client.post("/api/expenses", json={
            "amount": 30000, "expense_date": TODAY.isoformat(), "category_id": gym["category_id"]})
        r = self.client.delete(f"/api/categories/{gym['category_id']}").get_json()
        self.assertEqual(r["moved_expenses"], 1)
        self.assertEqual(self.client.post("/api/demo/seed").status_code, 409)  # has expenses already
        self.client.post("/api/demo/reset", json={"confirm": "DELETE"})
        self.assertEqual(self.client.post("/api/demo/seed").status_code, 201)
        s = self.client.get("/api/analytics/summary", query_string=PERIOD).get_json()
        self.assertGreater(s["total_spent"], 0)
        self.assertEqual(s["monthly_budget"], 600000)


if __name__ == "__main__":
    unittest.main()
