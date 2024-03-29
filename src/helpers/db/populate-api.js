import { fetchEntities } from '~/src/helpers/db/fetch-entities.js'
import { createLogger } from '~/src/helpers/logging/logger.js'

const logger = createLogger()

/**
 * Populate the database with data from the API.
 * @param {import('mongodb').MongoClient} mongo - The MongoClient
 * @param {import('mongodb').Db} db - the database from MongoClient.db(..)
 */
export async function populateApi(mongo, db) {
  const entitiesCollection = db.collection('entities')

  try {
    const entities = await fetchEntities()

    const session = mongo.startSession()
    session.startTransaction()

    if (entities.length) {
      await entitiesCollection.deleteMany({})
      await entitiesCollection.insertMany(entities)
      logger.info(`Updated ${entities.length} entities`)
    }

    await session.commitTransaction()
    logger.info('Completed data population')
  } catch (error) {
    logger.error(error)
  }
}
