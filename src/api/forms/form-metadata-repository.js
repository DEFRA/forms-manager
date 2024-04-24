import { MongoServerError, ObjectId } from 'mongodb'

import { FormAlreadyExistsError } from './errors.js'

import { db, COLLECTION_NAME } from '~/src/db.js'

export const MAX_RESULTS = 500

/**
 * Retrieves the list of documents from the database
 */
export function list() {
  const coll = db.collection(COLLECTION_NAME)

  const res = coll.find().limit(MAX_RESULTS).toArray()

  return res
}

/**
 * Retrieves a document from the database
 * @param {string} formId - ID of the form
 */
export function get(formId) {
  const coll = db.collection(COLLECTION_NAME)

  return coll.findOne({ _id: new ObjectId(formId) })
}

/**
 * Create a document in the database
 * @param {FormConfigurationDocumentInput} form - form configuration
 */
export async function create(form) {
  try {
    const coll = db.collection(COLLECTION_NAME)
    const result = await coll.insertOne(form)

    return result
  } catch (err) {
    if (err instanceof MongoServerError && err.code === 11000) {
      throw new FormAlreadyExistsError(form.slug)
    }

    throw err
  }
}

/**
 * @typedef {import('mongodb').Document} Document
 * @typedef {import('mongodb').WithId<Document>} DocumentWithId
 * @typedef {import('mongodb').InsertOneResult} InsertOneResult
 * @typedef {import('../types.js').FormConfiguration} FormConfiguration
 * @typedef {import('../types.js').FormConfigurationDocumentInput} FormConfigurationDocumentInput
 */

/**
 * @template {object} Schema
 * @typedef {import('mongodb').WithId<Schema> | null} WithId
 */
