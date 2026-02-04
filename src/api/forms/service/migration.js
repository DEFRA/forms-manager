import {
  FormStatus,
  SchemaVersion,
  formDefinitionV2Schema,
  getErrorMessage
} from '@defra/forms-model'

import * as formDefinition from '~/src/api/forms/repositories/form-definition-repository.js'
import * as formMetadata from '~/src/api/forms/repositories/form-metadata-repository.js'
import { migrateToV2 } from '~/src/api/forms/service/migration-helpers.js'
import { logger } from '~/src/api/forms/service/shared.js'
import { createFormVersion } from '~/src/api/forms/service/versioning.js'
import { publishFormMigratedEvent } from '~/src/messaging/publish.js'
import { client } from '~/src/mongo.js'
/**
 * Migrates a v1 definition to v2
 * @param {string} formId
 * @param {FormMetadataAuthor} author
 */
export async function migrateDefinitionToV2(formId, author) {
  const formDraftDefinition = await formDefinition.get(formId, FormStatus.Draft)

  if (formDraftDefinition.schema === SchemaVersion.V2) {
    return formDraftDefinition
  }

  logger.info(`Migrating form with ID ${formId} to schema version 2`)

  const session = client.startSession()

  let updatedDraftDefinition = formDraftDefinition
  try {
    await session.withTransaction(async () => {
      updatedDraftDefinition = migrateToV2(formDraftDefinition)

      await formDefinition.update(
        formId,
        updatedDraftDefinition,
        session,
        formDefinitionV2Schema
      )

      await formMetadata.updateAudit(formId, author, session)

      await createFormVersion(formId, session)

      await publishFormMigratedEvent(formId, new Date(), author)
    })
  } catch (err) {
    logger.error(
      err,
      `[migrateToV2] Failed to migrate form with ID ${formId} to engine version 2 - ${getErrorMessage(err)}`
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
