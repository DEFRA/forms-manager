import Boom from '@hapi/boom'
import { MongoServerError, ObjectId } from 'mongodb'

import { FormAlreadyExistsError } from '~/src/api/forms/errors.js'
import { removeById } from '~/src/api/forms/repositories/helpers.js'
import { createLogger } from '~/src/helpers/logging/logger.js'
import { METADATA_COLLECTION_NAME, db } from '~/src/mongo.js'

export const MAX_RESULTS = 100

const logger = createLogger()

/**
 * Retrieves the list of documents from the database
 */
export async function listAll() {
  const coll = /** @type {Collection<Partial<FormMetadataDocument>>} */ (
    db.collection(METADATA_COLLECTION_NAME)
  )

  return coll
    .find()
    .sort({
      updatedAt: -1
    })
    .limit(MAX_RESULTS)
    .toArray()
}

/**
 * Retrieves the list of documents from the database with pagination and sorting.
 * @param {QueryOptions} options - Pagination and sorting options
 * @returns {Promise<{ documents: WithId<Partial<FormMetadataDocument>>[], totalItems: number }>}
 */
export async function list(options) {
  try {
    const {
      page = 1,
      perPage = MAX_RESULTS,
      sortBy = 'updatedAt',
      order = 'desc'
    } = options

    const coll =
      /** @type {Collection<WithId<Partial<FormMetadataDocument>>>} */ (
        db.collection(METADATA_COLLECTION_NAME)
      )

    const skip = (page - 1) * perPage

    const pipeline = []

    /** @type {CollationOptions | null} */
    let collation = null

    switch (sortBy) {
      case 'updatedAt':
        pipeline.push(
          {
            $addFields: {
              updatedDateOnly: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$updatedAt',
                  timezone: 'UTC'
                }
              }
            }
          },
          {
            $sort: {
              updatedDateOnly: order === 'asc' ? 1 : -1, // Primary sort
              'updatedBy.displayName': 1 // Secondary sort
            }
          }
        )
        break

      case 'title':
        /**
         * Case-insensitive, diacritic-insensitive collation
         * @see https://www.mongodb.com/docs/drivers/node/current/fundamentals/collations/
         */
        collation = {
          locale: 'en',
          strength: 1
        }
        pipeline.push({
          $sort: {
            title: order === 'asc' ? 1 : -1
          }
        })
        break

      default:
        pipeline.push(
          {
            $addFields: {
              updatedDateOnly: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$updatedAt',
                  timezone: 'UTC'
                }
              }
            }
          },
          {
            $sort: {
              updatedDateOnly: -1,
              'updatedBy.displayName': 1
            }
          }
        )
        break
    }

    pipeline.push({ $skip: skip }, { $limit: perPage })

    /** @type {AggregateOptions} */
    const aggOptions = {}
    if (collation) {
      aggOptions.collation = collation
    }

    const [documents, totalItems] = await Promise.all([
      /** @type {Promise<WithId<Partial<FormMetadataDocument>>[]>} */ (
        coll.aggregate(pipeline, aggOptions).toArray()
      ),
      coll.countDocuments()
    ])

    return { documents, totalItems }
  } catch (error) {
    logger.error(error, 'Error fetching documents')
    throw error
  }
}

/**
 * Retrieves a form metadata by ID
 * @param {string} formId - ID of the form
 */
export async function get(formId) {
  logger.info(`Getting form with ID ${formId}`)

  const coll = /** @satisfies {Collection<Partial<FormMetadataDocument>>} */ (
    db.collection(METADATA_COLLECTION_NAME)
  )

  try {
    const document = await coll.findOne({ _id: new ObjectId(formId) })

    if (!document) {
      throw Boom.notFound(`Form with ID '${formId}' not found`)
    }

    logger.info(`Form with ID ${formId} found`)

    return document
  } catch (error) {
    logger.error(error, `Getting form with ID ${formId} failed`)

    if (error instanceof Error && !Boom.isBoom(error)) {
      throw Boom.badRequest(error)
    }

    throw error
  }
}

/**
 * Retrieves a form metadata by slug
 * @param {string} slug - The slug of the form
 */
export async function getBySlug(slug) {
  logger.info(`Getting form with slug ${slug}`)

  const coll = /** @satisfies {Collection<FormMetadataDocument>} */ (
    db.collection(METADATA_COLLECTION_NAME)
  )

  try {
    const document = await coll.findOne({ slug })

    if (!document) {
      throw Boom.notFound(`Form with slug '${slug}' not found`)
    }

    logger.info(`Form with slug ${slug} found`)

    return document
  } catch (error) {
    logger.error(error, `Getting form with slug ${slug} failed`)

    if (error instanceof Error && !Boom.isBoom(error)) {
      throw Boom.internal(error)
    }

    throw error
  }
}

/**
 * Create a document in the database
 * @param {FormMetadataDocument} document - form metadata document
 * @param {ClientSession} session - mongo transaction session
 */
export async function create(document, session) {
  logger.info(`Creating form with slug ${document.slug}`)

  const coll = /** @satisfies {Collection<FormMetadataDocument>} */ (
    db.collection(METADATA_COLLECTION_NAME)
  )

  try {
    const result = await coll.insertOne(document, { session })
    const formId = result.insertedId.toString()

    logger.info(`Form with slug ${document.slug} created as form ID ${formId}`)

    return result
  } catch (cause) {
    const message = `Creating form with slug ${document.slug} failed`

    if (cause instanceof MongoServerError && cause.code === 11000) {
      const error = new FormAlreadyExistsError(document.slug, { cause })

      logger.error(error, message)
      throw Boom.badRequest(error)
    }

    logger.error(cause, message)
    throw cause
  }
}

/**
 * Update a document in the database
 * @param {string} formId - ID of the form
 * @param {UpdateFilter<PartialFormMetadataDocument>} update - form metadata document update filter
 * @param {ClientSession} [session] - mongo transaction session
 */
export async function update(formId, update, session) {
  logger.info(`Updating form with ID ${formId}`)

  const coll = /** @satisfies {Collection<PartialFormMetadataDocument>} */ (
    db.collection(METADATA_COLLECTION_NAME)
  )

  try {
    const result = await coll.updateOne({ _id: new ObjectId(formId) }, update, {
      session
    })

    // Throw if updated record count is not 1
    if (result.modifiedCount !== 1) {
      throw Boom.badRequest(
        `Form with ID ${formId} not updated. Modified count ${result.modifiedCount}`
      )
    }

    logger.info(`Form with ID ${formId} updated`)

    return result
  } catch (error) {
    logger.error(error, `Updating form with ID ${formId} failed`)

    if (error instanceof Error && !Boom.isBoom(error)) {
      throw Boom.internal(error)
    }

    throw error
  }
}

/**
 * Removes a form metadata
 * @param {string} formId - ID of the form
 * @param {ClientSession} session
 */
export async function remove(formId, session) {
  logger.info(`Removing form metadata with ID ${formId}`)

  await removeById(session, METADATA_COLLECTION_NAME, formId)

  logger.info(`Removed form metadata with ID ${formId}`)
}

/**
 * @import { FormMetadataDocument, QueryOptions } from '@defra/forms-model'
 * @import { ClientSession, Collection, UpdateFilter, WithId, AggregateOptions, CollationOptions } from 'mongodb'
 * @import { PartialFormMetadataDocument } from '~/src/api/types.js'
 */
