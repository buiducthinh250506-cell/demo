const $ = (selector) => document.querySelector(selector);

const TOKEN_KEY = 'student-money-token';
const CHART_COLORS = ['#5269e7', '#15a77a', '#f09b4a', '#e9656d', '#8b69d8', '#3ea7c7'];
const moneyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
});

let token = localStorage.getItem(TOKEN_KEY) || '';
let currentUser = null;
let transactions = [];
let categories = [];
let activeTransactionFilter = 'all';

function formatMoney(amount) {
  return moneyFormatter.format(amount);
}

function escapeHtml(text = '') {
  const characters = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' };
  return String(text).replace(/[&<>'"]/g, (character) => characters[character]);
}

function getLocalDate(date = new Date()) {
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localTime.toISOString().slice(0, 10);
}

function formatDate(date) {
  return new Intl.DateTimeFormat('vi-VN').format(new Date(`${date}T00:00:00`));
}

function setInitialDates() {
  const now = new Date();
  $('#date').value = getLocalDate();
  $('#fromDate').value = getLocalDate(new Date(now.getFullYear(), now.getMonth(), 1));
  $('#toDate').value = getLocalDate();
}

async function request(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (_) {
    throw new Error('Không thể kết nối API. Hãy chạy npm start và mở http://localhost:3000.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401 && token) signOut(false);

    throw new Error(
      errorData.message || 'Máy chủ không phản hồi API. Hãy chạy npm start và mở http://localhost:3000.'
    );
  }

  return response.status === 204 ? null : response.json();
}

function showAuthForm(formName) {
  const isLogin = formName === 'login';
  $('.auth-tab[data-auth="login"]').classList.toggle('active', isLogin);
  $('.auth-tab[data-auth="register"]').classList.toggle('active', !isLogin);
  $('#loginForm').classList.toggle('hidden', !isLogin);
  $('#registerForm').classList.toggle('hidden', isLogin);
}

function openDashboard(user) {
  currentUser = user;
  $('#authView').classList.add('hidden');
  $('#appView').classList.remove('hidden');
  $('#userName').textContent = user.fullName;
  $('#greetingName').textContent = user.fullName.split(' ').at(-1);
  $('#userInitial').textContent = user.fullName.trim().charAt(0).toUpperCase();
  loadDashboardData();
}

async function loadDashboardData() {
  try {
    [transactions, categories] = await Promise.all([
      request('/api/transactions'),
      request('/api/categories')
    ]);

    populateCategories();
    renderDashboard();
  } catch (error) {
    showToast(error.message, true);
  }
}

function getSelectedTransactionType() {
  return document.querySelector('input[name="type"]:checked').value;
}

function populateCategories(selectedId = '') {
  const type = getSelectedTransactionType();
  const categoryOptions = categories
    .filter((category) => category.type === type)
    .map((category) => `<option value="${category.id}">${escapeHtml(category.name)}</option>`)
    .join('');

  $('#categoryId').innerHTML = `
    <option value="">-- Chọn danh mục ${type === 'income' ? 'thu' : 'chi'} --</option>
    ${categoryOptions}
    <option value="other">Khác (tự nhập)</option>
  `;
  $('#categoryId').value = selectedId;
  toggleCustomCategory();
}

function toggleCustomCategory() {
  const isOtherCategory = $('#categoryId').value === 'other';
  $('#otherCategoryGroup').classList.toggle('hidden', !isOtherCategory);
  $('#customCategory').required = isOtherCategory;

  if (!isOtherCategory) $('#customCategory').value = '';
}

function getTransactionsInPeriod() {
  const period = $('#period').value;
  const today = getLocalDate();
  let from = '';
  let to = '';

  if (period === 'today') from = to = today;
  if (period === 'week') {
    from = getLocalDate(new Date(Date.now() - 6 * 86400000));
    to = today;
  }
  if (period === 'month') {
    const now = new Date();
    from = getLocalDate(new Date(now.getFullYear(), now.getMonth(), 1));
    to = today;
  }
  if (period === 'custom') {
    from = $('#fromDate').value;
    to = $('#toDate').value;
  }

  return transactions.filter((transaction) => {
    return (!from || transaction.date >= from) && (!to || transaction.date <= to);
  });
}

function renderDashboard() {
  const periodTransactions = getTransactionsInPeriod();
  const totalIncome = periodTransactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((total, transaction) => total + transaction.amount, 0);
  const totalExpense = periodTransactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((total, transaction) => total + transaction.amount, 0);

  $('#totalIncome').textContent = formatMoney(totalIncome);
  $('#totalExpense').textContent = formatMoney(totalExpense);
  $('#balance').textContent = formatMoney(totalIncome - totalExpense);

  renderCharts(periodTransactions);
  renderTransactionList(periodTransactions);
}

function groupExpenseByCategory(periodTransactions) {
  const expenses = periodTransactions.filter((transaction) => transaction.type === 'expense');
  const groups = expenses.reduce((result, transaction) => {
    if (!result[transaction.category]) {
      result[transaction.category] = { name: transaction.category, amount: 0 };
    }
    result[transaction.category].amount += transaction.amount;
    return result;
  }, {});

  return {
    expenseCount: expenses.length,
    groups: Object.values(groups).sort((first, second) => second.amount - first.amount)
  };
}

function renderCharts(periodTransactions) {
  const { expenseCount, groups } = groupExpenseByCategory(periodTransactions);
  const totalExpense = groups.reduce((total, group) => total + group.amount, 0);

  $('#expenseCount').textContent = `${expenseCount} giao dịch`;
  $('#donutTotal').textContent = formatMoney(totalExpense);

  if (!groups.length) {
    $('#donut').style.background = '#edf0f4';
    $('#donutLegend').innerHTML = '<p class="chart-empty">Chưa có khoản chi trong kỳ này.</p>';
    $('#barChart').innerHTML = '<p class="chart-empty">Chưa có dữ liệu để so sánh.</p>';
    return;
  }

  let percentageStart = 0;
  const donutSegments = groups.map((group, index) => {
    const percentageEnd = percentageStart + (group.amount / totalExpense) * 100;
    const segment = `${CHART_COLORS[index % CHART_COLORS.length]} ${percentageStart}% ${percentageEnd}%`;
    percentageStart = percentageEnd;
    return segment;
  });
  $('#donut').style.background = `conic-gradient(${donutSegments.join(',')})`;

  $('#donutLegend').innerHTML = groups.slice(0, 5).map((group, index) => {
    const percentage = Math.round((group.amount / totalExpense) * 100);
    return `<div><i style="background:${CHART_COLORS[index % CHART_COLORS.length]}"></i><span>${escapeHtml(group.name)}</span><b>${percentage}%</b></div>`;
  }).join('');

  const maximumAmount = groups[0].amount;
  $('#barChart').innerHTML = groups.map((group, index) => {
    const width = (group.amount / maximumAmount) * 100;
    return `<div class="bar-row"><div><span>${escapeHtml(group.name)}</span><b>${formatMoney(group.amount)}</b></div><div class="bar-track"><i style="width:${width}%;background:${CHART_COLORS[index % CHART_COLORS.length]}"></i></div></div>`;
  }).join('');
}

function renderTransactionList(periodTransactions) {
  const displayedTransactions = activeTransactionFilter === 'all'
    ? periodTransactions
    : periodTransactions.filter((transaction) => transaction.type === activeTransactionFilter);

  if (!displayedTransactions.length) {
    $('#transactionList').innerHTML = '<div class="empty"><div>◌</div>Chưa có giao dịch phù hợp</div>';
    return;
  }

  $('#transactionList').innerHTML = displayedTransactions.map((transaction) => `
    <article class="transaction ${transaction.type}">
      <div class="transaction-icon">${transaction.type === 'income' ? '↗' : '↙'}</div>
      <div class="transaction-main">
        <strong>${escapeHtml(transaction.category)}</strong>
        <small>${formatDate(transaction.date)}${transaction.note ? ` · ${escapeHtml(transaction.note)}` : ''}</small>
      </div>
      <div class="transaction-amount">${transaction.type === 'income' ? '+' : '−'}${formatMoney(transaction.amount)}</div>
      <div class="actions">
        <button class="icon-button" title="Sửa" onclick="editTransaction('${transaction.id}')">✎</button>
        <button class="icon-button delete" title="Xóa" onclick="deleteTransaction('${transaction.id}')">×</button>
      </div>
    </article>
  `).join('');
}

async function saveTransaction(event) {
  event.preventDefault();
  const id = $('#transactionId').value;
  const data = Object.fromEntries(new FormData(event.currentTarget));
  const url = id ? `/api/transactions/${id}` : '/api/transactions';
  const method = id ? 'PUT' : 'POST';

  try {
    const savedTransaction = await request(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    transactions = id
      ? transactions.map((transaction) => transaction.id === id ? savedTransaction : transaction)
      : [savedTransaction, ...transactions];

    resetTransactionForm();
    renderDashboard();
    showToast(id ? 'Đã cập nhật giao dịch.' : 'Đã lưu giao dịch mới.');
  } catch (error) {
    showToast(error.message, true);
  }
}

window.editTransaction = (id) => {
  const transaction = transactions.find((item) => item.id === id);
  if (!transaction) return;

  $('#transactionId').value = transaction.id;
  $(`#${transaction.type}`).checked = true;
  populateCategories(transaction.categoryId || 'other');
  if (!transaction.categoryId || transaction.categoryId === 'other') {
    $('#customCategory').value = transaction.category;
  }
  $('#amount').value = transaction.amount;
  $('#date').value = transaction.date;
  $('#note').value = transaction.note || '';
  $('#formTitle').textContent = 'Chỉnh sửa giao dịch';
  $('#submitText').textContent = 'Cập nhật giao dịch';
  $('#submitIcon').textContent = '✓';
  $('#cancelEdit').classList.remove('hidden');
  $('.form-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window.deleteTransaction = async (id) => {
  const transaction = transactions.find((item) => item.id === id);
  if (!transaction || !confirm(`Xóa giao dịch “${transaction.category}”?`)) return;

  try {
    await request(`/api/transactions/${id}`, { method: 'DELETE' });
    transactions = transactions.filter((item) => item.id !== id);
    resetTransactionForm();
    renderDashboard();
    showToast('Đã xóa giao dịch.');
  } catch (error) {
    showToast(error.message, true);
  }
};

function resetTransactionForm() {
  $('#transactionForm').reset();
  $('#transactionId').value = '';
  $('#income').checked = true;
  $('#date').value = getLocalDate();
  populateCategories();
  $('#formTitle').textContent = 'Thêm giao dịch';
  $('#submitText').textContent = 'Lưu giao dịch';
  $('#submitIcon').textContent = '+';
  $('#cancelEdit').classList.add('hidden');
}

async function handleLogin(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));

  try {
    const result = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    token = result.token;
    localStorage.setItem(TOKEN_KEY, token);
    openDashboard(result.user);
  } catch (error) {
    showToast(error.message, true);
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));

  try {
    const result = await request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    token = result.token;
    localStorage.setItem(TOKEN_KEY, token);
    openDashboard(result.user);
    showToast('Tạo tài khoản thành công.');
  } catch (error) {
    showToast(error.message, true);
  }
}

function signOut(showMessage = true) {
  token = '';
  currentUser = null;
  localStorage.removeItem(TOKEN_KEY);
  $('#appView').classList.add('hidden');
  $('#authView').classList.remove('hidden');
  showAuthForm('login');
  if (showMessage) showToast('Bạn đã đăng xuất.');
}

async function handleLogout() {
  try {
    await request('/api/auth/logout', { method: 'POST' });
  } catch (_) {
    // The local session must still be cleared if the server is unavailable.
  }
  signOut();
}

function showToast(message, isError = false) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.toggle('error', isError);
  toast.classList.add('show');

  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 3000);
}

function bindEvents() {
  $('.auth-tabs').addEventListener('click', (event) => {
    const tab = event.target.closest('[data-auth]');
    if (tab) showAuthForm(tab.dataset.auth);
  });

  $('#loginForm').addEventListener('submit', handleLogin);
  $('#registerForm').addEventListener('submit', handleRegister);
  $('#transactionForm').addEventListener('submit', saveTransaction);
  $('#cancelEdit').addEventListener('click', resetTransactionForm);
  $('#categoryId').addEventListener('change', toggleCustomCategory);
  $('#logoutButton').addEventListener('click', handleLogout);

  document.querySelectorAll('input[name="type"]').forEach((input) => {
    input.addEventListener('change', () => populateCategories());
  });
  document.querySelectorAll('.filter').forEach((button) => {
    button.addEventListener('click', () => {
      activeTransactionFilter = button.dataset.filter;
      document.querySelectorAll('.filter').forEach((item) => {
        item.classList.toggle('active', item === button);
      });
      renderDashboard();
    });
  });

  $('#period').addEventListener('change', () => {
    $('#customDates').classList.toggle('hidden', $('#period').value !== 'custom');
    renderDashboard();
  });
  $('#fromDate').addEventListener('change', renderDashboard);
  $('#toDate').addEventListener('change', renderDashboard);
}

async function restoreSession() {
  if (!token) return;

  try {
    const user = await request('/api/auth/me');
    openDashboard(user);
  } catch (_) {
    signOut(false);
  }
}

setInitialDates();
bindEvents();
restoreSession();
