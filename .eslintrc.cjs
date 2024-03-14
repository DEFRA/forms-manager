/**
 * @type {import('eslint').ESLint.ConfigData}
 */
module.exports = {
  ignorePatterns: ['.server', 'src/__fixtures__', 'coverage'],
  overrides: [
    {
      extends: [
        'standard',
        'prettier',
        'plugin:jsdoc/recommended-typescript-flavor'
      ],
      files: ['**/*.{cjs,js,mjs}'],
      parserOptions: {
        ecmaVersion: 'latest'
      },
      plugins: ['prettier', 'jsdoc'],
      rules: {
        'prettier/prettier': 'error',
        'no-console': 'error',

        // Check for valid formatting
        'jsdoc/check-line-alignment': [
          'warn',
          'never',
          {
            tags: ['param', 'property', 'typedef', 'returns']
          }
        ],

        // Require hyphens before param description
        // Aligns with TSDoc style: https://tsdoc.org/pages/tags/param/
        'jsdoc/require-hyphen-before-param-description': [
          'warn',
          'always',
          {
            tags: {
              param: 'always',
              property: 'always',
              returns: 'always'
            }
          }
        ],

        // JSDoc blocks are mandatory for classes and methods
        'jsdoc/require-jsdoc': [
          'error',
          {
            enableFixer: false,
            require: {
              ClassDeclaration: true,
              ClassExpression: true,
              FunctionExpression: false,
              MethodDefinition: true
            }
          }
        ],

        // JSDoc @param description is optional
        'jsdoc/require-param-description': 'off',
        'jsdoc/require-param': 'error',

        // JSDoc @returns description is optional
        'jsdoc/require-returns-description': 'off',
        'jsdoc/require-returns-type': 'off',
        'jsdoc/require-returns': 'off'
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
