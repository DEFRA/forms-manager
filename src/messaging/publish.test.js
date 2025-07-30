import {
  AuditEventMessageCategory,
  AuditEventMessageSchemaVersion,
  AuditEventMessageType
} from '@defra/forms-model'
import { buildMetaData } from '@defra/forms-model/stubs'
import { ValidationError } from 'joi'

import author from '~/src/api/forms/service/__stubs__/author.js'
import { buildFormOrganisationUpdatedMessage } from '~/src/messaging/__stubs__/messages.js'
import { publishEvent } from '~/src/messaging/publish-base.js'
import {
  bulkPublishEvents,
  publishDraftCreatedFromLiveEvent,
  publishFormCreatedEvent,
  publishFormDraftDeletedEvent,
  publishFormTitleUpdatedEvent,
  publishLiveCreatedFromDraftEvent
} from '~/src/messaging/publish.js'

jest.mock('~/src/messaging/publish-base.js')

describe('publish', () => {
  const formId = '3b1bf4b2-1603-4ca5-b885-c509245567aa'
  const slug = 'audit-form'
  const title = 'My Audit Event Form'
  const organisation = 'Defra'
  const teamName = 'Forms'
  const teamEmail = 'forms@example.com'
  const createdAt = new Date('2025-07-23')
  const createdBy = {
    id: '83f09a7d-c80c-4e15-bcf3-641559c7b8a7',
    displayName: 'Enrique Chase'
  }
  const updatedAt = new Date('2025-07-24')
  const updatedBy = {
    id: 'a53b4360-bdf6-4d13-8975-25032ce76312',
    displayName: 'Gandalf'
  }
  const messageId = '2888a402-7609-43c5-975f-b1974969cdb6'
  const metadata = buildMetaData({
    id: formId,
    slug,
    title,
    organisation,
    teamName,
    teamEmail,
    createdAt,
    createdBy,
    updatedAt,
    updatedBy
  })

  beforeEach(() => {
    jest.mocked(publishEvent).mockResolvedValue({
      MessageId: '2888a402-7609-43c5-975f-b1974969cdb6',
      SequenceNumber: undefined,
      $metadata: {}
    })
  })
  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('publishFormCreatedEvent', () => {
    it('should publish FORM_CREATED event', async () => {
      await publishFormCreatedEvent(metadata)

      expect(publishEvent).toHaveBeenCalledWith({
        entityId: formId,
        messageCreatedAt: expect.any(Date),
        schemaVersion: AuditEventMessageSchemaVersion.V1,
        category: AuditEventMessageCategory.FORM,
        type: AuditEventMessageType.FORM_CREATED,
        createdAt,
        createdBy,
        data: {
          formId,
          slug,
          title,
          organisation,
          teamName,
          teamEmail
        }
      })
    })

    it('should not publish the event if the schema is incorrect', async () => {
      jest.mocked(publishEvent).mockRejectedValue(new Error('rejected'))
      const invalidMetaData = {
        title,
        organisation,
        teamName,
        teamEmail,
        createdAt,
        createdBy
      }

      // @ts-expect-error - invalid schema
      await expect(publishFormCreatedEvent(invalidMetaData)).rejects.toThrow(
        new ValidationError(
          '"entityId" is required. "data.formId" is required. "data.slug" is required',
          [],
          invalidMetaData
        )
      )
    })
  })

  describe('publishFormTitleUpdatedEvent', () => {
    it('should publish FORM_TITLE_UPDATED event', async () => {
      const oldMetadata = buildMetaData({
        ...metadata,
        title: 'Old form title'
      })
      const response = await publishFormTitleUpdatedEvent(metadata, oldMetadata)
      expect(response?.MessageId).toBe(messageId)
      expect(publishEvent).toHaveBeenCalledWith({
        entityId: formId,
        messageCreatedAt: expect.any(Date),
        schemaVersion: AuditEventMessageSchemaVersion.V1,
        category: AuditEventMessageCategory.FORM,
        type: AuditEventMessageType.FORM_TITLE_UPDATED,
        createdAt: updatedAt,
        createdBy: updatedBy,
        data: {
          formId: '3b1bf4b2-1603-4ca5-b885-c509245567aa',
          slug: 'audit-form',
          changes: {
            previous: {
              title: 'Old form title'
            },
            new: {
              title
            }
          }
        }
      })
    })
  })

  describe('publishLiveCreatedFromDraftEvent', () => {
    it('should publish FORM_LIVE_CREATED_FROM_DRAFT event', async () => {
      const response = await publishLiveCreatedFromDraftEvent(
        formId,
        updatedAt,
        updatedBy
      )

      expect(response?.MessageId).toBe(messageId)
      expect(publishEvent).toHaveBeenCalledWith({
        entityId: formId,
        messageCreatedAt: expect.any(Date),
        schemaVersion: AuditEventMessageSchemaVersion.V1,
        category: AuditEventMessageCategory.FORM,
        type: AuditEventMessageType.FORM_LIVE_CREATED_FROM_DRAFT,
        createdAt: updatedAt,
        createdBy: updatedBy
      })
    })
  })

  describe('publishDraftCreatedFromLiveEvent', () => {
    it('should publish FORM_DRAFT_CREATED_FROM_LIVE event', async () => {
      const response = await publishDraftCreatedFromLiveEvent(
        formId,
        updatedAt,
        updatedBy
      )

      expect(response?.MessageId).toBe(messageId)
      expect(publishEvent).toHaveBeenCalledWith({
        entityId: formId,
        messageCreatedAt: expect.any(Date),
        schemaVersion: AuditEventMessageSchemaVersion.V1,
        category: AuditEventMessageCategory.FORM,
        type: AuditEventMessageType.FORM_DRAFT_CREATED_FROM_LIVE,
        createdAt: updatedAt,
        createdBy: updatedBy
      })
    })
  })

  describe('publishFormDraftDeletedEvent', () => {
    it('should publish a FORM_DRAFT_DELETED event', async () => {
      const response = await publishFormDraftDeletedEvent(metadata, author)
      expect(response?.MessageId).toBe(messageId)
      expect(publishEvent).toHaveBeenCalledWith({
        entityId: formId,
        messageCreatedAt: expect.any(Date),
        schemaVersion: AuditEventMessageSchemaVersion.V1,
        category: AuditEventMessageCategory.FORM,
        type: AuditEventMessageType.FORM_DRAFT_DELETED,
        createdAt: expect.any(Date),
        createdBy: author,
        data: {
          formId,
          slug
        }
      })
    })
  })

  describe('bulkPublishEvents', () => {
    it('should publish FORM_ORGANISATION_UPDATED', async () => {
      const message = buildFormOrganisationUpdatedMessage()
      const result = await bulkPublishEvents([message])
      expect(result).toEqual([
        {
          type: AuditEventMessageType.FORM_ORGANISATION_UPDATED,
          messageId: '2888a402-7609-43c5-975f-b1974969cdb6'
        }
      ])
      expect(publishEvent).toHaveBeenCalledWith(message)
    })

    it('should fail given rejection', async () => {
      jest.mocked(publishEvent).mockRejectedValue(new Error('an error'))
      const message = buildFormOrganisationUpdatedMessage()

      await expect(bulkPublishEvents([message])).rejects.toThrow()
    })
  })
})
