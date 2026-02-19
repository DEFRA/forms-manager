import { getErrorMessage } from '@defra/forms-model'
import Boom from '@hapi/boom'
import { MongoServerError } from 'mongodb'

import { createLogger } from '~/src/helpers/logging/logger.js'
import { SECRETS_COLLECTION_NAME, db } from '~/src/mongo.js'

export const MAX_RESULTS = 100

const logger = createLogger()

/**
 * Retrieves a form secret by form id and secret name
 * @param {string} formId - ID of the form
 * @param {string} secretName - name of the secret
 * @param {ClientSession} [session] - Optional MongoDB session for transactions
 */
export async function get(formId, secretName, session) {
  const coll =
  /** @satisfies {Collection<FormSecret>} */ (
    db.collection(SECRETS_COLLECTION_NAME)
  )

  try {
    const document = await coll.findOne(
      { formId, secretName },
      { session }
    )

    if (!document) {
      throw Boom.notFound(`Form secret '${secretName}' on form ID '${formId}' not found`)
    }

    return document
  } catch (err) {
    logger.error(
      err,
      `[getSecret] Getting form secret '${secretName}' with form ID ${formId} failed - ${getErrorMessage(err)}`
    )

    if (Boom.isBoom(err)) {
      throw err
    }

    if (err instanceof Error) {
      throw Boom.badRequest(err)
    }
    throw err
  }
}

/**
 * Checks if a form secret exists for the supplied form id and secret name
 * @param {string} formId - ID of the form
 * @param {string} secretName - name of the secret
 * @param {ClientSession} [session] - Optional MongoDB session for transactions
 */
export async function exists(formId, secretName, session) {
  const coll =
  /** @satisfies {Collection<FormSecret>} */ (
    db.collection(SECRETS_COLLECTION_NAME)
  )

  try {
    const document = await coll.findOne(
      { formId, secretName },
      { session }
    )

    if (!document) {
      return false
    }

    return true
  } catch (err) {
    logger.error(
      err,
      `[existsSecret] Checking existence of form secret '${secretName}' with form ID ${formId} failed - ${getErrorMessage(err)}`
    )

    if (Boom.isBoom(err)) {
      throw err
    }

    if (err instanceof Error) {
      throw Boom.badRequest(err)
    }
    throw err
  }
}

/**
 * Save a form secret in the database
 * @param {string} formId - id of the form
 * @param {string} secretName - name of the secret
 * @param {string} secretValue - value of the secret
 * @param {ClientSession} session - mongo transaction session
 */
export async function save(formId, secretName, secretValue, session) {
  logger.info(`Saving secret '${secretName}' for form ID ${formId}`)

  const coll = /** @satisfies {Collection<FormSecret>} */ (
    db.collection(SECRETS_COLLECTION_NAME)
  )

  const document = {
    formId,
    secretName,
    secretValue
  }

  try {
    const result = await coll.insertOne(document, { session })

    logger.info(`Secret saved with name '${secretName}' for form ID ${formId}`)

    return result
  } catch (err) {
    const message = `Secret with name '${secretName}' for form ID ${formId} failed to save`

    if (err instanceof MongoServerError) {
      logger.error(
        err,
        `[mongoError] ${message} - MongoDB error code: ${err.code} - ${err.message}`
      )
    } else {
      logger.error(err, `[updateError] ${message} - ${getErrorMessage(err)}`)
    }
    throw err
  }
}

/**
 * @import { FormSecret } from '@defra/forms-model'
 * @import { ClientSession, Collection } from 'mongodb'
 */
