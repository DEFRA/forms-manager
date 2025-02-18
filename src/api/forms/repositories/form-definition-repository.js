import { ControllerType } from '@defra/forms-model'
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
 * @param {FormStatus} state - the form state
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
 * @param {FormStatus} [state] - state of the form to update
 */
export async function updateName(formId, name, session, state = 'draft') {
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
 * Pushes the summary page to the last page
 * @param {string} formId - the ID of the form
 * @param {ClientSession} session
 * @param {FormStatus} [state] - state of the form to update
 * @returns {Promise<undefined|Page>}
 */
export async function pushSummaryToEnd(formId, session, state = 'draft') {
  if (state === 'live') {
    throw Boom.badRequest('Cannot add summary page to end of a live form')
  }
  logger.info(`Checking position of summary on ${formId}`)

  const definition = await get(formId, state)
  const pageCount = definition.pages.length
  const summary = definition.pages.find(
    (page) => page.controller === ControllerType.Summary
  )

  const lastPage = definition.pages[pageCount - 1]

  if (summary === undefined || lastPage === summary) {
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
 * @param {FormStatus} [state]
 * @returns {Promise<void>}
 */
export async function addPage(formId, page, session, state = 'draft') {
  logger.info(`Creating new page for form with ID ${formId}`)

  /**
   * @type {FormDefinition}
   */
  const definition = await get(formId, state)

  const { shouldPushSummary, summaryExists } = summaryHelper(definition)

  if (shouldPushSummary) {
    await pushSummaryToEnd(formId, session, state)
  }

  const $position = summaryExists ? -1 : definition.pages.length

  const coll = /** @satisfies {Collection<{draft: FormDefinition}>} */ (
    db.collection(DEFINITION_COLLECTION_NAME)
  )

  const pageToAdd = {
    id: uuidv4(),
    ...page
  }

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
}

/**
 * @import { FormDefinition, Page, FormStatus } from '@defra/forms-model'
 * @import { ClientSession, Collection } from 'mongodb'
 */
