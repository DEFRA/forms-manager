import { ControllerType, hasComponents } from '@defra/forms-model'
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

  if (!hasComponents(page)) {
    return undefined
  }

  return page.components.find((component) => component.id === componentId)
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
 * @param {Page} pageWithoutComponentIds
 */
export function populateComponentIds(pageWithoutComponentIds) {
  if (!hasComponents(pageWithoutComponentIds)) {
    return pageWithoutComponentIds
  }

  return {
    ...pageWithoutComponentIds,
    components: pageWithoutComponentIds.components.map((component) => {
      if (Object.hasOwn(component, 'id')) {
        return component
      }
      return {
        ...component,
        id: uuidV4()
      }
    })
  }
}

/**
 * Finds if a component is found without an id
 * @param {Page} page
 */
export function pageHasComponentWithoutId(page) {
  if (!hasComponents(page)) {
    return false
  }
  return page.components.some((component) => !component.id)
}

/**
 * Recursively Traverses pages and component and returns true if a component exists without an id
 * @param {FormDefinition} definition
 */
export function definitionHasComponentWithoutId(definition) {
  return definition.pages.some((page) => pageHasComponentWithoutId(page))
}

/**
 * Recursively traverse components in page and return list of components without an id
 * @param {Page} page
 * @param {string} pageId
 * @returns {{ pageId: string, componentName: string }[]}
 */
export function findPageComponentsWithoutIds(page, pageId) {
  if (!hasComponents(page)) {
    return []
  }
  return page.components.reduce((componentsWithoutIds, component) => {
    if (!component.id) {
      return [
        { pageId, componentName: component.name },
        ...componentsWithoutIds
      ]
    }

    return componentsWithoutIds
  }, /** @type {{ pageId: string, componentName: string }[]} */ ([]))
}

/**
 * Returns a list of components found without an id in a form definition
 * @param {FormDefinition} formDefinition
 */
export function findComponentsWithoutIds(formDefinition) {
  return formDefinition.pages.flatMap((page) =>
    'id' in page && !!page.id ? findPageComponentsWithoutIds(page, page.id) : []
  )
}

/**
 * @import { FormDefinition, Page, PageSummary, ComponentDef, PageStart, PageQuestion, PageTerminal, PageRepeat, PageFileUpload} from '@defra/forms-model'
 * @import { ClientSession } from 'mongodb'
 */
