import { ControllerType } from '@defra/forms-model'
import { ObjectId } from 'mongodb'

import { db } from '~/src/mongo.js'

/**
 * Removes a row in a MongoDB collection by its unique ID and fail if not completed.
 * @param {ClientSession} session
 * @param {string} collectionName - name of the collection to remove from
 * @param {string} id - object _id
 */
export async function removeById(session, collectionName, id) {
  const coll = db.collection(collectionName)

  const result = await coll.deleteOne({ _id: new ObjectId(id) }, { session })
  const { deletedCount } = result

  if (deletedCount !== 1) {
    throw new Error(
      `Failed to delete id '${id}' from '${collectionName}'. Expected deleted count of 1, received ${deletedCount}`
    )
  }
}

/**
 * @param {FormDefinition} definition
 * @returns {{readonly summary: PageSummary|undefined, readonly shouldPushSummary: boolean, readonly summaryExists: boolean}}
 */
export function summaryHelper(definition) {
  const lastIndex = definition.pages.length - 1
  const summaryIdx = definition.pages.findIndex(
    (page) => page.controller === ControllerType.Summary
  )

  return {
    get shouldPushSummary() {
      return summaryIdx !== lastIndex
    },
    get summaryExists() {
      return summaryIdx >= 0
    },
    get summary() {
      return definition.pages[summaryIdx]
    }
  }
}

/**
 * @import { FormDefinition, Page, PageSummary } from '@defra/forms-model'
 * @import { ClientSession } from 'mongodb'
 */
