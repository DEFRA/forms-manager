import {
  AuditEventMessageCategory,
  AuditEventMessageSchemaVersion,
  AuditEventMessageType
} from '@defra/forms-model'
import { buildMetaData } from '@defra/forms-model/stubs'
import { ValidationError } from 'joi'

import { publishEvent } from '~/src/helpers/publish-base.js'
import { publishFormCreatedEvent } from '~/src/helpers/publish.js'

jest.mock('~/src/helpers/publish-base.js')

describe('publish', () => {
  describe('publishFormCreatedEvent', () => {
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

    it('should publish the event', async () => {
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
      await publishFormCreatedEvent(metadata)

      expect(publishEvent).toHaveBeenCalledWith({
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
      const invalidMetaData = {
        title,
        organisation,
        teamName,
        teamEmail,
        createdAt,
        createdBy
      }

      // ts-expect-error - invalid schema
      await expect(publishFormCreatedEvent(invalidMetaData)).rejects.toThrow(
        new ValidationError(
          '"data.formId" is required. "data.slug" is required'
        )
      )
    })
  })
})
