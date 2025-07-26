import { messageSchema } from '@defra/forms-model'
import Joi from 'joi'
import { getDiff } from 'json-difference'

import { formTitleUpdatedMapper } from '~/src/messaging/mappers/form-events.js'

/**
 *
 * @type {Record<string, (function(FormMetadata, FormMetadata): AuditMessage)>}
 */
const metadataFieldKeyMapperLookup = {
  title: formTitleUpdatedMapper
}

/**
 * Taking an old metadata object and new metadata object creates all the pp
 * @param {FormMetadata} metadata
 * @param {FormMetadata} oldMetadata
 * @returns {AuditMessage[]}
 */
export function getFormMetadataAuditMessages(metadata, oldMetadata) {
  // getDiff returns shape of {"added": [[key, value], "edited": [[key, oldValue, newValue]], "removed": [key, value]}
  const { edited } = getDiff(oldMetadata, metadata)

  /**
   * We're going to cycle through each of the edits and if there's a match from metadataFieldKeyPublishLookup
   * @type {AuditMessage[]}
   */
  const updatedAuditMessages = edited.reduce((acc, edited) => {
    // Extract the key
    const [key] = edited

    // Get the associated change event mapper
    const mapperFn = metadataFieldKeyMapperLookup[key]

    // Publishes the associated event
    if (mapperFn instanceof Function) {
      const value = Joi.attempt(
        mapperFn(metadata, oldMetadata),
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
 * @import { FormTitleUpdatedMessageData, FormMetadata, AuditMessage, FormCreatedMessage, FormCreatedMessageData, MessageBase, MessageData } from '@defra/forms-model'
 * @import { PublishCommandOutput } from '@aws-sdk/client-sns'
 */
