import { ApiErrorCode, FormStatus } from '@defra/forms-model'
import Boom from '@hapi/boom'

import * as formDefinition from '~/src/api/forms/repositories/form-definition-repository.js'
import * as formMetadata from '~/src/api/forms/repositories/form-metadata-repository.js'
import {
  findPage,
  uniquePathGate
} from '~/src/api/forms/repositories/helpers.js'
import { getFormDefinition } from '~/src/api/forms/service/definition.js'
import { SUMMARY_PAGE_ID, logger } from '~/src/api/forms/service/shared.js'
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
 * Adds a new page to a draft definition
 * @param {string} formId
 * @param {Page} newPage
 * @param {FormMetadataAuthor} author
 */
export async function createPageOnDraftDefinition(formId, newPage, author) {
  logger.info(`Creating new page for form with ID ${formId}`)

  const session = client.startSession()

  /** @type {FormDefinition} */
  const formDraftDefinition = await getFormDefinition(formId, FormStatus.Draft)

  uniquePathGate(
    formDraftDefinition,
    newPage.path,
    `Duplicate page path on Form ID ${formId}`,
    ApiErrorCode.DuplicatePagePathComponent
  )

  try {
    await session.withTransaction(async () => {
      await formDefinition.addPage(formId, newPage, session)

      await formMetadata.updateAudit(formId, author, session)
    })
  } catch (err) {
    logger.error(err, `Failed to add page on ${formId}`)
    throw err
  } finally {
    await session.endSession()
  }

  logger.info(`Created new page for form with ID ${formId}`)

  return newPage
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
    FormStatus.Draft,
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

    if (pageFieldsToUpdate.path) {
      /** @type {FormDefinition} */
      const formDraftDefinition = await getFormDefinition(
        formId,
        FormStatus.Draft
      )

      uniquePathGate(
        formDraftDefinition,
        pageFieldsToUpdate.path,
        `Duplicate page path on Form ID ${formId}`,
        ApiErrorCode.DuplicatePagePathPage,
        pageId
      )
    }

    await session.withTransaction(async () => {
      await formDefinition.updatePageFields(
        formId,
        pageId,
        pageFieldsToUpdate,
        session
      )

      page = await getFormDefinitionPage(formId, pageId, session)

      await formMetadata.updateAudit(formId, author, session)
    })
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
 * Updates a component and throws a Boom.notFound if page or component is not found
 * @param {string} formId
 * @param {string} pageId
 * @param {FormMetadataAuthor} author
 */
export async function deletePageOnDraftDefinition(formId, pageId, author) {
  logger.info(`Deleting Page ID ${pageId} on Form ID ${formId}`)

  const session = client.startSession()

  try {
    await session.withTransaction(async () => {
      await formDefinition.deletePage(formId, pageId, session)

      await formMetadata.updateAudit(formId, author, session)
    })
  } catch (err) {
    logger.error(err, `Failed to delete Page ID ${pageId} on Form ID ${formId}`)
    throw err
  } finally {
    await session.endSession()
  }

  logger.info(`Deleted Page ID ${pageId} on Form ID ${formId}`)
}

/**
 * @import { FormDefinition, FormMetadataAuthor, Page, PageSummary, PatchPageFields } from '@defra/forms-model'
 * @import { ClientSession } from 'mongodb'
 */
