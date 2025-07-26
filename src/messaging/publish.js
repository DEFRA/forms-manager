import { messageSchema } from '@defra/forms-model'
import Joi from 'joi'
import { getDiff } from 'json-difference'

import {
  formCreatedEventMapper,
  formTitleUpdatedMapper
} from '~/src/messaging/mappers/form-events.js'
import { publishEvent } from '~/src/messaging/publish-base.js'

/**
 * Helper to publish form events
 * @param {AuditMessage} auditMessage
 * @returns {Promise<PublishCommandOutput>}
 */
async function publishFormEvent(auditMessage) {
  const value = Joi.attempt(auditMessage, messageSchema, {
    abortEarly: false
  })

  return publishEvent(value)
}

/**
 * Publish form created event
 * @param {FormMetadata} metadata
 */
export async function publishFormCreatedEvent(metadata) {
  const auditMessage = formCreatedEventMapper(metadata)

  return publishFormEvent(auditMessage)
}

/**
 * Publishes a form title updated event
 * @param {FormMetadata} metadata
 * @param {FormMetadata} oldMetadata
 */
export async function publishFormTitleUpdatedEvent(metadata, oldMetadata) {
  const auditMessage = formTitleUpdatedMapper(metadata, oldMetadata)

  return publishFormEvent(auditMessage)
}

/**
 *
 * @type {Record<string, (function(FormMetadata, FormMetadata): Promise<PublishCommandOutput>)>}
 */
const metadataFieldKeyPublishLookup = {
  title: publishFormTitleUpdatedEvent
}

/**
 * Taking an old metadata object and new metadata object publishes all the associated change events
 * @param {FormMetadata} metadata
 * @param {FormMetadata} oldMetadata
 * @returns {Promise<PromiseSettledResult<PublishCommandOutput>[]>}
 */
export async function publishFormMetadataUpdatedEvent(metadata, oldMetadata) {
  // getDiff returns shape of {"added": [[key, value], "edited": [[key, oldValue, newValue]], "removed": [key, value]}
  const { edited } = getDiff(oldMetadata, metadata)

  /**
   * We're going to cycle through each of the edits and if there's a match from metadataFieldKeyPublishLookup
   * @type {Promise<PublishCommandOutput>[]}
   */
  const editedPromises = edited.reduce((acc, edited) => {
    // Extract the key
    const [key] = edited

    // Get the associated change event method
    const publishFn = metadataFieldKeyPublishLookup[key]

    // Publishes the associated event
    if (publishFn instanceof Function) {
      return [...acc, publishFn(metadata, oldMetadata)]
    }
    return acc
  }, /** @type {Promise<PublishCommandOutput>[]} */ ([]))

  return Promise.allSettled(editedPromises)
}

/**
 * @import { FormTitleUpdatedMessageData, FormMetadata, AuditMessage, AuditChanges, FormCreatedMessage, FormCreatedMessageData, MessageBase, MessageData } from '@defra/forms-model'
 * @import { PublishCommandOutput } from '@aws-sdk/client-sns'
 */
