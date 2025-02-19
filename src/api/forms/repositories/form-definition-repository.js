import Boom from '@hapi/boom'
import { ObjectId } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'

import {
  removeById,
  summaryHelper
} from '~/src/api/forms/repositories/helpers.js'
import { createLogger } from '~/src/helpers/logging/logger.js'
import { DEFINITION_COLLECTION_NAME, db } from '~/src/mongo.js'

const logger = createLogger()
const DRAFT = 'draft'

/**
 * Adds a form to the Form Store
 * @param {string} id - id
 * @param {FormDefinition} formDefinition - form definition (JSON object)
 * @param {ClientSession} session - mongo transaction session
 */
export async function upsert(id, formDefinition, session) {
  logger.info(`Creating form definition (draft) for form ID ${id}`)

  const coll = /** @satisfies {Collection<{draft: FormDefinition}>} */ (
    db.collection(DEFINITION_COLLECTION_NAME)
  )

  const _id = new ObjectId(id)
  await coll.updateOne(
    { _id },
    { $set: { draft: formDefinition } },
    { upsert: true, session }
  )

  logger.info(`Created form definition (draft) for form ID ${id}`)
}

/**
 * Copy the draft form to live in the Form Store
 * @param {string} id - id
 * @param {ClientSession} session - mongo transaction session
 */
export async function createLiveFromDraft(id, session) {
  logger.info(`Copying form definition (draft to live) for form ID ${id}`)

  const coll = /** @satisfies {Collection<{draft: FormDefinition}>} */ (
    db.collection(DEFINITION_COLLECTION_NAME)
  )

  await coll.updateOne(
    { _id: new ObjectId(id) },
    [{ $set: { live: '$draft' } }],
    { session }
  )

  logger.info(`Copied form definition (draft to live) for form ID ${id}`)
}

/**
 * Copy the live form to draft in the Form Store
 * @param {string} id - id
 * @param {ClientSession} session - mongo transaction session
 */
export async function createDraftFromLive(id, session) {
  logger.info(`Copying form definition (live to draft) for form ID ${id}`)

  try {
    const coll = /** @satisfies {Collection<{draft: FormDefinition}>} */ (
      db.collection(DEFINITION_COLLECTION_NAME)
    )

    await coll.updateOne(
      { _id: new ObjectId(id) },
      [{ $set: { draft: '$live' } }],
      { session }
    )
  } catch (error) {
    logger.error(
      error,
      `Copying form definition (live to draft) for form ID ${id} failed`
    )

    if (error instanceof Error && !Boom.isBoom(error)) {
      throw Boom.internal(error)
    }

    throw error
  }

  logger.info(`Copied form definition (live to draft) for form ID ${id}`)
}

/**
 * Retrieves the form definition for a given form ID
 * @param {string} formId - the ID of the form
 * @param {'draft' | 'live'} state - the form state
 */
export async function get(formId, state = 'draft') {
  logger.info(`Getting form definition (${state}) for form ID ${formId}`)

  const coll =
    /** @satisfies {Collection<{draft?: FormDefinition, live?: FormDefinition}>} */ (
      db.collection(DEFINITION_COLLECTION_NAME)
    )

  try {
    const result = await coll.findOne(
      { _id: new ObjectId(formId) },
      { projection: { [state]: 1 } }
    )

    if (!result?.[state]) {
      throw Boom.notFound(`Form definition with ID '${formId}' not found`)
    }

    const definition = result[state]

    logger.info(`Form definition (${state}) for form ID ${formId} found`)

    return definition
  } catch (error) {
    logger.error(
      error,
      `Getting form definition (${state}) for form ID ${formId} failed`
    )

    if (error instanceof Error && !Boom.isBoom(error)) {
      throw Boom.internal(error)
    }

    throw error
  }
}

/**
 * Removes a form definition (both draft and live components)
 * @param {string} formId - the ID of the form
 * @param {ClientSession} session
 */
export async function remove(formId, session) {
  logger.info(`Removing form definition with ID ${formId}`)

  await removeById(session, DEFINITION_COLLECTION_NAME, formId)

  logger.info(`Removed form definition with ID ${formId}`)
}

/**
 * Updates the name of a draft form definition
 * @param {string} formId - the ID of the form
 * @param {string} name - new name for the form
 * @param {ClientSession} session
 * @param {'draft' | 'live'} [state] - state of the form to update
 */
export async function updateName(formId, name, session, state = DRAFT) {
  if (state === 'live') {
    throw Boom.badRequest('Cannot update the name of a live form')
  }

  logger.info(`Updating form name for form ID ${formId}`)

  const coll = /** @satisfies {Collection<{draft: FormDefinition}>} */ (
    db.collection(DEFINITION_COLLECTION_NAME)
  )

  await coll.updateOne(
    { _id: new ObjectId(formId) },
    { $set: { [`${state}.name`]: name } },
    { session }
  )

  logger.info(`Updated form name for form ID ${formId}`)
}

/**
 * Updates the name of a draft form definition
 * @param {string} formId - the ID of the form
 * @param {Partial<Page>} matchCriteria - new name for the form
 * @param {ClientSession} session
 * @param {'draft' | 'live'} [state] - state of the form to update
 */
export async function removeMatchingPages(
  formId,
  matchCriteria,
  session,
  state = DRAFT
) {
  if (state === 'live') {
    throw Boom.badRequest(`Cannot remove page on live form ID ${formId}`)
  }
  logger.info(`Removing page on ${formId}`)

  const coll = /** @satisfies {Collection<{draft: FormDefinition}>} */ (
    db.collection(DEFINITION_COLLECTION_NAME)
  )
  await coll.updateOne(
    { _id: new ObjectId(formId) },
    {
      $pull: { 'draft.pages': matchCriteria } // Removes all Summary pages
    },
    { session }
  )

  logger.info(`Removed page on ${formId}`)
}

/**
 * Pushes the summary page to the last page
 * @param {string} formId - the ID of the form
 * @param {ClientSession} session
 * @param {'draft' | 'live'} [state] - state of the form to update
 * @returns {Promise<undefined | PageSummary>}
 */
export async function pushSummaryToEnd(formId, session, state = DRAFT) {
  if (state === 'live') {
    throw Boom.badRequest('Cannot add summary page to end of a live form')
  }
  logger.info(`Checking position of summary on ${formId}`)

  const definition = await get(formId, state)

  const { shouldRepositionSummary, summary } = summaryHelper(definition)

  if (!shouldRepositionSummary) {
    logger.info(`Position of summary on ${formId} correct`)
    return summary
  }

  logger.info(`Updating position of summary on ${formId}`)

  const coll = /** @satisfies {Collection<{draft: FormDefinition}>} */ (
    db.collection(DEFINITION_COLLECTION_NAME)
  )

  await coll.updateOne(
    { _id: new ObjectId(formId) },
    {
      $pull: { 'draft.pages': { controller: 'SummaryPageController' } } // Removes all Summary pages
    },
    { session }
  )
  await coll.updateOne(
    { _id: new ObjectId(formId) },
    {
      $push: { 'draft.pages': summary } // Adds the summary page back
    },
    { session }
  )
  logger.info(`Updated position of summary on ${formId}`)

  return summary
}

/**
 * @param {string} formId
 * @param {Page} page
 * @param {ClientSession} session
 * @param {'draft' | 'live'} [state]
 * @returns {Promise<Page>}
 */
export async function addPage(formId, page, session, state = DRAFT) {
  logger.info(`Creating new page for form with ID ${formId}`)

  /**
   * @type {FormDefinition}
   */
  const definition = await get(formId, state)

  const { shouldRepositionSummary, summaryExists } = summaryHelper(definition)

  if (shouldRepositionSummary) {
    await pushSummaryToEnd(formId, session, state)
  }

  const $position = summaryExists ? -1 : definition.pages.length

  const coll = /** @satisfies {Collection<{draft: FormDefinition}>} */ (
    db.collection(DEFINITION_COLLECTION_NAME)
  )

  const pageToAdd = /** @type {Page} */ ({
    id: uuidv4(),
    ...page
  })

  await coll.updateOne(
    { _id: new ObjectId(formId) },
    {
      $push: {
        'draft.pages': { $each: [pageToAdd], $position }
      }
    },
    { session }
  )

  logger.info(`Created new page for form with ID ${formId}`)

  return pageToAdd
}

/**
 * @param {string} formId
 * @param {string} pageId
 * @param {Page} page
 * @param {ClientSession} session
 * @param {'live' | 'draft'} [state]
 * @returns {Promise<void>}
 */
export async function updatePage(formId, pageId, page, session, state = DRAFT) {
  if (state === 'live') {
    throw Boom.badRequest(`Cannot update page on a live form - ${formId}`)
  }

  logger.info(`Updating page ID ${pageId} on form ID ${formId}`)

  const coll = /** @satisfies {Collection<{draft: FormDefinition}>} */ (
    db.collection(DEFINITION_COLLECTION_NAME)
  )

  await coll.updateOne(
    { _id: new ObjectId(formId), 'draft.pages.id': pageId },
    { $set: { 'draft.pages.$': page } },
    { session }
  )

  logger.info(`Updated page ID ${pageId} on form ID ${formId}`)
}

/**
 * @param {string} formId
 * @param {string} pageId
 * @param {ComponentDef[]} components
 * @param {ClientSession} session
 * @param {'live' | 'draft'} [state]
 * @returns {Promise<void>}
 */
export async function addComponents(
  formId,
  pageId,
  components,
  session,
  state = DRAFT
) {
  if (state === 'live') {
    throw Boom.badRequest(`Cannot add component to a live form - ${formId}`)
  }

  logger.info(`Adding a new component to form ID ${formId}`)

  const coll = /** @satisfies {Collection<{draft: FormDefinition}>} */ (
    db.collection(DEFINITION_COLLECTION_NAME)
  )

  await coll.updateOne(
    { _id: new ObjectId(formId), 'draft.pages.id': pageId },
    {
      $push: {
        'draft.pages.$.components': {
          $each: components
        }
      }
    },
    { session }
  )

  logger.info(`Added a new component to form ID ${formId}`)
}

/**
 * @import { FormDefinition, Page, PageSummary, ComponentDef } from '@defra/forms-model'
 * @import { ClientSession, Collection } from 'mongodb'
 */
