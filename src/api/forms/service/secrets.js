import { getErrorMessage } from '@defra/forms-model'

import * as formMetadata from '~/src/api/forms/repositories/form-metadata-repository.js'
import * as secretsRepository from '~/src/api/forms/repositories/secrets-repository.js'
import { encryptSecret } from '~/src/api/forms/service/helpers/crypto.js'
import { logger } from '~/src/api/forms/service/shared.js'
import { publishSavedFormSecretEvent } from '~/src/messaging/publish.js'
import { client } from '~/src/mongo.js'

/**
 * Gets a secret value. It will still be encrypted so will need decrypting in order to use it.
 * @param {string} formId - id of the form
 * @param {string} secretName - name of the secret
 */
export async function getFormSecret(
  formId,
  secretName
) {
  const document = await secretsRepository.get(formId, secretName)
  return document.secretValue
}

/**
 * Checks if a secret exists.
 * @param {string} formId - id of the form
 * @param {string} secretName - name of the secret
 */
export async function existsFormSecret(
  formId,
  secretName
) {
  return await secretsRepository.exists(formId, secretName)
}

/**
 * Saves a secret value. The value is encrypted before saving.
 * @param {string} formId - id of the form
 * @param {string} secretName - name of the secret
 * @param {string} secretValue - cleartext secret value
 * @param {FormMetadataAuthor} author
 */
export async function saveFormSecret(
  formId,
  secretName,
  secretValue,
  author
) {
  const session = client.startSession()

  try {
    await session.withTransaction(async () => {
      const metadata = await formMetadata.get(formId, session)

      // Encrypt secret value
      const encryptedSecret = encryptSecret(secretValue)

      await secretsRepository.save(formId, secretName, encryptedSecret, session)

      await publishSavedFormSecretEvent(
        metadata,
        secretName,
        author
      )
    })

    logger.info(`Saved secret '${secretName}' to form ID ${formId}`)
  } catch (err) {
    logger.error(
      err,
      `[assignSections] Failed to save secret '${secretName}' to form ID ${formId} - ${getErrorMessage(err)}`
    )

    throw err
  } finally {
    await session.endSession()
  }
}

/**
 * @import { FormDefinitionRequestType, FormMetadataAuthor, SectionAssignmentItem } from '@defra/forms-model'
 */
