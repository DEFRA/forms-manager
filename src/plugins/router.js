import routes from '~/src/routes/index.js'

/**
 * @satisfies {ServerRegisterPlugin}
 */
export const router = {
  plugin: {
    name: 'router',
    register(server) {
      server.route(routes)
    }
  }
}

/**
 * @typedef {import('@hapi/hapi').ServerRegisterPluginObject<void, void>} ServerRegisterPlugin
 */
