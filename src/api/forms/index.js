import { listForms, getForm, createForm } from '~/src/api/forms/service.js'

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
        },
        {
          method: 'GET',
          path: '/forms/{id}',
          async handler(request) {
            return getForm(request.params.id)
          }
        },
        {
          method: 'POST',
          path: '/forms',
          handler: async (request) => {
            const formConfiguration = await createForm(request.payload)

            return {
              id: formConfiguration.id
            }
          }
        }
      ])
    }
  }
}

/**
 * @typedef {import('@hapi/hapi').ServerRegisterPluginObject<void, void>} ServerRegisterPlugin
 */
