import Boom from '@hapi/boom'
import { MongoServerError, ObjectId } from 'mongodb'

import { FormAlreadyExistsError } from '~/src/api/forms/errors.js'
import {
  buildAggregationPipeline,
  buildFilterConditions,
  buildFiltersFacet,
  processFilterResults
} from '~/src/api/forms/repositories/aggregation/form-metadata-aggregation.js'
import { createLogger } from '~/src/helpers/logging/logger.js'
import { METADATA_COLLECTION_NAME, db } from '~/src/mongo.js'

export const MAX_RESULTS = 100

const logger = createLogger()

/**
 * The default search options to pass to Mongo
 */
const defaultFilterOptions = {
  deleted: { $ne: true }
}

/**
 * Retrieves the list of documents from the database with pagination and sorting.
 * Applies ranking to the search results based on match type and sorts them accordingly.
 * @param {QueryOptions} options - Pagination, sorting, and filtering options.
 * @returns {Promise<{ documents: WithId<Partial<FormMetadataDocument>>[], totalItems: number, filters: FilterOptions }>}
 */
export async function list(options) {
  try {
    const {
      page = 1,
      perPage = MAX_RESULTS,
      sortBy = 'updatedAt',
      order = 'desc',
      title = '',
      author = '',
      organisations = [],
      status = []
    } = options

    const coll = /** @type {Collection<Partial<FormMetadataDocument>>} */ (
      db.collection(METADATA_COLLECTION_NAME)
    )

    const skip = (page - 1) * perPage

    const [filterResults] = /** @type {[FilterAggregationResult]} */ (
      await coll.aggregate([buildFiltersFacet()]).toArray()
    )

    const filters = processFilterResults(filterResults)

    const { pipeline, aggOptions } = buildAggregationPipeline(
      sortBy,
      order,
      title,
      author,
      organisations,
      status,
      defaultFilterOptions
    )

    pipeline.push({ $skip: skip }, { $limit: perPage })

    const [documents, totalItems] = await Promise.all([
      /** @type {Promise<WithId<Partial<FormMetadataDocument>>[]>} */ (
        coll.aggregate(pipeline, aggOptions).toArray()
      ),
      coll.countDocuments(
        buildFilterConditions(
          {
            title,
            author,
            organisations,
            status
          },
          defaultFilterOptions
        )
      )
    ])

    return { documents, totalItems, filters }
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
    const document = await coll.findOne({
      _id: new ObjectId(formId),
      ...defaultFilterOptions
    })

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
    const document = await coll.findOne({ slug, ...defaultFilterOptions })

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
 * @import { FormMetadataDocument, QueryOptions, FilterOptions } from '@defra/forms-model'
 * @import { ClientSession, Collection, UpdateFilter, WithId } from 'mongodb'
 * @import { PartialFormMetadataDocument } from '~/src/api/types.js'
 * @import { FilterAggregationResult } from '~/src/api/forms/repositories/aggregation/types.js'
 */
