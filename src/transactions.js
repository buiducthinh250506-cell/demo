const { readActiveCategories } = require('./data-store');

async function validateTransaction(data) {
  const { type, categoryId, customCategory, amount, date } = data;

  if (!['income', 'expense'].includes(type)) {
    return 'Loại giao dịch phải là thu hoặc chi.';
  }
  if (!categoryId) return 'Vui lòng chọn danh mục.';

  if (categoryId === 'other') {
    const customName = String(customCategory || '').trim();
    if (!customName || customName.length > 60) {
      return 'Danh mục khác phải có từ 1 đến 60 ký tự.';
    }
  } else {
    const categories = await readActiveCategories();
    const categoryExists = categories.some(
      (category) => category.id === categoryId && category.type === type
    );
    if (!categoryExists) return 'Danh mục không hợp lệ.';
  }

  if (!Number.isInteger(Number(amount)) || Number(amount) <= 0) {
    return 'Số tiền phải là số nguyên lớn hơn 0.';
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date)) || Number.isNaN(Date.parse(date))) {
    return 'Ngày giao dịch không hợp lệ.';
  }
  if (String(data.note || '').length > 160) {
    return 'Ghi chú không được vượt quá 160 ký tự.';
  }

  return null;
}

async function buildTransaction(data, ownerId) {
  const categories = await readActiveCategories();
  const selectedCategory = categories.find((category) => category.id === data.categoryId);
  const categoryName = data.categoryId === 'other'
    ? String(data.customCategory).trim()
    : selectedCategory.name;

  return {
    ownerId,
    type: data.type,
    categoryId: data.categoryId,
    category: categoryName,
    amount: Number(data.amount),
    date: data.date,
    note: String(data.note || '').trim()
  };
}

module.exports = { validateTransaction, buildTransaction };
