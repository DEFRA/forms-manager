import Boom from '@hapi/boom'
import { MongoServerError, ObjectId } from 'mongodb'

import { FormAlreadyExistsError } from './errors.js'

import { db, COLLECTION_NAME } from '~/src/db.js'
import { createLogger } from '~/src/helpers/logging/logger.js'

export const MAX_RESULTS = 500

const logger = createLogger()

/**
 * Retrieves the list of documents from the database
 */
export function list() {
  const coll = /** @satisfies {Collection<FormMetadataDocument>} */ (
    db.collection(COLLECTION_NAME)
  )

  return coll.find().limit(MAX_RESULTS).toArray()
}

/**
 * Retrieves a form metadata by ID
 * @param {string} formId - ID of the form
 */
export async function get(formId) {
  logger.info(`Getting form with ID ${formId}`)

  const coll = /** @satisfies {Collection<FormMetadataDocument>} */ (
    db.collection(COLLECTION_NAME)
  )

  const document = await coll.findOne({ _id: new ObjectId(formId) })

  if (!document) {
    throw Boom.notFound(`Form with ID '${formId}' not found`)
  }

  logger.info(`Form with ID ${formId} found`)

  return document
}

/**
 * Retrieves a form metadata by slug
 * @param {string} slug - The slug of the form
 */
export async function getBySlug(slug) {
  logger.info(`Getting form with slug ${slug}`)

  const coll = /** @satisfies {Collection<FormMetadataDocument>} */ (
    db.collection(COLLECTION_NAME)
  )

  const document = await coll.findOne({ slug })

  if (!document) {
    throw Boom.notFound(`Form with slug '${slug}' not found`)
  }

  logger.info(`Form with slug ${slug} found`)

  return document
}

/**
 * Create a document in the database
 * @param {FormMetadataDocument} document - form metadata document
 */
export async function create(document) {
  logger.info(`Creating form with slug ${document.slug}`)

  const coll = /** @satisfies {Collection<FormMetadataDocument>} */ (
    db.collection(COLLECTION_NAME)
  )

  try {
    const result = await coll.insertOne(document)
    const formId = result.insertedId.toString()

    logger.info(`Form with slug ${document.slug} created as form ID ${formId}`)

    return result
  } catch (err) {
    if (err instanceof MongoServerError && err.code === 11000) {
      throw new FormAlreadyExistsError(document.slug)
    }

    throw err
  }
}

/**
 * Update a document in the database
 * @param {string} formId - ID of the form
 * @param {UpdateFilter<FormMetadataDocument>} update - form metadata document update filter
 */
export async function update(formId, update) {
  logger.info(`Updating form with ID ${formId}`)

  const coll = /** @satisfies {Collection<FormMetadataDocument>} */ (
    db.collection(COLLECTION_NAME)
  )

  const result = await coll.updateOne({ _id: new ObjectId(formId) }, update)

  logger.info(`Form with ID ${formId} updated`)

  return result
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
