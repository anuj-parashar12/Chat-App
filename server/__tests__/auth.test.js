const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');

jest.mock('../src/services/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
}));

// SAFETY: tests call dropDatabase(), so never connect to a non-test database.
// Force a *_test database name regardless of the configured MONGODB_URI, and
// refuse to run against anything that doesn't look like a test DB.
const resolveTestUri = () => {
  const raw = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexchat_test';
  // Replace the database segment (between the last '/' and any '?') with nexchat_test
  const testUri = raw.replace(/\/([^/?]*)(\?|$)/, '/nexchat_test$2');
  return testUri;
};

beforeAll(async () => {
  const uri = resolveTestUri();
  await mongoose.connect(uri);
  const dbName = mongoose.connection.name;
  if (!/test/i.test(dbName)) {
    throw new Error(`Refusing to run tests against non-test database "${dbName}". Tests drop the DB.`);
  }
});

afterAll(async () => {
  if (/test/i.test(mongoose.connection.name)) {
    await mongoose.connection.dropDatabase();
  }
  await mongoose.connection.close();
});

afterEach(async () => {
  await User.deleteMany({});
});

describe('POST /api/auth/register', () => {
  it('registers a new user', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123!',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('rejects duplicate email', async () => {
    await User.create({ username: 'user1', email: 'dup@example.com', password: 'Password123!' });
    const res = await request(app).post('/api/auth/register').send({
      username: 'user2',
      email: 'dup@example.com',
      password: 'Password123!',
    });
    expect(res.status).toBe(409);
  });

  it('validates weak password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'testuser',
      email: 'test@example.com',
      password: '123',
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('rejects unverified user', async () => {
    await User.create({ username: 'user1', email: 'login@example.com', password: 'Password123!', isEmailVerified: false });
    const res = await request(app).post('/api/auth/login').send({
      email: 'login@example.com',
      password: 'Password123!',
    });
    expect(res.status).toBe(401);
  });
});
