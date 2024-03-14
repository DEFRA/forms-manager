module.exports = {
  env: {
    es2022: true,
    node: true,
    jest: true
  },
  extends: ['standard', 'prettier', 'plugin:jsdoc/recommended'],
  overrides: [],
  parserOptions: {
    ecmaVersion: 'latest'
  },
  plugins: ['prettier', 'jsdoc'],
  rules: {
    'prettier/prettier': 'error',
    'no-console': 'error'
  },
  ignorePatterns: ['.server', 'src/__fixtures__', 'coverage']
}
