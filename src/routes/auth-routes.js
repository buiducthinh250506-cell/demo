const crypto = require('crypto');
const express = require('express');

const {
  readUsers,
  saveUsers
} = require('../data-store');
const {
  hashPassword,
  isValidPassword,
  getPublicUser,
  createSession,
  removeSession,
  getToken,
  requireAuth,
  validateRegistration
} = require('../auth');

const router = express.Router();

router.post('/register', async (request, response, next) => {
  try {
    const validationError = validateRegistration(request.body);
    if (validationError) return response.status(400).json({ message: validationError });

    const users = await readUsers();
    const username = request.body.username.trim();
    const email = request.body.email.trim().toLowerCase();
    const usernameTaken = users.some(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );
    const emailTaken = users.some((user) => user.email === email);

    if (usernameTaken) return response.status(409).json({ message: 'Tên đăng nhập đã tồn tại.' });
    if (emailTaken) return response.status(409).json({ message: 'Email này đã được đăng ký.' });

    const user = {
      id: crypto.randomUUID(),
      username,
      fullName: request.body.fullName.trim(),
      email,
      ...await hashPassword(request.body.password),
      createdAt: new Date().toISOString()
    };

    users.push(user);
    await saveUsers(users);

    response.status(201).json({ token: createSession(user.id), user: getPublicUser(user) });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (request, response, next) => {
  try {
    const identity = String(request.body.identity || '').trim().toLowerCase();
    const password = String(request.body.password || '');
    const users = await readUsers();
    const user = users.find(
      (item) => item.username.toLowerCase() === identity || item.email === identity
    );

    if (!user || !(await isValidPassword(password, user))) {
      return response.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu.' });
    }

    response.json({ token: createSession(user.id), user: getPublicUser(user) });
  } catch (error) {
    next(error);
  }
});

router.get('/me', requireAuth, async (request, response, next) => {
  try {
    const user = (await readUsers()).find((item) => item.id === request.userId);
    if (!user) return response.status(401).json({ message: 'Không tìm thấy tài khoản.' });

    response.json(getPublicUser(user));
  } catch (error) {
    next(error);
  }
});

router.post('/logout', requireAuth, (request, response) => {
  removeSession(getToken(request));
  response.status(204).end();
});

module.exports = router;
