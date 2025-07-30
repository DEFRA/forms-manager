import {
  AuditEventMessageCategory,
  AuditEventMessageSchemaVersion,
  AuditEventMessageType
} from '@defra/forms-model'
import {
  buildDefinition,
  buildMarkdownComponent,
  buildMetaData,
  buildQuestionPage,
  buildTextFieldComponent
} from '@defra/forms-model/stubs'

import {
  formOrganisationUpdatedMapper,
  formTeamEmailUpdatedMapper,
  formTeamNameUpdatedMapper,
  formUpdatedMapper
} from '~/src/messaging/mappers/form-events.js'

describe('form-events', () => {
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
    const titleChangeComponentOld = buildTextFieldComponent({
      id: '4d40cc62-c8e0-42c8-afbd-7ce10af14fa8',
      title: 'What is your nam?'
    })
    const titleChangeComponentNew = buildTextFieldComponent({
      ...titleChangeComponentOld,
      title: 'What is your name?'
    })

    const markdownComponent = buildMarkdownComponent()

    const oldPageTitleChange = buildQuestionPage({
      id: '153944ea-6545-4916-9b6d-6ef7a4ab0cf4',
      title: 'My old question page',
      components: [markdownComponent]
    })

    const updatedPageTitleChange = buildQuestionPage({
      ...oldPageTitleChange,
      title: 'My updated question page'
    })

    const oldPageWithComponentChange = buildQuestionPage({
      id: '607be95c-7405-476d-a1f8-e5768016136c',
      components: [titleChangeComponentOld]
    })

    const updatedPageWithComponent = buildQuestionPage({
      ...oldPageWithComponentChange,
      components: [titleChangeComponentNew]
    })

    const newPage = buildQuestionPage({
      id: 'b2a5f4e5-142f-4ae6-b7ce-812968f0785c',
      title: 'My new question page'
    })

    it('should map a form updated', () => {
      const formUpdatedEvent = formUpdatedMapper(
        metadata,
        buildDefinition({ name: 'Old form' }),
        buildDefinition({ name: 'New form' })
      )
      expect(formUpdatedEvent).toEqual({
        schemaVersion: AuditEventMessageSchemaVersion.V1,
        category: AuditEventMessageCategory.FORM,
        type: AuditEventMessageType.FORM_UPDATED,
        createdAt: updatedAt,
        createdBy: updatedBy,
        messageCreatedAt: expect.any(Date),
        entityId: formId,
        data: {
          formId,
          slug,
          changeSet: [
            {
              type: 'UPDATE',
              key: 'name',
              oldValue: 'Old form',
              value: 'New form'
            }
          ]
        }
      })
    })

    it('should map a page updated', () => {
      const formUpdatedEvent = formUpdatedMapper(
        metadata,
        buildDefinition({ pages: [oldPageTitleChange] }),
        buildDefinition({ pages: [updatedPageTitleChange] })
      )
      expect(formUpdatedEvent.data.changeSet).toEqual([
        {
          type: 'UPDATE',
          key: 'pages',
          embeddedKey: '$index',
          changes: [
            {
              type: 'UPDATE',
              key: '0',
              changes: [
                {
                  key: 'title',
                  type: 'UPDATE',
                  oldValue: 'My old question page',
                  value: 'My updated question page'
                }
              ]
            }
          ]
        }
      ])
    })

    it('should map a component updated', () => {
      const formUpdatedEvent = formUpdatedMapper(
        metadata,
        buildDefinition({ pages: [oldPageWithComponentChange] }),
        buildDefinition({ pages: [updatedPageWithComponent] })
      )
      expect(formUpdatedEvent.data.changeSet).toEqual([
        {
          type: 'UPDATE',
          key: 'pages',
          embeddedKey: '$index',
          changes: [
            {
              type: 'UPDATE',
              key: '0',
              changes: [
                {
                  key: 'components',
                  type: 'UPDATE',
                  embeddedKey: '$index',
                  changes: [
                    {
                      type: 'UPDATE',
                      key: '0',
                      changes: [
                        {
                          key: 'title',
                          type: 'UPDATE',
                          oldValue: 'What is your nam?',
                          value: 'What is your name?'
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ])
    })

    it('should map a new page added', () => {
      const formUpdatedEvent = formUpdatedMapper(
        metadata,
        buildDefinition({ pages: [] }),
        buildDefinition({ pages: [newPage] })
      )
      expect(formUpdatedEvent.data.changeSet).toEqual([
        {
          type: 'UPDATE',
          key: 'pages',
          embeddedKey: '$index',
          changes: [
            {
              type: 'ADD',
              key: '0',
              value: newPage
            }
          ]
        }
      ])
    })

    it('should map a page reorder', () => {
      const formUpdatedEvent = formUpdatedMapper(
        metadata,
        buildDefinition({
          pages: [updatedPageTitleChange, updatedPageWithComponent, newPage]
        }),
        buildDefinition({
          pages: [updatedPageWithComponent, updatedPageTitleChange, newPage]
        })
      )
      expect(formUpdatedEvent.data.changeSet).toHaveLength(1)
    })
  })
})
