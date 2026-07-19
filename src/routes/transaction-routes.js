const crypto = require('crypto');
const express = require('express');

const {
  readTransactions,
  saveTransactions,
  readActiveCategories
} = require('../data-store');
const { requireAuth } = require('../auth');
const { validateTransaction, buildTransaction } = require('../transactions');

const router = express.Router();

router.get('/categories', requireAuth, async (_request, response, next) => {
  try {
    const categories = await readActiveCategories();
    categories.sort((a, b) => a.type.localeCompare(b.type) || a.sortOrder - b.sortOrder);
    response.json(categories);
  } catch (error) {
    next(error);
  }
});

router.get('/transactions', requireAuth, async (request, response, next) => {
  try {
    const transactions = await readTransactions();
    const userTransactions = transactions
      .filter((transaction) => transaction.ownerId === request.userId)
      .sort((a, b) => b.date.localeCompare(a.date));

    response.json(userTransactions);
  } catch (error) {
    next(error);
  }
});

router.post('/transactions', requireAuth, async (request, response, next) => {
  try {
    const validationError = await validateTransaction(request.body);
    if (validationError) return response.status(400).json({ message: validationError });

    const transactions = await readTransactions();
    const transaction = {
      id: crypto.randomUUID(),
      ...await buildTransaction(request.body, request.userId),
      createdAt: new Date().toISOString()
    };

    transactions.push(transaction);
    await saveTransactions(transactions);
    response.status(201).json(transaction);
  } catch (error) {
    next(error);
  }
});

router.put('/transactions/:id', requireAuth, async (request, response, next) => {
  try {
    const validationError = await validateTransaction(request.body);
    if (validationError) return response.status(400).json({ message: validationError });

    const transactions = await readTransactions();
    const index = transactions.findIndex(
      (transaction) => transaction.id === request.params.id && transaction.ownerId === request.userId
    );
    if (index === -1) return response.status(404).json({ message: 'Không tìm thấy giao dịch.' });

    transactions[index] = {
      id: request.params.id,
      createdAt: transactions[index].createdAt,
      ...await buildTransaction(request.body, request.userId)
    };
    await saveTransactions(transactions);

    response.json(transactions[index]);
  } catch (error) {
    next(error);
  }
});

router.delete('/transactions/:id', requireAuth, async (request, response, next) => {
  try {
    const transactions = await readTransactions();
    const remainingTransactions = transactions.filter(
      (transaction) => transaction.id !== request.params.id || transaction.ownerId !== request.userId
    );

    if (remainingTransactions.length === transactions.length) {
      return response.status(404).json({ message: 'Không tìm thấy giao dịch.' });
    }

    await saveTransactions(remainingTransactions);
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
