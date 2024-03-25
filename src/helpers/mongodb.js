import { MongoClient } from 'mongodb'

import { config } from '~/src/config/index.js'

/**
 * @satisfies {import('@hapi/hapi').Plugin<void>}
 */
export const mongoPlugin = {
  name: 'mongodb',
  version: '1.0.0',
  async register(server) {
    const mongoOptions = {
      retryWrites: false,
      readPreference: 'secondary',
      ...(server.secureContext && { secureContext: server.secureContext })
    }

    const mongoUrl = config.get('mongoUri')
    const databaseName = config.get('mongoDatabase')

    server.logger.info('Setting up mongodb')

    const client = await MongoClient.connect(mongoUrl.toString(), mongoOptions)
    const db = client.db(databaseName)
    await createIndexes(db)

    server.logger.info(`mongodb connected to ${databaseName}`)

    server.decorate('server', 'mongoClient', () => client, { apply: true })
    server.decorate('server', 'db', () => db, { apply: true })
    server.decorate('request', 'db', () => db, { apply: true })
  }
}

/**
 * Creates the indexes for the server. Currently creates one on the entities collection.
 * @param {import('mongodb').Db} db - the mongo database object
 */
async function createIndexes(db) {
  await db.collection('entities').createIndex({ id: 1 })
}
