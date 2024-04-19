import { ObjectId } from 'mongodb'

import { db, COLLECTION_NAME } from '~/src/db.js'

export const MAX_RESULTS = 500

/**
 * Retrieves the list of documents from the database
 * @returns {Promise<DocumentWithId[]>}
 */
export function list() {
  const coll = db.collection(COLLECTION_NAME)

  const res = coll.find().limit(MAX_RESULTS).toArray()

  return res
}

/**
 * Retrieves a document from the database
 * @param {string} formId - ID of the form
 * @returns {Promise<DocumentWithId | null>}
 */
export function get(formId) {
  const coll = db.collection(COLLECTION_NAME)

  return coll.findOne({ _id: new ObjectId(formId) })
}

/**
 * Create a document in the database
 * @param {FormConfigurationInput} formConfigurationInput - form configuration
 * @returns {Promise<InsertOneResult>}
 */
export async function create(formConfigurationInput) {
  const coll = db.collection(COLLECTION_NAME)

  return coll.insertOne(formConfigurationInput)
}

/**
 * @typedef {import('mongodb').Document} Document
 * @typedef {import('mongodb').WithId<Document>} DocumentWithId
 * @typedef {import('mongodb').InsertOneResult} InsertOneResult
 * @typedef {import('../types.js').FormConfiguration} FormConfiguration
 * @typedef {import('../types.js').FormConfigurationInput} FormConfigurationInput
 */

/**
 * @template {object} Schema
 * @typedef {import('mongodb').WithId<Schema> | null} WithId
 */
