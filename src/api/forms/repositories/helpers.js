import { ObjectId } from 'mongodb'

import { db } from '~/src/mongo.js'

/**
 * Drops a row in a MongoDB collection by its unique ID and fail if not completed.
 * @param {import('mongodb').ClientSession} session
 * @param {string} collectionName - name of the collection to drop from
 * @param {string} id - object _id
 */
export async function dropById(session, collectionName, id) {
  const coll = db.collection(collectionName)

  const result = await coll.deleteOne({ _id: new ObjectId(id) }, { session })
  const { deletedCount } = result

  if (deletedCount !== 1) {
    throw new Error(
      `Failed to delete id '${id}' from '${collectionName}'. Expected deleted count of 1, received ${deletedCount}`
    )
  }
}
