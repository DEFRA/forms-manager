import { formOrganisationUpdatedMapper } from '~/src/messaging/mappers/form-events.js'

/**
 * @type {Record<string, (function(FormMetadata, PartialFormMetadataDocument): AuditMessage) | undefined>}
 */
const metadataFieldKeyMapperLookup = {
  organisation: formOrganisationUpdatedMapper
}

const validFields = /** @type {(keyof PartialFormMetadataDocument)[]} */ ([
  'organisation'
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
  const keys = Object.keys(formUpdated)

  for (const key of keys) {
    const isValidKey = validKeys.includes(key)
    const mapperFn = isValidKey && metadataFieldKeyMapperLookup[key]

    if (mapperFn) {
      messages.push(mapperFn(metadata, formUpdated))
    }
  }

  return messages
}

/**
 * @import { FormMetadata, AuditMessage } from '@defra/forms-model'
 * @import { PartialFormMetadataDocument } from '~/src/api/types.js'
 */
