import { AuditEventMessageType } from '@defra/forms-model'
import { buildMetaData } from '@defra/forms-model/stubs'

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
    it('should get FORM_TITLE_UPDATED audit message', () => {
      const oldMetadata = buildMetaData({
        ...metadata,
        title: 'Old form title'
      })
      const messages = getFormMetadataAuditMessages(metadata, oldMetadata)
      const [formTitleUpdatedMessage] = messages
      expect(messages).toHaveLength(1)
      expect(formTitleUpdatedMessage.type).toBe(
        AuditEventMessageType.FORM_TITLE_UPDATED
      )
    })
  })
})
