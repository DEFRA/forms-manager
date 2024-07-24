import Boom from '@hapi/boom'
import { MongoServerError, ObjectId } from 'mongodb'

import { FormAlreadyExistsError } from '../errors.js'

import { removeById } from './helpers.js'

import { createLogger } from '~/src/helpers/logging/logger.js'
import { db, METADATA_COLLECTION_NAME } from '~/src/mongo.js'

export const MAX_RESULTS = 500

const logger = createLogger()

/**
 * Retrieves the list of documents from the database
 */
export function list() {
  const coll = /** @satisfies {Collection<Partial<FormMetadataDocument>>} */ (
    db.collection(METADATA_COLLECTION_NAME)
  )

  return coll.find().limit(MAX_RESULTS).toArray()
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
 * @param {UpdateFilter<FormMetadataDocument>} update - form metadata document update filter
 * @param {ClientSession} [session] - mongo transaction session
 */
export async function update(formId, update, session) {
  logger.info(`Updating form with ID ${formId}`)

  const coll = /** @satisfies {Collection<FormMetadataDocument>} */ (
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
 * @typedef {import('@defra/forms-model').FormMetadata} FormMetadata
 * @typedef {import('@defra/forms-model').FormMetadataDocument} FormMetadataDocument
 */

/**
 * @template {object} Schema
 * @typedef {import('mongodb').Collection<Schema>} Collection
 */

/**
 * @template {object} Schema
 * @typedef {import('mongodb').UpdateFilter<Schema>} UpdateFilter
 */

/**
 * @typedef {import('mongodb').ClientSession} ClientSession
 */
