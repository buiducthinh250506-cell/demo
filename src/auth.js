const crypto = require('crypto');

const { readUsers, saveUsers } = require('./data-store');

const sessions = new Map();

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, key) => {
      if (error) return reject(error);

      resolve({
        passwordHash: key.toString('hex'),
        passwordSalt: salt
      });
    });
  });
}

async function isValidPassword(password, user) {
  const { passwordHash } = await hashPassword(password, user.passwordSalt);
  return crypto.timingSafeEqual(
    Buffer.from(passwordHash, 'hex'),
    Buffer.from(user.passwordHash, 'hex')
  );
}

function getPublicUser(user) {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    email: user.email
  };
}

function createSession(userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  sessions.set(token, userId);
  return token;
}

function removeSession(token) {
  sessions.delete(token);
}

function getToken(request) {
  return request.headers.authorization?.replace(/^Bearer\s+/i, '');
}

function requireAuth(request, response, next) {
  const token = getToken(request);
  const userId = token && sessions.get(token);

  if (!userId) {
    return response.status(401).json({
      message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
    });
  }

  request.userId = userId;
  next();
}

function validateRegistration(data) {
  const username = String(data.username || '').trim();
  const fullName = String(data.fullName || '').trim();
  const email = String(data.email || '').trim().toLowerCase();
  const password = String(data.password || '');

  if (!/^[a-zA-Z0-9_]{4,30}$/.test(username)) {
    return 'Tên đăng nhập gồm 4–30 ký tự chữ, số hoặc dấu gạch dưới.';
  }
  if (fullName.length < 2 || fullName.length > 60) {
    return 'Họ tên phải có từ 2 đến 60 ký tự.';
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) return 'Email không hợp lệ.';
  if (password.length < 6) return 'Mật khẩu phải có ít nhất 6 ký tự.';

  return null;
}

async function ensureDemoAccount() {
  const users = await readUsers();
  const demoUserExists = users.some((user) => user.id === 'demo-student');

  if (demoUserExists) return;

  const password = await hashPassword('sinhvien123');
  users.push({
    id: 'demo-student',
    username: 'sinhvien',
    fullName: 'Sinh viên Demo',
    email: 'sinhvien@example.com',
    ...password,
    createdAt: new Date().toISOString()
  });
  await saveUsers(users);
}

module.exports = {
  hashPassword,
  isValidPassword,
  getPublicUser,
  createSession,
  removeSession,
  getToken,
  requireAuth,
  validateRegistration,
  ensureDemoAccount
};
