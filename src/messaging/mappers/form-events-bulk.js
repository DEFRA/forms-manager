import { messageSchema } from '@defra/forms-model'
import Joi from 'joi'

import { formOrganisationUpdatedMapper } from '~/src/messaging/mappers/form-events.js'

/**
 * @type {Record<string, (function(FormMetadata, PartialFormMetadataDocument): AuditMessage)>}
 */
const metadataFieldKeyMapperLookup = {
  organisation: formOrganisationUpdatedMapper
}

const validFields = /** @type {(keyof PartialFormMetadataDocument)[]} */ ([
  'organisation'
])

const validKeys = /** @type {string[]} */ (validFields)

/**
 * Taking an old metadata object and new metadata object creates all the pp
 * @param {FormMetadata} metadata
 * @param {PartialFormMetadataDocument} formUpdated
 * @returns {AuditMessage[]}
 */
export function getFormMetadataAuditMessages(metadata, formUpdated) {
  const edited = Object.keys(formUpdated).filter((key) =>
    validKeys.includes(key)
  )

  /**
   * We're going to cycle through each of the edits and if there's a match from metadataFieldKeyPublishLookup
   * @type {AuditMessage[]}
   */
  const updatedAuditMessages = edited.reduce((acc, key) => {
    // Get the associated change event mapper
    const mapperFn = metadataFieldKeyMapperLookup[key]

    // Publishes the associated event
    if (mapperFn instanceof Function) {
      const value = Joi.attempt(
        mapperFn(metadata, formUpdated),
        messageSchema,
        {
          abortEarly: false
        }
      )
      return [...acc, value]
    }
    return acc
  }, /** @type {AuditMessage[]} */ ([]))

  return [updatedAuditMessages].flat()
}

/**
 * @import { FormTitleUpdatedMessageData, FormOrganisationUpdatedMessageData, FormMetadata, AuditMessage, FormCreatedMessage, FormCreatedMessageData, MessageBase, MessageData } from '@defra/forms-model'
 * @import { PublishCommandOutput } from '@aws-sdk/client-sns'
 * @import { PartialFormMetadataDocument } from '~/src/api/types.js'
 */
