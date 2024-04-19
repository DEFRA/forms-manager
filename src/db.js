import { MongoClient } from 'mongodb'

import { config } from '~/src/config/index.js'
import { secureContext } from '~/src/secure-context.js'

const mongoUrl = config.get('mongoUri')
const databaseName = config.get('mongoDatabase')

/**
 * @type {Db}
 */
export let db

export const COLLECTION_NAME = 'form-metadata'

/**
 * Prepare the database and establish a connection
 * @param {Server} server - the hapi server
 */
export async function prepareDb(server) {
  server.logger.info('Setting up mongodb')

  // Create the mongodb client
  const client = await MongoClient.connect(mongoUrl, {
    retryWrites: false,
    readPreference: 'secondary',
    secureContext
  })

  // Create the db instance
  db = client.db(databaseName)

  // Ensure db indexes
  await db
    .collection(COLLECTION_NAME)
    .createIndex({ title: 1, linkIdentifier: 1 })

  server.logger.info(`Mongodb connected to ${databaseName}`)

  return db
}

/**
 * @typedef {import('mongodb').Db} Db
 * @typedef {import('@hapi/hapi').Server} Server
 */
