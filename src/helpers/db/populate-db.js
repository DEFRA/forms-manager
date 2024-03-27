import { populateApi } from '~/src/helpers/db/populate-api.js'
import { createLogger } from '~/src/helpers/logging/logger.js'

const logger = createLogger()

/**
 * Populate the DB in this template on startup of the API.
 * This is an example to show developers an API with a DB, with data in it and endpoints that query the db.
 * @satisfies {ServerRegisterPlugin}
 */
export const populateDb = {
  plugin: {
    name: 'Populate Db',
    async register(server) {
      try {
        // @ts-expect-error Allow untyped server properties
        await populateApi(server.mongoClient, server.db)
      } catch (error) {
        logger.error(error)
      }
    }
  }
}

/**
 * @typedef {import('@hapi/hapi').ServerRegisterPluginObject<void, void>} ServerRegisterPlugin
 */
