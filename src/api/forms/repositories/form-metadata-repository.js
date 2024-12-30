import Boom from '@hapi/boom'
import { MongoServerError, ObjectId } from 'mongodb'

import { FormAlreadyExistsError } from '~/src/api/forms/errors.js'
import { removeById } from '~/src/api/forms/repositories/helpers.js'
import { createLogger } from '~/src/helpers/logging/logger.js'
import { escapeRegExp } from '~/src/helpers/string-utils.js'
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
 * Applies ranking to the search results based on match type and sorts them accordingly.
 * @param {QueryOptions} options - Pagination, sorting, and filtering options.
 * @returns {Promise<{ documents: WithId<Partial<FormMetadataDocument>>[], totalItems: number }>}
 */
export async function list(options) {
  try {
    const {
      page = 1,
      perPage = MAX_RESULTS,
      sortBy = 'updatedAt',
      order = 'desc',
      title = ''
    } = options

    const coll = /** @type {Collection<Partial<FormMetadataDocument>>} */ (
      db.collection(METADATA_COLLECTION_NAME)
    )

    const skip = (page - 1) * perPage

    const { pipeline, aggOptions } = buildAggregationPipeline(
      sortBy,
      order,
      title
    )

    pipeline.push({ $skip: skip }, { $limit: perPage })

    const [documents, totalItems] = await Promise.all([
      /** @type {Promise<WithId<Partial<FormMetadataDocument>>[]>} */ (
        coll.aggregate(pipeline, aggOptions).toArray()
      ),
      coll.countDocuments(buildFilterConditions(title))
    ])

    return { documents, totalItems }
  } catch (error) {
    logger.error(error, 'Error fetching documents')
    throw error
  }
}

/**
 * Builds the filter conditions for querying forms by title.
 * @param {string} title - The title to filter by.
 * @returns {object} The filter conditions for MongoDB query.
 */
function buildFilterConditions(title) {
  const conditions = {}

  if (title) {
    const regex = new RegExp(escapeRegExp(title), 'i')
    conditions.title = { $regex: regex }
  }

  return conditions
}

/**
 * Builds the aggregation pipeline and aggregation options for the query.
 * @param {string} sortBy - Field to sort by ('updatedAt' or 'title').
 * @param {string} order - Sort order ('asc' or 'desc').
 * @param {string} title - The title to filter by.
 * @returns {{ pipeline: object[], aggOptions: AggregateOptions }} The pipeline stages and aggregation options.
 */
function buildAggregationPipeline(sortBy, order, title) {
  const pipeline = []
  const filterConditions = buildFilterConditions(title)

  // Add $match stage if there are filter conditions
  if (Object.keys(filterConditions).length > 0) {
    pipeline.push({ $match: filterConditions })
  }

  addRankingStage(pipeline, title)

  addDateFieldStage(pipeline)

  const collation = addSortingStage(pipeline, sortBy, order)

  const aggOptions = collation ? { collation } : {}

  return { pipeline, aggOptions }
}

/**
 * Adds the ranking stage to the pipeline based on the title.
 * @param {object[]} pipeline - The aggregation pipeline stages.
 * @param {string} title - The title to filter by.
 */
function addRankingStage(pipeline, title) {
  if (title) {
    const searchTerm = title.trim()

    // Add 'matchScore' field to rank the documents
    pipeline.push({
      $addFields: {
        matchScore: {
          $switch: {
            branches: [
              // Rank 1: Exact whole title match (case-insensitive)
              {
                case: {
                  $eq: [{ $toLower: '$title' }, searchTerm.toLowerCase()]
                },
                then: 1
              },
              // Rank 2: Whole word match in the title (case-insensitive)
              {
                case: {
                  $regexMatch: {
                    input: '$title',
                    regex: `\\b${escapeRegExp(searchTerm)}\\b`,
                    options: 'i'
                  }
                },
                then: 2
              },
              // Rank 3: Partial substring match in the title (case-insensitive)
              {
                case: {
                  $regexMatch: {
                    input: '$title',
                    regex: escapeRegExp(searchTerm),
                    options: 'i'
                  }
                },
                then: 3
              }
            ],
            default: 4
          }
        }
      }
    })
  } else {
    pipeline.push({
      $addFields: {
        matchScore: 0
      }
    })
  }
}

/**
 * Adds the date field stage to the pipeline to extract date only from 'updatedAt'.
 * @param {object[]} pipeline - The aggregation pipeline stages.
 */
function addDateFieldStage(pipeline) {
  const dateFieldStage = {
    $addFields: {
      updatedDateOnly: {
        $dateToString: {
          format: '%Y-%m-%d',
          date: '$updatedAt',
          timezone: 'UTC'
        }
      }
    }
  }
  pipeline.push(dateFieldStage)
}

/**
 * Adds the sorting stage to the pipeline based on the sortBy parameter.
 * @param {object[]} pipeline - The aggregation pipeline stages.
 * @param {string} sortBy - Field to sort by ('updatedAt' or 'title').
 * @param {string} order - Sort order ('asc' or 'desc').
 * @returns {CollationOptions | null} The collation options if necessary.
 */
function addSortingStage(pipeline, sortBy, order) {
  const sortOrder = order === 'asc' ? 1 : -1
  const collation = { locale: 'en', strength: 1 }

  switch (sortBy) {
    case 'title':
      pipeline.push({
        $sort: {
          // Primary sort is title
          title: sortOrder,
          // Then newest first if titles tie
          updatedDateOnly: -1,
          // Then alphabetical (case-insensitive) on displayName
          'updatedBy.displayName': 1
        }
      })
      break

    case 'updatedAt':
      pipeline.push({
        $sort: {
          updatedDateOnly: sortOrder,
          'updatedBy.displayName': 1
        }
      })
      break

    default:
      pipeline.push({
        $sort: {
          updatedDateOnly: -1,
          'updatedBy.displayName': 1
        }
      })
      break
  }

  return collation
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
