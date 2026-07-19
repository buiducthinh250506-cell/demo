const fs = require('fs/promises');
const path = require('path');

const DATA_DIRECTORY = path.join(__dirname, '..', 'data');
const FILES = {
  users: path.join(DATA_DIRECTORY, 'users.json'),
  categories: path.join(DATA_DIRECTORY, 'categories.json'),
  transactions: path.join(DATA_DIRECTORY, 'transactions.json')
};

async function readJson(filePath, fallback = []) {
  try {
    const contents = await fs.readFile(filePath, 'utf8');
    return JSON.parse(contents);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;

    await fs.mkdir(DATA_DIRECTORY, { recursive: true });
    await writeJson(filePath, fallback);
    return fallback;
  }
}

function writeJson(filePath, data) {
  return fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

const readUsers = () => readJson(FILES.users);
const saveUsers = (users) => writeJson(FILES.users, users);

const readTransactions = () => readJson(FILES.transactions);
const saveTransactions = (transactions) => writeJson(FILES.transactions, transactions);

async function readActiveCategories() {
  const categories = await readJson(FILES.categories);
  return categories.filter((category) => category.active);
}

module.exports = {
  readUsers,
  saveUsers,
  readTransactions,
  saveTransactions,
  readActiveCategories
};
