import {
  formNotificationEmailUpdatedMapper,
  formOrganisationUpdatedMapper,
  formPrivacyNoticeUpdatedMapper,
  formSubmissionGuidanceUpdatedMapper,
  formSupportUpdatedMapper,
  formTeamEmailUpdatedMapper,
  formTeamNameUpdatedMapper
} from '~/src/messaging/mappers/form-events.js'

/**
 * @type {Record<string, (function(FormMetadata, PartialFormMetadataDocument): AuditMessage)>}
 */
const mapperLookup = {
  organisation: formOrganisationUpdatedMapper,
  teamName: formTeamNameUpdatedMapper,
  teamEmail: formTeamEmailUpdatedMapper,
  notificationEmail: formNotificationEmailUpdatedMapper,
  submissionGuidance: formSubmissionGuidanceUpdatedMapper,
  privacyNoticeType: formPrivacyNoticeUpdatedMapper,
  privacyNoticeText: formPrivacyNoticeUpdatedMapper,
  privacyNoticeUrl: formPrivacyNoticeUpdatedMapper,
  contact: formSupportUpdatedMapper
}

const validFields = /** @type {(keyof PartialFormMetadataDocument)[]} */ ([
  'organisation',
  'teamName',
  'teamEmail',
  'notificationEmail',
  'submissionGuidance',
  'privacyNoticeUrl',
  'contact'
])

const validKeys = /** @type {string[]} */ (validFields)

/**
 * Taking an old metadata object and new metadata object creates all the audit messages
 * @param {FormMetadata} metadata
 * @param {PartialFormMetadataDocument} formUpdated
 * @returns {AuditMessage[]}
 */
export function getFormMetadataAuditMessages(metadata, formUpdated) {
  /**
   * @type {AuditMessage[]}
   */
  const messages = []
  const updatedKeys = Object.keys(formUpdated)

  for (const key of validKeys) {
    const hasKey = updatedKeys.includes(key)

    if (hasKey) {
      const mapperFn = mapperLookup[key]
      messages.push(mapperFn(metadata, formUpdated))
    }
  }

  return messages
}

/**
 * @import { FormMetadata, AuditMessage } from '@defra/forms-model'
 * @import { PartialFormMetadataDocument } from '~/src/api/types.js'
 */
