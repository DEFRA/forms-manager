/**
 * @type {import('@babel/core').TransformOptions}
 */
module.exports = {
  browserslistEnv: 'node',
  presets: ['@babel/preset-env'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./'],
        alias: {
          '~': '.'
        }
      }
    ]
  ],
  env: {
    development: {
      sourceMaps: 'inline',
      retainLines: true
    }
  }
}
