import { Engine } from '@defra/forms-model'
import Boom from '@hapi/boom'
import { v4 as uuidV4 } from 'uuid'

import * as formDefinition from '~/src/api/forms/repositories/form-definition-repository.js'
import * as formMetadata from '~/src/api/forms/repositories/form-metadata-repository.js'
import {
  findPage,
  uniquePathGate
} from '~/src/api/forms/repositories/helpers.js'
import { getFormDefinition } from '~/src/api/forms/service/definition.js'
import { repositionSummaryPipeline } from '~/src/api/forms/service/migration.js'
import {
  DRAFT,
  SUMMARY_PAGE_ID,
  logger,
  partialAuditFields
} from '~/src/api/forms/service/shared.js'
import { client } from '~/src/mongo.js'

/**
 * Adds id to summary page if it's missing
 * @param {PageSummary} summaryPage
 */
export const addIdToSummary = (summaryPage) => ({
  id: SUMMARY_PAGE_ID,
  ...summaryPage
})

/**
 * Adds an id to a page
 * @param {Page} pageWithoutId
 * @returns {Page}
 */
const createPageWithId = (pageWithoutId) => ({
  ...pageWithoutId,
  id: uuidV4().toString()
})

/**
 * Adds a new page to a draft definition and calls repositionSummaryPipeline if the summary exists
 * @param {string} formId
 * @param {Page} newPage
 * @param {FormMetadataAuthor} author
 */
export async function createPageOnDraftDefinition(formId, newPage, author) {
  logger.info(`Creating new page for form with ID ${formId}`)

  const session = client.startSession()

  /** @type {FormDefinition} */
  const formDraftDefinition = await getFormDefinition(formId, DRAFT)

  uniquePathGate(
    formDraftDefinition,
    newPage.path,
    `Duplicate page path on Form ID ${formId}`
  )

  const { summaryExists } = await repositionSummaryPipeline(
    formId,
    formDraftDefinition,
    author
  )

  /**
   * @type {{ position?: number; state?: 'live' | 'draft' }}
   */
  const options = {}

  if (summaryExists) {
    options.position = -1
  }

  const page = createPageWithId(newPage)

  try {
    await session.withTransaction(async () => {
      await formDefinition.addPageAtPosition(formId, page, session, options)

      // Set to V2 if not already
      await formDefinition.setEngineVersion(
        formId,
        Engine.V2,
        formDraftDefinition,
        session
      )

      // Update the form with the new draft state
      await formMetadata.update(
        formId,
        { $set: partialAuditFields(new Date(), author) },
        session
      )
    })
  } catch (err) {
    logger.error(err, `Failed to add page on ${formId}`)
    throw err
  } finally {
    await session.endSession()
  }

  logger.info(`Created new page for form with ID ${formId}`)

  return page
}

/**
 * Gets a page from a form definition and fails if the page is not found
 * @param {string} formId
 * @param {string} pageId
 * @param {ClientSession} [session]
 */
export async function getFormDefinitionPage(formId, pageId, session) {
  logger.info(`Getting Page ID ${pageId} on Form ID ${formId}`)

  const definition = /** @type {FormDefinition} */ await getFormDefinition(
    formId,
    DRAFT,
    session
  )

  const page = findPage(definition, pageId)

  if (page === undefined) {
    throw Boom.notFound(`Page ID ${pageId} not found on Form ID ${formId}`)
  }

  logger.info(`Got Page ID ${pageId} on Form ID ${formId}`)

  return page
}

/**
 * Updates specific fields on a page, allowing concurrent changes should components be updated
 * @param {string} formId
 * @param {string} pageId
 * @param {PatchPageFields} pageFieldsToUpdate
 * @param {FormMetadataAuthor} author
 */
export async function patchFieldsOnDraftDefinitionPage(
  formId,
  pageId,
  pageFieldsToUpdate,
  author
) {
  const session = client.startSession()

  const fields = Object.entries(pageFieldsToUpdate)

  let page
  try {
    // Check that page exists
    await getFormDefinitionPage(formId, pageId, session)

    await session.withTransaction(
      async () => {
        await formDefinition.updatePageFields(
          formId,
          pageId,
          pageFieldsToUpdate,
          session,
          DRAFT
        )

        page = await getFormDefinitionPage(formId, pageId, session)

        // Update the form with the new draft state
        await formMetadata.update(
          formId,
          { $set: partialAuditFields(new Date(), author) },
          session
        )
      },
      { readPreference: 'primary' }
    )
  } catch (err) {
    logger.error(
      err,
      `Failed to patch fields ${fields.map(([key]) => key).toString()} on Page ID ${pageId} Form ID ${formId}`
    )
    throw err
  } finally {
    await session.endSession()
  }

  return /** @type {Page | undefined } */ (page)
}

/**
 * @import { FormDefinition, FormMetadataAuthor, Page, PageSummary, PatchPageFields } from '@defra/forms-model'
 * @import { ClientSession } from 'mongodb'
 */
