// Thin wrapper around fetch for the Flask REST API.
// The session cookie is sent automatically because the API is same-origin (Vite proxy).

export class ApiError extends Error {
  constructor(message, status, fields = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

let unauthorizedHandler = null;
export function onUnauthorized(handler) {
  unauthorizedHandler = handler;
}

async function request(method, path, body, { query, skipAuthRedirect } = {}) {
  let url = `/api${path}`;
  if (query) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params.append(key, value);
    });
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  let response;
  try {
    response = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Cannot reach the server. Is the Flask backend running on port 5001?', 0);
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    // Non-JSON response (e.g. the Vite proxy could not reach Flask)
  }

  if (!response.ok) {
    if (response.status === 401 && !skipAuthRedirect && unauthorizedHandler) unauthorizedHandler();
    const message =
      data?.error ||
      (response.status >= 500
        ? 'The server is not responding. Make sure Flask and MySQL are running.'
        : `Request failed (${response.status}).`);
    throw new ApiError(message, response.status, data?.fields || {});
  }
  return data;
}

export const api = {
  // Auth
  register: (payload) => request('POST', '/register', payload, { skipAuthRedirect: true }),
  login: (payload) => request('POST', '/login', payload, { skipAuthRedirect: true }),
  logout: () => request('POST', '/logout'),
  me: () => request('GET', '/me', null, { skipAuthRedirect: true }),
  updateProfile: (payload) => request('PUT', '/me', payload),
  changePassword: (payload) => request('PUT', '/me/password', payload),

  // Expenses
  listExpenses: (filters) => request('GET', '/expenses', null, { query: filters }),
  createExpense: (payload) => request('POST', '/expenses', payload),
  updateExpense: (id, payload) => request('PUT', `/expenses/${id}`, payload),
  deleteExpense: (id) => request('DELETE', `/expenses/${id}`),

  // Categories
  listCategories: () => request('GET', '/categories'),
  createCategory: (payload) => request('POST', '/categories', payload),
  deleteCategory: (id) => request('DELETE', `/categories/${id}`),

  // Budgets
  listBudgets: (period) => request('GET', '/budgets', null, { query: period }),
  saveBudget: (payload) => request('POST', '/budgets', payload),
  updateBudget: (id, payload) => request('PUT', `/budgets/${id}`, payload),
  deleteBudget: (id) => request('DELETE', `/budgets/${id}`),
  copyPreviousBudgets: (period) => request('POST', '/budgets/copy-previous', period),

  // Analytics
  summary: (period) => request('GET', '/analytics/summary', null, { query: period }),
  categoryAnalytics: (period) => request('GET', '/analytics/categories', null, { query: period }),
  monthly: (period, months = 6) =>
    request('GET', '/analytics/monthly', null, { query: { ...period, months } }),

  // Demo mode (Settings page)
  seedDemo: () => request('POST', '/demo/seed'),
  resetData: (confirm) => request('POST', '/demo/reset', { confirm }),
};

export function reportCsvUrl({ month, year }) {
  return `/api/reports/export?month=${month}&year=${year}`;
}
