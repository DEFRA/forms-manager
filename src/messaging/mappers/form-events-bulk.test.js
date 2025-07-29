import {
  AuditEventMessageCategory,
  AuditEventMessageSchemaVersion,
  AuditEventMessageType
} from '@defra/forms-model'
import { buildMetaData } from '@defra/forms-model/stubs'

import { buildPartialFormMetadataDocument } from '~/src/api/forms/service/__stubs__/metadata.js'
import { getFormMetadataAuditMessages } from '~/src/messaging/mappers/form-events-bulk.js'

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
  const metadata = buildMetaData({
    id: formId,
    slug,
    title,
    organisation,
    teamName,
    teamEmail,
    createdAt,
    createdBy
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('getFormMetadataAuditMessages', () => {
    it('should get FORM_ORGANISATION_UPDATED audit message', () => {
      const updatedAt = new Date('2025-07-27')
      const updatedBy = {
        displayName: 'Gandalf',
        id: '29a8b10d-1d7a-40d4-b312-c57f74e1a606'
      }
      const formUpdated = buildPartialFormMetadataDocument({
        organisation: 'Natural England',
        updatedBy,
        updatedAt
      })
      const messages = getFormMetadataAuditMessages(metadata, formUpdated)
      const [formOrgUpdatedMessage] = messages
      expect(messages).toHaveLength(1)
      expect(formOrgUpdatedMessage).toEqual({
        entityId: formId,
        messageCreatedAt: expect.any(Date),
        schemaVersion: AuditEventMessageSchemaVersion.V1,
        category: AuditEventMessageCategory.FORM,
        type: AuditEventMessageType.FORM_ORGANISATION_UPDATED,
        createdAt: updatedAt,
        createdBy: updatedBy,
        data: {
          formId,
          slug: 'audit-form',
          changes: {
            previous: {
              organisation: 'Defra'
            },
            new: {
              organisation: 'Natural England'
            }
          }
        }
      })
    })

    it('should get FORM_TEAM_NAME_UPDATED audit message', () => {
      const updatedAt = new Date('2025-07-27')
      const updatedBy = {
        displayName: 'Gandalf',
        id: '29a8b10d-1d7a-40d4-b312-c57f74e1a606'
      }
      const formUpdated = buildPartialFormMetadataDocument({
        teamName: 'New team name',
        updatedBy,
        updatedAt
      })
      const messages = getFormMetadataAuditMessages(metadata, formUpdated)
      const [formNameUpdatedMessage] = messages
      expect(messages).toHaveLength(1)
      expect(formNameUpdatedMessage).toEqual({
        entityId: formId,
        messageCreatedAt: expect.any(Date),
        schemaVersion: AuditEventMessageSchemaVersion.V1,
        category: AuditEventMessageCategory.FORM,
        type: AuditEventMessageType.FORM_TEAM_NAME_UPDATED,
        createdAt: updatedAt,
        createdBy: updatedBy,
        data: {
          formId,
          slug: 'audit-form',
          changes: {
            previous: {
              teamName: 'Forms'
            },
            new: {
              teamName: 'New team name'
            }
          }
        }
      })
    })

    it('should get FORM_TEAM_EMAIL_UPDATED audit message', () => {
      const updatedAt = new Date('2025-07-27')
      const updatedBy = {
        displayName: 'Gandalf',
        id: '29a8b10d-1d7a-40d4-b312-c57f74e1a606'
      }
      const formUpdated = buildPartialFormMetadataDocument({
        teamEmail: 'newemail@example.com',
        updatedBy,
        updatedAt
      })
      const messages = getFormMetadataAuditMessages(metadata, formUpdated)
      const [formEmailUpdatedMessage] = messages
      expect(messages).toHaveLength(1)
      expect(formEmailUpdatedMessage).toEqual({
        entityId: formId,
        messageCreatedAt: expect.any(Date),
        schemaVersion: AuditEventMessageSchemaVersion.V1,
        category: AuditEventMessageCategory.FORM,
        type: AuditEventMessageType.FORM_TEAM_EMAIL_UPDATED,
        createdAt: updatedAt,
        createdBy: updatedBy,
        data: {
          formId,
          slug: 'audit-form',
          changes: {
            previous: {
              teamEmail: 'forms@example.com'
            },
            new: {
              teamEmail: 'newemail@example.com'
            }
          }
        }
      })
    })

    it('should get FORM_TEAM_NAME_UPDATED and FORM_TEAM_EMAIL_UPDATED audit message', () => {
      const updatedAt = new Date('2025-07-27')
      const updatedBy = {
        displayName: 'Gandalf',
        id: '29a8b10d-1d7a-40d4-b312-c57f74e1a606'
      }
      const formUpdated = buildPartialFormMetadataDocument({
        teamName: 'New team name',
        teamEmail: 'newemail@example.com',
        updatedBy,
        updatedAt
      })
      const messages = getFormMetadataAuditMessages(metadata, formUpdated)
      const [formNameUpdatedMessage, formEmailUpdatedMessage] = messages
      expect(messages).toHaveLength(2)
      expect(formNameUpdatedMessage).toEqual({
        entityId: formId,
        messageCreatedAt: expect.any(Date),
        schemaVersion: AuditEventMessageSchemaVersion.V1,
        category: AuditEventMessageCategory.FORM,
        type: AuditEventMessageType.FORM_TEAM_NAME_UPDATED,
        createdAt: updatedAt,
        createdBy: updatedBy,
        data: {
          formId,
          slug: 'audit-form',
          changes: {
            previous: {
              teamName: 'Forms'
            },
            new: {
              teamName: 'New team name'
            }
          }
        }
      })
      expect(formEmailUpdatedMessage).toEqual({
        entityId: formId,
        messageCreatedAt: expect.any(Date),
        schemaVersion: AuditEventMessageSchemaVersion.V1,
        category: AuditEventMessageCategory.FORM,
        type: AuditEventMessageType.FORM_TEAM_EMAIL_UPDATED,
        createdAt: updatedAt,
        createdBy: updatedBy,
        data: {
          formId,
          slug: 'audit-form',
          changes: {
            previous: {
              teamEmail: 'forms@example.com'
            },
            new: {
              teamEmail: 'newemail@example.com'
            }
          }
        }
      })
    })
  })
})
