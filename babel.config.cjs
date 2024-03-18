const { NODE_ENV } = process.env

/**
 * @type {import('@babel/core').TransformOptions}
 */
module.exports = {
  browserslistEnv: 'node',
  presets: [
    [
      '@babel/preset-env',
      {
        modules: NODE_ENV === 'test' ? 'auto' : false
      }
    ]
  ],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./'],
        alias: {
          '~': '.'
        }
      }
    ],
    ['babel-plugin-transform-import-meta', { module: 'ES6' }]
  ],
  env: {
    development: {
      sourceMaps: 'inline',
      retainLines: true
    }
  }
}
