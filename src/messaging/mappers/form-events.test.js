import {
  AuditEventMessageCategory,
  AuditEventMessageSchemaVersion,
  AuditEventMessageSource,
  AuditEventMessageType,
  FormDefinitionRequestType
} from '@defra/forms-model'
import {
  buildMetaData,
  buildQuestionPage,
  buildTextFieldComponent
} from '@defra/forms-model/stubs'

import author from '~/src/api/forms/service/__stubs__/author.js'
import {
  formOrganisationUpdatedMapper,
  formTeamEmailUpdatedMapper,
  formTeamNameUpdatedMapper,
  formTitleUpdatedMapper,
  formUpdatedMapper
} from '~/src/messaging/mappers/form-events.js'

describe('form-events', () => {
  describe('formTitleUpdatedMapper', () => {
    it('should include draft status for draft title updates', () => {
      const metadata = buildMetaData({
        title: 'New title',
        slug: 'new-title'
      })
      const oldMetadata = buildMetaData({
        title: 'Old title',
        slug: 'old-title'
      })

      expect(formTitleUpdatedMapper(metadata, oldMetadata)).toMatchObject({
        type: AuditEventMessageType.FORM_TITLE_UPDATED,
        data: {
          payload: {
            formStatus: 'draft'
          },
          changes: {
            previous: {
              title: 'Old title'
            },
            new: {
              title: 'New title'
            }
          }
        }
      })
    })

    it('should include live status for live title updates', () => {
      const metadata = buildMetaData({
        title: 'New title',
        slug: 'existing-slug',
        live: {
          createdAt: new Date('2025-08-31'),
          createdBy: author,
          updatedAt: new Date('2025-08-31'),
          updatedBy: author
        }
      })
      const oldMetadata = buildMetaData({
        title: 'Old title',
        slug: 'existing-slug',
        live: {
          createdAt: new Date('2025-08-31'),
          createdBy: author,
          updatedAt: new Date('2025-08-31'),
          updatedBy: author
        }
      })

      expect(formTitleUpdatedMapper(metadata, oldMetadata)).toMatchObject({
        type: AuditEventMessageType.FORM_TITLE_UPDATED,
        data: {
          payload: {
            formStatus: 'live'
          },
          changes: {
            previous: {
              title: 'Old title'
            },
            new: {
              title: 'New title'
            }
          }
        }
      })
    })
  })

  describe('formOrganisationUpdatedMapper', () => {
    it('should fail if organisation is missing', () => {
      expect(() => formOrganisationUpdatedMapper(buildMetaData(), {})).toThrow()
    })
  })

  describe('formTeamNameUpdatedMapper', () => {
    it('should fail if teamName is missing', () => {
      expect(() => formTeamNameUpdatedMapper(buildMetaData(), {})).toThrow()
    })
  })

  describe('formTeamEmailUpdatedMapper', () => {
    it('should fail if teamEmail is missing', () => {
      expect(() => formTeamEmailUpdatedMapper(buildMetaData(), {})).toThrow()
    })
  })

  describe('formUpdatedMapper', () => {
    const formId = '6883d8667a2a64da10af4312'
    const updatedAt = new Date('2025-08-31')

    const metadata = buildMetaData({
      id: formId,
      updatedAt,
      updatedBy: author,
      slug: 'my-form'
    })
    it('should map a payload into a FORM_UPDATED replaced event', () => {
      const requestType = FormDefinitionRequestType.REPLACE_DRAFT
      const s3Meta = {
        fileId: '1111111111',
        filename: '6883d8667a2a64da10af4312.json',
        s3Key: formId
      }
      expect(formUpdatedMapper(metadata, requestType, { s3Meta })).toEqual({
        schemaVersion: AuditEventMessageSchemaVersion.V1,
        category: AuditEventMessageCategory.FORM,
        source: AuditEventMessageSource.FORMS_MANAGER,
        type: AuditEventMessageType.FORM_UPDATED,
        entityId: formId,
        createdAt: updatedAt,
        createdBy: author,
        messageCreatedAt: expect.any(Date),
        data: {
          requestType,
          s3Meta,
          formId,
          slug: 'my-form'
        }
      })
    })

    it('should map a payload into a FORM_UPDATED event', () => {
      const payload = buildQuestionPage({
        title: 'Question page',
        components: [
          buildTextFieldComponent({
            title: 'What question would you like to ask?'
          })
        ]
      })
      const requestType = FormDefinitionRequestType.CREATE_PAGE

      expect(formUpdatedMapper(metadata, requestType, { payload })).toEqual({
        schemaVersion: AuditEventMessageSchemaVersion.V1,
        category: AuditEventMessageCategory.FORM,
        source: AuditEventMessageSource.FORMS_MANAGER,
        type: AuditEventMessageType.FORM_UPDATED,
        entityId: formId,
        createdAt: updatedAt,
        createdBy: author,
        messageCreatedAt: expect.any(Date),
        data: {
          requestType,
          formId,
          slug: 'my-form',
          payload
        }
      })
    })
  })
})
