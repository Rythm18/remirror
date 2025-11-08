// Jest configuration for document-diff extension
module.exports = {
  clearMocks: true,
  verbose: true,
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'mjs'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx|mjs)$': ['@swc/jest'],
  },
  testRegex: '/__tests__/.*\\.spec\\.tsx?$',
  moduleDirectories: ['node_modules', '<rootDir>/../../node_modules'],
};
