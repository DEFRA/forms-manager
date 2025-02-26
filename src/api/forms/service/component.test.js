import Boom from '@hapi/boom'
import { pino } from 'pino'

import {
  buildDefinition,
  buildQuestionPage,
  buildStatusPage,
  buildTextFieldComponent
} from '~/src/api/forms/__stubs__/definition.js'
import * as formDefinition from '~/src/api/forms/repositories/form-definition-repository.js'
import * as formMetadata from '~/src/api/forms/repositories/form-metadata-repository.js'
import { formMetadataDocument } from '~/src/api/forms/service/__stubs__/service.js'
import {
  createComponentOnDraftDefinition,
  deleteComponentOnDraftDefinition,
  getFormDefinitionPageComponent,
  updateComponentOnDraftDefinition
} from '~/src/api/forms/service/component.js'
import * as formTemplates from '~/src/api/forms/templates.js'
import { getAuthor } from '~/src/helpers/get-author.js'
import { prepareDb } from '~/src/mongo.js'

jest.mock('~/src/helpers/get-author.js')
jest.mock('~/src/api/forms/repositories/form-definition-repository.js')
jest.mock('~/src/api/forms/repositories/form-metadata-repository.js')
jest.mock('~/src/api/forms/templates.js')
jest.mock('~/src/mongo.js', () => {
  let isPrepared = false

  return {
    get client() {
      if (!isPrepared) {
        return undefined
      }

      return {
        startSession: () => ({
          endSession: jest.fn().mockResolvedValue(undefined),
          withTransaction: jest.fn(
            /**
             * Mock transaction handler
             * @param {() => Promise<void>} fn
             */
            async (fn) => fn()
          )
        })
      }
    },

    prepareDb() {
      isPrepared = true
      return Promise.resolve()
    }
  }
})

jest.useFakeTimers().setSystemTime(new Date('2020-01-01'))

const { empty: emptyFormWithSummary } = /** @type {typeof formTemplates} */ (
  jest.requireActual('~/src/api/forms/templates.js')
)
const author = getAuthor()
const DRAFT = 'draft'

describe('Forms service', () => {
  const id = '661e4ca5039739ef2902b214'
  const dateUsedInFakeTime = new Date('2020-01-01')
  const pageId = 'ffefd409-f3f4-49fe-882e-6e89f44631b1'
  const componentId = 'b008e366-7136-4159-b2c6-db3ee8e75ab7'

  let definition = emptyFormWithSummary()

  beforeAll(async () => {
    await prepareDb(pino())
  })

  beforeEach(() => {
    definition = emptyFormWithSummary()
    jest.mocked(formTemplates.empty).mockReturnValue(definition)
    jest.mocked(formMetadata.get).mockResolvedValue(formMetadataDocument)
  })

  describe('getFormDefinitionPageComponent', () => {
    it('should get component if one exists', async () => {
      const textFieldComponent = buildTextFieldComponent({
        id: componentId
      })
      const page = buildQuestionPage({
        id: pageId,
        components: [textFieldComponent]
      })
      const definition1 = buildDefinition({
        pages: [page]
      })
      jest.mocked(formDefinition.get).mockResolvedValueOnce(definition1)

      const component = await getFormDefinitionPageComponent(
        id,
        pageId,
        componentId
      )
      expect(component).toEqual(textFieldComponent)
    })

    it('should fail is component does not exist', async () => {
      const textFieldComponent = buildTextFieldComponent({})
      const page = buildQuestionPage({
        id: pageId,
        components: [textFieldComponent]
      })
      const definition1 = buildDefinition({
        pages: [page]
      })

      jest.mocked(formDefinition.get).mockResolvedValueOnce(definition1)

      await expect(
        getFormDefinitionPageComponent(
          '123',
          pageId,
          'invalid-component-id',
          undefined
        )
      ).rejects.toThrow(
        Boom.notFound(
          'Component ID invalid-component-id not found on Page ID ffefd409-f3f4-49fe-882e-6e89f44631b1 & Form ID 123'
        )
      )
    })
  })

  describe('createComponentOnDraftDefinition', () => {
    const pageId = 'bdadbe9d-3c4d-4ec1-884d-e3576d60fe9d'
    const questionPage = buildQuestionPage({
      id: pageId
    })
    const definition1 = buildDefinition({
      ...definition,
      pages: [questionPage, ...definition.pages]
    })
    const textFieldComponent = buildTextFieldComponent()

    it('should add a component to the end of a DraftDefinition page', async () => {
      jest.mocked(formDefinition.get).mockResolvedValueOnce(definition1)
      const [createdComponent] = await createComponentOnDraftDefinition(
        '123',
        pageId,
        [textFieldComponent],
        author
      )
      const dbMetadataSpy = jest.spyOn(formMetadata, 'update')
      const dbDefinitionSpy = jest.spyOn(formDefinition, 'addComponents')

      expect(dbDefinitionSpy).toHaveBeenCalled()
      expect(dbMetadataSpy).toHaveBeenCalled()
      const [metaFormId, metaUpdateOperations] = dbMetadataSpy.mock.calls[0]
      const [formId, calledPageId, components, , state] =
        dbDefinitionSpy.mock.calls[0]

      expect(formId).toBe('123')
      expect(calledPageId).toBe(pageId)
      expect(components).toEqual([
        { ...textFieldComponent, id: expect.any(String) }
      ])
      expect(state).toEqual({ state: DRAFT })

      expect(metaFormId).toBe('123')

      expect(metaUpdateOperations.$set).toEqual({
        'draft.updatedAt': dateUsedInFakeTime,
        'draft.updatedBy': author,
        updatedAt: dateUsedInFakeTime,
        updatedBy: author
      })
      expect(createdComponent).toMatchObject({
        ...createdComponent,
        id: expect.any(String)
      })
    })

    it('should add a component to the start of a DraftDefinition page if called with prepend=true', async () => {
      jest.mocked(formDefinition.get).mockResolvedValueOnce(definition1)
      await createComponentOnDraftDefinition(
        '123',
        pageId,
        [textFieldComponent],
        author,
        true
      )
      const dbDefinitionSpy = jest.spyOn(formDefinition, 'addComponents')

      const [, , , , options] = dbDefinitionSpy.mock.calls[0]

      expect(options).toEqual({ state: DRAFT, position: 0 })
    })

    it('should fail if page does not exist', async () => {
      const textFieldComponent = buildTextFieldComponent()
      const definition2 = buildDefinition(definition)

      jest.mocked(formDefinition.get).mockResolvedValueOnce(definition2)

      await expect(
        createComponentOnDraftDefinition(
          '123',
          'bdadbe9d-3c4d-4ec1-884d-e3576d60fe9d',
          [textFieldComponent],
          author
        )
      ).rejects.toThrow(
        Boom.notFound(
          'Page ID bdadbe9d-3c4d-4ec1-884d-e3576d60fe9d not found on Form ID 123'
        )
      )
    })
    it('should surface errors correctly', async () => {
      jest
        .mocked(formDefinition.addComponents)
        .mockRejectedValueOnce(Boom.badRequest('Error'))
      jest.mocked(formDefinition.get).mockResolvedValueOnce(definition1)
      await expect(
        createComponentOnDraftDefinition(
          '123',
          'bdadbe9d-3c4d-4ec1-884d-e3576d60fe9d',
          [textFieldComponent],
          author
        )
      ).rejects.toThrow(Boom.badRequest('Error'))
    })
  })

  describe('updateComponentOnDraftDefinition', () => {
    const textFieldComponent = buildTextFieldComponent({
      id: componentId,
      title: 'Old title'
    })
    const newTextFieldComponent = buildTextFieldComponent({
      id: componentId,
      title: 'New title'
    })
    const page = buildQuestionPage({
      id: pageId,
      components: [textFieldComponent]
    })
    const definition1 = buildDefinition({
      pages: [page]
    })

    it('should update the component', async () => {
      const newDefinition = buildDefinition({
        pages: [
          buildQuestionPage({
            id: pageId,
            components: [newTextFieldComponent]
          })
        ]
      })
      jest.mocked(formDefinition.get).mockResolvedValueOnce(definition1)
      jest.mocked(formDefinition.get).mockResolvedValueOnce(newDefinition)

      const dbDefinitionSpy = jest.spyOn(formDefinition, 'updateComponent')
      const dbMetadataSpy = jest.spyOn(formMetadata, 'update')

      const component = await updateComponentOnDraftDefinition(
        id,
        pageId,
        componentId,
        newTextFieldComponent,
        author
      )

      expect(component).toEqual(newTextFieldComponent)
      expect(dbDefinitionSpy).toHaveBeenCalled()
      const [
        calledFormId,
        calledPageId,
        calledComponentId,
        calledComponent,
        ,
        calledState
      ] = dbDefinitionSpy.mock.calls[0]

      expect([
        calledFormId,
        calledPageId,
        calledComponentId,
        calledState
      ]).toEqual([id, pageId, componentId, DRAFT])
      expect(calledComponent).toEqual(newTextFieldComponent)
      const [metaFormId, metaUpdateOperations] = dbMetadataSpy.mock.calls[0]
      expect(metaFormId).toBe(id)

      expect(metaUpdateOperations.$set).toEqual({
        'draft.updatedAt': dateUsedInFakeTime,
        'draft.updatedBy': author,
        updatedAt: dateUsedInFakeTime,
        updatedBy: author
      })
    })

    it('should fail if component is not updated', async () => {
      jest.mocked(formDefinition.get).mockResolvedValueOnce(definition1)
      jest.mocked(formDefinition.get).mockResolvedValueOnce(definition1)

      await expect(
        updateComponentOnDraftDefinition(
          id,
          pageId,
          componentId,
          newTextFieldComponent,
          author
        )
      ).rejects.toThrow(
        Boom.internal(
          'Component b008e366-7136-4159-b2c6-db3ee8e75ab7 not updated on Page ID ffefd409-f3f4-49fe-882e-6e89f44631b1 and Form ID 661e4ca5039739ef2902b214'
        )
      )
    })
  })

  describe('deleteComponentOnDraftDefinition', () => {
    const componentId1 = '6dba3b08-3262-45ab-a666-babafa8b919b'
    const componentId2 = '756de148-7612-4787-b522-17d3c39e31dc'
    const componentId3 = '4b827d8a-e216-409a-86f1-2a04626ee7b2'
    const textFieldComponents = [
      buildTextFieldComponent({
        id: componentId1,
        title: 'Component 1'
      }),
      buildTextFieldComponent({
        id: componentId2,
        title: 'Component 2'
      }),
      buildTextFieldComponent({
        id: componentId3,
        title: 'Component 3'
      })
    ]

    const page = buildQuestionPage({
      id: pageId,
      components: textFieldComponents
    })
    const definition1 = buildDefinition({
      pages: [page]
    })

    it('should delete the component', async () => {
      const newDefinition = buildDefinition({
        pages: [
          buildQuestionPage({
            id: pageId,
            components: textFieldComponents.filter((x) => x.id !== componentId2)
          })
        ]
      })
      jest.mocked(formDefinition.get).mockResolvedValueOnce(newDefinition)

      const dbDefinitionSpy = jest.spyOn(formDefinition, 'deleteComponent')
      const dbMetadataSpy = jest.spyOn(formMetadata, 'update')

      await deleteComponentOnDraftDefinition(id, pageId, componentId2, author)

      expect(dbDefinitionSpy).toHaveBeenCalled()
      const [calledFormId, calledPageId, calledComponentId, , calledState] =
        dbDefinitionSpy.mock.calls[0]

      expect([
        calledFormId,
        calledPageId,
        calledComponentId,
        calledState
      ]).toEqual([id, pageId, componentId2, DRAFT])
      const [metaFormId, metaUpdateOperations] = dbMetadataSpy.mock.calls[0]
      expect(metaFormId).toBe(id)

      expect(metaUpdateOperations.$set).toEqual({
        'draft.updatedAt': dateUsedInFakeTime,
        'draft.updatedBy': author,
        updatedAt: dateUsedInFakeTime,
        updatedBy: author
      })
    })

    it('should not fail if no component exists', async () => {
      const newDefinition = buildDefinition({
        pages: [
          buildStatusPage({
            id: pageId
          })
        ]
      })
      jest.mocked(formDefinition.get).mockResolvedValueOnce(newDefinition)

      const dbDefinitionSpy = jest.spyOn(formDefinition, 'deleteComponent')
      const dbMetadataSpy = jest.spyOn(formMetadata, 'update')

      await deleteComponentOnDraftDefinition(id, pageId, componentId2, author)

      expect(dbDefinitionSpy).toHaveBeenCalled()
      expect(dbMetadataSpy).toHaveBeenCalled()
    })

    it('should fail if component is not deleted', async () => {
      jest.mocked(formDefinition.get).mockResolvedValueOnce(definition1)
      jest.mocked(formDefinition.get).mockResolvedValueOnce(definition1)

      await expect(
        deleteComponentOnDraftDefinition(id, pageId, componentId2, author)
      ).rejects.toThrow(
        Boom.internal(
          `Component ${componentId2} not deleted on Page ID ffefd409-f3f4-49fe-882e-6e89f44631b1 and Form ID 661e4ca5039739ef2902b214`
        )
      )
    })
  })
})

/**
 * @import { FormMetadata, FormMetadataDocument, FormMetadataInput } from '@defra/forms-model'
 * @import { WithId } from 'mongodb'
 */
