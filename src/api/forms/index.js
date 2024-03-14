import { listForms } from '~/src/api/forms/service.js'

/**
 * @satisfies {ServerRegisterPlugin}
 */
export const forms = {
  plugin: {
    name: 'forms',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/forms',
          handler() {
            return listForms()
          }
        }
      ])
    }
  }
}

/**
 * @typedef {import('@hapi/hapi').ServerRegisterPluginObject<void, void>} ServerRegisterPlugin
 */
