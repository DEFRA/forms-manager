import { updateAudit } from '~/src/api/forms/repositories/form-metadata-repository.js'
import { mapForm } from '~/src/api/forms/service/shared.js'
import { publishFormUpdatedEvent } from '~/src/messaging/publish.js'

/**
 * @template T
 * @typedef {object} StateChange
 * @property {T} before - The state before the change
 * @property {T} after - The state after the change
 */

/**
 * @param {string} formId
 * @param {FormDefinitionRequestType} requestType
 * @param {unknown} payload
 * @param {AuditUser} author
 * @param {ClientSession} session
 * @param {StateChange<FormDefinition>} formDefinitionStates
 * @param {Date} date
 * @param {boolean} auditDiff
 * @returns {Promise<void>}
 */
export async function updateAuditAndPublish(
  formId,
  requestType,
  payload,
  author,
  session,
  formDefinitionStates,
  date = new Date(),
  auditDiff = true
) {
  const metadataDocument = await updateAudit(formId, author, session, date)
  const metadata = mapForm(metadataDocument)

  if (auditDiff) {
    await publishFormUpdatedEvent(
      metadata,
      requestType,
      payload,
      author,
      date,
      formDefinitionStates.before,
      formDefinitionStates.after
    )
  }
  // TODO: handle auditDiff = false with S3
}

/**
 * @import { ClientSession } from 'mongodb'
 * @import { AuditUser, FormDefinition, FormDefinitionRequestType } from '@defra/forms-model'
 */
