import { ControllerType } from '@defra/forms-model'
import Boom from '@hapi/boom'
import { ObjectId } from 'mongodb'
import { v4 as uuidV4 } from 'uuid'

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
 * @returns {{readonly summary: PageSummary | undefined, shouldRepositionSummary: boolean, summaryExists: boolean}}
 */
export function summaryHelper(definition) {
  const lastIndex = definition.pages.length - 1
  const summaryIndex = definition.pages.findIndex(
    (page) => page.controller === ControllerType.Summary
  )
  const summaryExists = summaryIndex >= 0
  const shouldRepositionSummary = summaryExists && summaryIndex !== lastIndex

  return {
    summaryExists,
    shouldRepositionSummary,
    get summary() {
      const summaryPage = /** @type {PageSummary | undefined} */ (
        definition.pages[summaryIndex]
      )
      return summaryPage
    }
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

  if (
    page === undefined ||
    page.controller === ControllerType.Summary ||
    page.controller === ControllerType.Status
  ) {
    return undefined
  }

  return /** @type {ComponentDef | undefined} */ (
    page.components.find((component) => component.id === componentId)
  )
}
/**
 * @param {FormDefinition} formDraftDefinition
 * @param {string} path
 * @param {string} message
 */
export const uniquePathGate = (formDraftDefinition, path, message) => {
  if (formDraftDefinition.pages.some((page) => page.path === path)) {
    throw Boom.conflict(message)
  }
}

/**
 * @param {Page} page
 */
export function populateComponentIds(page) {
  const pageWithoutComponentIds = { ...page }
  const components =
    'components' in pageWithoutComponentIds
      ? pageWithoutComponentIds.components
      : []
  for (const component of components) {
    component.id = component.id ?? uuidV4()
  }
  return pageWithoutComponentIds
}

/**
 * @import { FormDefinition, Page, PageSummary, ComponentDef, PageStart, PageQuestion, PageTerminal, PageRepeat, PageFileUpload} from '@defra/forms-model'
 * @import { ClientSession } from 'mongodb'
 */
