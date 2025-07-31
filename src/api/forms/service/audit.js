import { updateAudit } from '~/src/api/forms/repositories/form-metadata-repository.js'
import { publishFormUpdatedEvent } from '~/src/messaging/publish.js'

/**
 * @template T
 * @typedef {object} StateChange
 * @property {T} before - The state before the change
 * @property {T} after - The state after the change
 */

/**
 * @param {string} formId
 * @param {AuditUser} author
 * @param {ClientSession} session
 * @param {StateChange<FormDefinition>} formDefinitionStates
 * @param {Date} date
 * @param {boolean} auditDiff
 * @returns {Promise<void>}
 */
export async function updateAuditAndPublish(
  formId,
  author,
  session,
  formDefinitionStates,
  date = new Date(),
  auditDiff = true
) {
  const metadata = await updateAudit(formId, author, session, date)

  if (auditDiff) {
    await publishFormUpdatedEvent(
      metadata,
      author,
      date,
      formDefinitionStates.before,
      formDefinitionStates.after
    )
  }
  // TODO: handle auditDiff = false with S3
}

/**
 * @import { ClientSession } from 'mongo'
 * @import { AuditUser, FormDefinition } from '@defra/forms-model'
 */
