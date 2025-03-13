import { ControllerType, Engine, FormStatus } from '@defra/forms-model'

import * as formDefinition from '~/src/api/forms/repositories/form-definition-repository.js'
import * as formMetadata from '~/src/api/forms/repositories/form-metadata-repository.js'
import {
  migrateToV2,
  summaryHelper
} from '~/src/api/forms/service/migration-helpers.js'
import { addIdToSummary } from '~/src/api/forms/service/page.js'
import { logger, partialAuditFields } from '~/src/api/forms/service/shared.js'
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
 * Migrates a v1 definition to v2
 * @param {string} formId
 * @param {FormMetadataAuthor} author
 */
export async function migrateDefinitionToV2(formId, author) {
  const formDraftDefinition = await formDefinition.get(formId, FormStatus.Draft)

  if (formDraftDefinition.engine === Engine.V2) {
    return formDraftDefinition
  }
  logger.info(`Migrating form with ID ${formId} to engine version 2`)

  const session = client.startSession()

  let updatedDraftDefinition = formDraftDefinition
  try {
    await session.withTransaction(async () => {
      updatedDraftDefinition = migrateToV2(formDraftDefinition)

      await formDefinition.upsert(formId, updatedDraftDefinition, session)

      await formMetadata.update(
        formId,
        { $set: partialAuditFields(new Date(), author) },
        session
      )
    })
  } catch (err) {
    logger.error(
      err,
      `Failed to migrate form with ID ${formId} to engine version 2`
    )
    throw err
  }

  logger.info(`Migrated form with ID ${formId} to engine version 2`)

  return updatedDraftDefinition
}

// TODO: add migrate to V1

/**
 * @import { FormDefinition, FormMetadataAuthor, PageSummary } from '@defra/forms-model'
 */
