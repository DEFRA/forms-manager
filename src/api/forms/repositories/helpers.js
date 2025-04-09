import { ApiErrorCode, hasComponentsEvenIfNoNext } from '@defra/forms-model'
import Boom from '@hapi/boom'
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
 * @param {string} pageId
 */
export function findPage(definition, pageId) {
  return definition.pages.find((page) => page.id === pageId)
}

/**
 * Finds a component in a form definition by formId, pageId & componentId
 * @param {FormDefinition} definition
 * @param {string} pageId
 * @param {string} componentId
 * @returns {ComponentDef | undefined}
 */
export function findComponent(definition, pageId, componentId) {
  const page = /** @satisfies {Page | undefined} */ (
    findPage(definition, pageId)
  )

  if (!hasComponentsEvenIfNoNext(page)) {
    return undefined
  }

  return page.components.find((component) => component.id === componentId)
}
/**
 * @param {FormDefinition} formDraftDefinition
 * @param {string} path
 * @param {string} message
 * @param {ApiErrorCode} [errorCode]
 * @param {string} [excludePageId]
 */
export function uniquePathGate(
  formDraftDefinition,
  path,
  message,
  errorCode = ApiErrorCode.General,
  excludePageId = ''
) {
  if (
    formDraftDefinition.pages.some(
      (page) => page.path === path && page.id !== excludePageId
    )
  ) {
    throw Boom.conflict(message, { errorCode })
  }
}

/**
 * @import { FormDefinition, Page, ComponentDef } from '@defra/forms-model'
 * @import { ClientSession } from 'mongodb'
 */
