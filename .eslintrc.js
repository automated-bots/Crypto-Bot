module.exports = {
  env: {
    es6: true,
    node: true,
    mocha: true
  },
  extends: [
    'standard'
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
    TelegramSecretHash: 'writable'
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  rules: {
    'object-shorthand': 0,
    'no-return-assign': 'off' // Allow assignment operator in return statement
  }
}
