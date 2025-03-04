import { ControllerType } from '@defra/forms-model'
import { v4 as uuidV4 } from 'uuid'

import * as formDefinition from '~/src/api/forms/repositories/form-definition-repository.js'
import * as formMetadata from '~/src/api/forms/repositories/form-metadata-repository.js'
import { summaryHelper } from '~/src/api/forms/repositories/helpers.js'
import { addIdToSummary } from '~/src/api/forms/service/page.js'
import {
  DRAFT,
  logger,
  partialAuditFields
} from '~/src/api/forms/service/shared.js'
import { client } from '~/src/mongo.js'

/**
 * Repositions the summary page if it's not the last index of pages
 * @param {string} formId
 * @param {FormDefinition} definition
 * @param {FormMetadataAuthor} author
 */
export async function repositionSummaryPipeline(formId, definition, author) {
  const summaryResult = summaryHelper(definition)
  const { shouldRepositionSummary } = summaryResult

  logger.info(`Checking position of summary on ${formId}`)

  if (!shouldRepositionSummary) {
    logger.info(`Position of summary on ${formId} correct`)
    return summaryResult
  }

  logger.info(`Updating position of summary on Form ID ${formId}`)

  const session = client.startSession()

  const { summary } = summaryResult
  const summaryDefined = /** @type {PageSummary} */ (summary)
  const summaryWithId = addIdToSummary(summaryDefined)

  try {
    await session.withTransaction(async () => {
      await formDefinition.removeMatchingPages(
        formId,
        { controller: ControllerType.Summary },
        session
      )

      await formDefinition.addPageAtPosition(
        formId,
        /** @type {PageSummary} */ (summaryWithId),
        session,
        {}
      )

      // Update the form with the new draft state
      await formMetadata.update(
        formId,
        { $set: partialAuditFields(new Date(), author) },
        session
      )
    })
  } catch (err) {
    logger.error(
      err,
      `Failed to update position of summary on Form ID ${formId}`
    )
    throw err
  } finally {
    await session.endSession()
  }

  logger.info(`Updated position of summary on Form ID ${formId}`)

  return { ...summaryResult, summary: summaryWithId }
}

/**
 * Will cycle through a definition and add pageIds to all the pages where they are missing
 * @param {string} formId
 * @param {FormMetadataAuthor} author
 */
export async function addPageIdsPipeline(formId, author) {
  logger.info(`Adding missing page ids for form with ID ${formId}`)
  const session = client.startSession()
  let updated = 0

  try {
    await session.withTransaction(
      async () => {
        const form = await formDefinition.get(formId, DRAFT, session)
        const pagesWithoutIds = form.pages.filter((page) => !page.id)

        for (const page of pagesWithoutIds) {
          await formDefinition.addPageFieldByPath(
            formId,
            page.path,
            { id: uuidV4() },
            session
          )
          updated++
        }

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
      `Failed to add missing page ids for form with ID ${formId}`
    )
    throw err
  } finally {
    await session.endSession()
  }
  logger.info(`Added ${updated} missing page ids for form with ID ${formId}`)
}

/**
 * @import { FormDefinition, FormMetadataAuthor, Page, PageSummary } from '@defra/forms-model'
 */
