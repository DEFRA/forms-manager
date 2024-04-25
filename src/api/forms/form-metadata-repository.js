import { MongoServerError, ObjectId } from 'mongodb'

import { FormAlreadyExistsError } from './errors.js'

import { db, COLLECTION_NAME } from '~/src/db.js'

export const MAX_RESULTS = 500

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
 * Retrieves a form metadata
 * @param {string} formId - ID of the form
 */
export function get(formId) {
  const coll = /** @satisfies {Collection<FormMetadataDocument>} */ (
    db.collection(COLLECTION_NAME)
  )

  return coll.findOne({ _id: new ObjectId(formId) })
}

/**
 * Create a document in the database
 * @param {FormMetadataDocument} document - form metadata document
 */
export async function create(document) {
  const coll = /** @satisfies {Collection<FormMetadataDocument>} */ (
    db.collection(COLLECTION_NAME)
  )

  try {
    const result = await coll.insertOne(document)

    return result
  } catch (err) {
    if (err instanceof MongoServerError && err.code === 11000) {
      throw new FormAlreadyExistsError(document.slug)
    }

    throw err
  }
}

/**
 * @typedef {import('../types.js').FormMetadata} FormMetadata
 * @typedef {import('../types.js').FormMetadataDocument} FormMetadataDocument
 */

/**
 * @template {object} Schema
 * @typedef {import('mongodb').Collection<Schema>} Collection
 */
