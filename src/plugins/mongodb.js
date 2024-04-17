import { MongoClient } from 'mongodb'

import { COLLECTION_NAME } from '~/src/api/forms/form-metadata-repository.js'
import { config } from '~/src/config/index.js'

/**
 * @satisfies {import('@hapi/hapi').Plugin<void>}
 */
export const mongodb = {
  name: 'mongodb',
  version: '1.0.0',
  async register(server) {
    const mongoUrl = config.get('mongoUri')
    const databaseName = config.get('mongoDatabase')

    server.logger.info('Setting up mongodb')

    // Create the mongodb client
    const client = await MongoClient.connect(mongoUrl, {
      retryWrites: false,
      readPreference: 'secondary',
      // @ts-expect-error Allow untyped server properties
      secureContext: server.secureContext || undefined
    })

    // Create the db instance
    const db = client.db(databaseName)
    await createIndexes(db)

    server.logger.info(`mongodb connected to ${databaseName}`)

    server.decorate('request', 'db', db)
  }
}

/**
 * Creates the indexes for the server
 * @param {import('mongodb').Db} db - the mongo database object
 */
async function createIndexes(db) {
  await db
    .collection(COLLECTION_NAME)
    .createIndex({ title: 1, linkIdentifier: 1 })
}
