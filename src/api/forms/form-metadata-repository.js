import { ObjectId } from 'mongodb'

export const MAX_RESULTS = 500
export const COLLECTION_NAME = 'form-metadata'

/**
 * Retrieves the list of documents from the database
 * @param {Db} db - the mongo database object
 * @returns {Promise<DocumentWithId[]>}
 */
export function list(db) {
  const coll = db.collection(COLLECTION_NAME)

  return coll.find().limit(MAX_RESULTS).toArray()
}

/**
 * Retrieves a document from the database
 * @param {string} formId - ID of the form
 * @param {Db} db - the mongo database object
 * @returns {Promise<DocumentWithId | null>}
 */
export function get(formId, db) {
  const coll = db.collection(COLLECTION_NAME)

  return coll.findOne({ _id: new ObjectId(formId) })
}

/**
 * Create a document in the database
 * @param {FormConfigurationInput} formConfigurationInput - form configuration
 * @param {Db} db - the mongo database object
 * @returns {Promise<InsertOneResult>}
 */
export async function create(formConfigurationInput, db) {
  const coll = db.collection(COLLECTION_NAME)

  return coll.insertOne(formConfigurationInput)
}

/**
 * @typedef {import('mongodb').Db} Db
 * @typedef {import('mongodb').Document} Document
 * @typedef {import('mongodb').WithId<Document>} DocumentWithId
 * @typedef {import('mongodb').InsertOneResult} InsertOneResult
 * @typedef {import('../types.js').FormConfiguration} FormConfiguration
 * @typedef {import('../types.js').FormConfigurationInput} FormConfigurationInput
 */
