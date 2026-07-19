const express = require('express');
const path = require('path');

const { readTransactions, saveTransactions } = require('./src/data-store');
const { ensureDemoAccount } = require('./src/auth');
const authRoutes = require('./src/routes/auth-routes');
const transactionRoutes = require('./src/routes/transaction-routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api', transactionRoutes);

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ message: 'Không thể đọc hoặc ghi file dữ liệu.' });
});

async function initialiseApplication() {
  await ensureDemoAccount();

  // Migrates transactions created by the first version of the demo.
  const transactions = await readTransactions();
  const needsMigration = transactions.some((transaction) => !transaction.ownerId);
  if (needsMigration) {
    const migratedTransactions = transactions.map((transaction) => ({
      ...transaction,
      ownerId: transaction.ownerId || 'demo-student'
    }));
    await saveTransactions(migratedTransactions);
  }

  app.listen(PORT, () => {
    console.log(`Ứng dụng đang chạy tại http://localhost:${PORT}`);
    console.log('Tài khoản mẫu: sinhvien / sinhvien123');
  });
}

initialiseApplication().catch((error) => {
  console.error(error);
  process.exit(1);
});
