const pkg = require('./package.json')

/**
 * @type {import('eslint').ESLint.ConfigData}
 */
module.exports = {
  ignorePatterns: ['.server', 'src/__fixtures__', 'coverage', '.eslintrc.cjs'],
  overrides: [
    {
      extends: [
        'standard',
        'eslint:recommended',
        'plugin:import/recommended',
        'plugin:jsdoc/recommended-typescript-flavor',
        'plugin:n/recommended',
        'plugin:prettier/recommended',
        'plugin:promise/recommended',
        'plugin:@typescript-eslint/strict-type-checked',
        'plugin:@typescript-eslint/stylistic-type-checked',
        'prettier'
      ],
      files: ['**/*.{cjs,js,mjs}'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 'latest',
        project: true,
        tsconfigRootDir: __dirname
      },
      plugins: [
        '@typescript-eslint',
        'import',
        'jsdoc',
        'n',
        'prettier',
        'promise'
      ],
      rules: {
        'prettier/prettier': 'error',
        'no-console': 'error',

        // Only show warnings for missing types
        '@typescript-eslint/no-unsafe-argument': 'warn',
        '@typescript-eslint/no-unsafe-assignment': 'warn',
        '@typescript-eslint/no-unsafe-call': 'warn',
        '@typescript-eslint/no-unsafe-member-access': 'warn',
        '@typescript-eslint/no-unsafe-return': 'warn',

        // Check import or require statements are A-Z ordered
        'import/order': [
          'error',
          {
            alphabetize: { order: 'asc' },
            'newlines-between': 'always'
          }
        ],

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
        'jsdoc/require-returns': 'off',

        // Skip rules handled by import plugin
        'n/no-extraneous-require': 'off',
        'n/no-extraneous-import': 'off',
        'n/no-missing-require': 'off',
        'n/no-missing-import': 'off'
      },
      settings: {
        'import/resolver': {
          typescript: {
            alwaysTryTypes: true,
            project: ['./tsconfig.json']
          }
        }
      }
    },
    {
      files: ['**/*.{js,mjs}'],
      parserOptions: {
        sourceType: 'module'
      },
      rules: {
        'import/extensions': [
          'error',
          'always',
          {
            ignorePackages: true,
            pattern: {
              cjs: 'always',
              js: 'always',
              mjs: 'always'
            }
          }
        ]
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
