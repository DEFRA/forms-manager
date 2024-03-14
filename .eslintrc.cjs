/**
 * @type {import('eslint').ESLint.ConfigData}
 */
module.exports = {
  ignorePatterns: ['.server', 'src/__fixtures__', 'coverage'],
  overrides: [
    {
      extends: ['standard', 'prettier', 'plugin:jsdoc/recommended'],
      files: ['**/*.{cjs,js,mjs}'],
      parserOptions: {
        ecmaVersion: 'latest'
      },
      plugins: ['prettier', 'jsdoc'],
      rules: {
        'prettier/prettier': 'error',
        'no-console': 'error'
      }
    },
    {
      files: ['**/*.{js,mjs}'],
      parserOptions: {
        sourceType: 'module'
      }
    },
    {
      env: {
        jest: true
      },
      files: ['**/*.test.{cjs,js,mjs}']
    }
  ],
  root: true
}
