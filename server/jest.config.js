module.exports = {
  testEnvironment: 'node',
  testRegex: '.*\\.test\\.js$',
  testPathIgnorePatterns: ['/node_modules/'],
  collectCoverageFrom: ['src/**/*.js', '!src/index.js'],
  coverageThreshold: {
    global: { branches: 8, functions: 8, lines: 30 },
  },
  testTimeout: 15000,
};
