import { ControllerType } from '@defra/forms-model'
import Boom from '@hapi/boom'
import { pino } from 'pino'

import {
  buildDefinition,
  buildQuestionPage,
  buildSummaryPage
} from '~/src/api/forms/__stubs__/definition.js'
import * as formDefinition from '~/src/api/forms/repositories/form-definition-repository.js'
import * as formMetadata from '~/src/api/forms/repositories/form-metadata-repository.js'
import {
  DRAFT,
  formMetadataDocument
} from '~/src/api/forms/service/__stubs__/service.js'
import {
  addPageIdsPipeline,
  createPageOnDraftDefinition,
  getFormDefinitionPage,
  patchFieldsOnDraftDefinitionPage,
  repositionSummaryPipeline
} from '~/src/api/forms/service/page.js'
import { empty as emptyFormWithSummary } from '~/src/api/forms/templates.js'
import { getAuthor } from '~/src/helpers/get-author.js'
import { prepareDb } from '~/src/mongo.js'

jest.mock('~/src/helpers/get-author.js')
jest.mock('~/src/api/forms/repositories/form-definition-repository.js')
jest.mock('~/src/api/forms/repositories/form-metadata-repository.js')
jest.mock('~/src/mongo.js')

jest.useFakeTimers().setSystemTime(new Date('2020-01-01'))

const author = getAuthor()
const summaryPage = buildSummaryPage()
describe('Forms service', () => {
  const id = '661e4ca5039739ef2902b214'
  const dateUsedInFakeTime = new Date('2020-01-01')
  const pageId = 'ffefd409-f3f4-49fe-882e-6e89f44631b1'

  let definition = emptyFormWithSummary()

  beforeAll(async () => {
    await prepareDb(pino())
  })

  beforeEach(() => {
    definition = emptyFormWithSummary()
    jest.mocked(formMetadata.get).mockResolvedValue(formMetadataDocument)
  })

  describe('repositionSummaryPipeline', () => {
    const summary = buildSummaryPage()

    it('should reposition summary if it exists but is not at the end', async () => {
      const initialSummary = buildSummaryPage()
      delete initialSummary.id

      const removeMatchingPagesSpy = jest.spyOn(
        formDefinition,
        'removeMatchingPages'
      )
      const addPageAtPositionSpy = jest.spyOn(
        formDefinition,
        'addPageAtPosition'
      )
      const formMetadataUpdateSpy = jest.spyOn(formMetadata, 'update')

      const formDefinition1 = buildDefinition({
        pages: [initialSummary, buildQuestionPage()]
      })

      const returnedSummary = await repositionSummaryPipeline(
        id,
        formDefinition1,
        author
      )

      expect(removeMatchingPagesSpy).toHaveBeenCalled()
      expect(addPageAtPositionSpy).toHaveBeenCalled()
      expect(formMetadataUpdateSpy).toHaveBeenCalled()

      const [formId1, matchCriteria, , state] =
        removeMatchingPagesSpy.mock.calls[0]
      const [formId2, calledSummary, , options] =
        addPageAtPositionSpy.mock.calls[0]
      const [formId3, updateFilter] = formMetadataUpdateSpy.mock.calls[0]

      expect(formId1).toBe(id)
      expect(formId2).toBe(id)
      expect(formId3).toBe(id)
      expect(matchCriteria).toEqual({ controller: ControllerType.Summary })
      expect(calledSummary).toEqual(summary)
      expect(state).toBeUndefined()
      expect(options).toEqual({})
      expect(updateFilter.$set).toEqual({
        'draft.updatedAt': dateUsedInFakeTime,
        'draft.updatedBy': author,
        updatedAt: dateUsedInFakeTime,
        updatedBy: author
      })
      expect(returnedSummary.summary).toEqual(summary)
    })

    it('should not reposition the summary if no pages exist', async () => {
      const formDefinition1 = buildDefinition({
        pages: []
      })
      const removeMatchingPagesSpy = jest.spyOn(
        formDefinition,
        'removeMatchingPages'
      )
      const addPageAtPositionSpy = jest.spyOn(
        formDefinition,
        'addPageAtPosition'
      )
      const formMetadataUpdateSpy = jest.spyOn(formMetadata, 'update')
      await repositionSummaryPipeline(id, formDefinition1, author)

      expect(removeMatchingPagesSpy).not.toHaveBeenCalled()
      expect(addPageAtPositionSpy).not.toHaveBeenCalled()
      expect(formMetadataUpdateSpy).not.toHaveBeenCalled()
    })

    it('should not reposition the summary if summary is at the end', async () => {
      const formDefinition1 = buildDefinition({
        pages: [buildQuestionPage(), summaryPage]
      })
      const removeMatchingPagesSpy = jest.spyOn(
        formDefinition,
        'removeMatchingPages'
      )
      const addPageAtPositionSpy = jest.spyOn(
        formDefinition,
        'addPageAtPosition'
      )
      const formMetadataUpdateSpy = jest.spyOn(formMetadata, 'update')
      await repositionSummaryPipeline(id, formDefinition1, author)

      expect(removeMatchingPagesSpy).not.toHaveBeenCalled()
      expect(addPageAtPositionSpy).not.toHaveBeenCalled()
      expect(formMetadataUpdateSpy).not.toHaveBeenCalled()
    })

    it('should not reposition the summary if pages do not contain a summary', async () => {
      const formDefinition1 = buildDefinition({
        pages: [buildQuestionPage()]
      })

      const removeMatchingPagesSpy = jest.spyOn(
        formDefinition,
        'removeMatchingPages'
      )
      const addPageAtPositionSpy = jest.spyOn(
        formDefinition,
        'addPageAtPosition'
      )
      const formMetadataUpdateSpy = jest.spyOn(formMetadata, 'update')
      await repositionSummaryPipeline(id, formDefinition1, author)

      expect(removeMatchingPagesSpy).not.toHaveBeenCalled()
      expect(addPageAtPositionSpy).not.toHaveBeenCalled()
      expect(formMetadataUpdateSpy).not.toHaveBeenCalled()
    })

    it('should surface errors correctly', async () => {
      jest
        .mocked(formDefinition.addPageAtPosition)
        .mockRejectedValueOnce(Boom.badRequest('Error'))

      const formDefinition1 = buildDefinition({
        pages: [summary, buildQuestionPage()]
      })
      await expect(
        repositionSummaryPipeline('123', formDefinition1, author)
      ).rejects.toThrow(Boom.badRequest('Error'))
    })
  })

  describe('addPageIdsPipeline', () => {
    it('should add ids to each of the pages where they are missing', async () => {
      const pageOneWithoutId = buildQuestionPage({
        path: '/page-one'
      })
      delete pageOneWithoutId.id
      const pageTwoWithId = buildQuestionPage({
        path: '/path-two'
      })
      const summaryPageWithoutId = buildSummaryPage({
        path: '/summary'
      })
      delete summaryPageWithoutId.id

      const definition = buildDefinition({
        pages: [pageOneWithoutId, pageTwoWithId, summaryPageWithoutId]
      })

      jest.mocked(formDefinition.get).mockResolvedValue(definition)

      const dbMetadataSpy = jest.spyOn(formMetadata, 'update')
      const dbDefinitionSpy = jest.spyOn(formDefinition, 'addPageFieldByPath')

      await addPageIdsPipeline(id, author)

      expect(dbDefinitionSpy).toHaveBeenCalledTimes(2)
      expect(dbMetadataSpy).toHaveBeenCalledTimes(1)

      const [formId1, path1, fieldsToUpdate1] = dbDefinitionSpy.mock.calls[0]
      const [formId2, path2, fieldsToUpdate2] = dbDefinitionSpy.mock.calls[1]
      const [formId3, updateFilter] = dbMetadataSpy.mock.calls[0]

      expect([formId1, formId2, formId3]).toEqual([id, id, id])
      expect([path1, path2]).toEqual(['/page-one', '/summary'])
      expect(fieldsToUpdate1).toMatchObject({ id: expect.any(String) })
      expect(fieldsToUpdate2).toMatchObject({ id: expect.any(String) })

      expect(updateFilter.$set).toEqual({
        'draft.updatedAt': dateUsedInFakeTime,
        'draft.updatedBy': author,
        updatedAt: dateUsedInFakeTime,
        updatedBy: author
      })
    })

    it('should surface any errors', async () => {
      jest
        .spyOn(formDefinition, 'get')
        .mockRejectedValueOnce(Boom.internal('any'))
      await expect(addPageIdsPipeline(id, author)).rejects.toThrow(
        Boom.internal('any')
      )
    })
  })

  describe('getFormDefinitionPage', () => {
    it('should get a page if it exists', async () => {
      const questionPageId = 'd9c99072-d25d-4688-ab7d-3822cffe802b'
      const questionPage = buildQuestionPage({
        id: questionPageId
      })

      const definition2 = buildDefinition({
        pages: [questionPage, summaryPage]
      })

      jest.mocked(formDefinition.get).mockResolvedValueOnce(definition2)

      const foundPage = await getFormDefinitionPage('123', questionPageId)

      expect(foundPage).toEqual(questionPage)
    })

    it('should fail is page does not exist', async () => {
      const definition2 = buildDefinition(definition)

      jest.mocked(formDefinition.get).mockResolvedValueOnce(definition2)

      await expect(
        getFormDefinitionPage('123', 'bdadbe9d-3c4d-4ec1-884d-e3576d60fe9d')
      ).rejects.toThrow(
        Boom.notFound(
          'Page ID bdadbe9d-3c4d-4ec1-884d-e3576d60fe9d not found on Form ID 123'
        )
      )
    })
  })

  describe('createPageOnDraftDefinition', () => {
    it('should create a new page when a summary page exists', async () => {
      const formDefinitionPageCustomisedTitle = buildQuestionPage({
        title: 'A new form page',
        path: '/a-new-form-page'
      })

      jest.mocked(formDefinition.get).mockResolvedValueOnce(definition)

      const dbMetadataSpy = jest.spyOn(formMetadata, 'update')
      const dbDefinitionSpy = jest.spyOn(formDefinition, 'addPageAtPosition')

      const page = await createPageOnDraftDefinition(
        id,
        formDefinitionPageCustomisedTitle,
        author
      )
      const dbOperationArgs = dbMetadataSpy.mock.calls[0]
      const [formId1, page1, , options] = dbDefinitionSpy.mock.calls[0]

      expect(formId1).toBe(id)
      expect(page1).toMatchObject({
        ...formDefinitionPageCustomisedTitle,
        id: expect.any(String)
      })
      expect(options).toEqual({ position: -1 })
      expect(dbOperationArgs[0]).toBe(id)
      expect(dbOperationArgs[1].$set).toEqual({
        'draft.updatedAt': dateUsedInFakeTime,
        'draft.updatedBy': author,
        updatedAt: dateUsedInFakeTime,
        updatedBy: author
      })
      expect(page).toMatchObject({
        ...formDefinitionPageCustomisedTitle,
        id: expect.any(String)
      })
    })

    it('should create a new page when a summary page does not exist', async () => {
      const formDefinitionPageCustomisedTitle = buildQuestionPage({
        title: 'A new form page',
        path: '/a-new-form-page'
      })
      const definitionWithoutSummary = buildDefinition({
        pages: []
      })

      jest
        .mocked(formDefinition.get)
        .mockResolvedValueOnce(definitionWithoutSummary)

      const dbMetadataSpy = jest.spyOn(formMetadata, 'update')
      const dbDefinitionSpy = jest.spyOn(formDefinition, 'addPageAtPosition')

      await createPageOnDraftDefinition(
        id,
        formDefinitionPageCustomisedTitle,
        author
      )
      const dbOperationArgs = dbMetadataSpy.mock.calls[0]

      expect(dbDefinitionSpy).toHaveBeenCalledWith(
        id,
        {
          ...formDefinitionPageCustomisedTitle,
          id: expect.any(String)
        },
        expect.anything(),
        {}
      )
      expect(dbOperationArgs[0]).toBe(id)
      expect(dbOperationArgs[1].$set).toEqual({
        'draft.updatedAt': dateUsedInFakeTime,
        'draft.updatedBy': author,
        updatedAt: dateUsedInFakeTime,
        updatedBy: author
      })
    })

    it('should fail if path is duplicate', async () => {
      const pageOne = buildQuestionPage({
        path: '/page-one'
      })
      const pageOneDuplicate = buildQuestionPage({
        title: 'Page One Duplicate',
        path: '/page-one'
      })
      const definition1 = buildDefinition({
        ...definition,
        pages: [pageOne]
      })

      jest.mocked(formDefinition.get).mockResolvedValueOnce(definition1)

      await expect(
        createPageOnDraftDefinition('123', pageOneDuplicate, author)
      ).rejects.toThrow(Boom.conflict('Duplicate page path on Form ID 123'))
    })

    it('should fail if no draft definition exists', async () => {
      jest
        .mocked(formDefinition.get)
        .mockRejectedValueOnce(Boom.notFound('Error'))

      const dbMetadataSpy = jest.spyOn(formMetadata, 'update')

      await expect(
        createPageOnDraftDefinition('123', buildQuestionPage({}), author)
      ).rejects.toThrow(Boom.notFound('Error'))
      expect(dbMetadataSpy).not.toHaveBeenCalled()
    })

    it('should surface errors correctly', async () => {
      jest
        .mocked(formDefinition.addPageAtPosition)
        .mockRejectedValueOnce(Boom.badRequest('Error'))
      jest.mocked(formDefinition.get).mockResolvedValueOnce(definition)
      await expect(
        createPageOnDraftDefinition('123', buildQuestionPage({}), author)
      ).rejects.toThrow(Boom.badRequest('Error'))
    })
  })

  describe('patchFieldsOnDraftDefinitionPage', () => {
    const initialPage = buildQuestionPage()
    const pageFields = /** @satisfies {PatchPageFields} */ {
      title: 'Updated Title',
      path: '/updated-title'
    }
    const initialDefinition = buildDefinition({
      pages: [initialPage, summaryPage]
    })

    it('should update page fields', async () => {
      jest.mocked(formDefinition.get).mockResolvedValueOnce(initialDefinition)
      const expectedPage = buildQuestionPage({
        ...pageFields
      })
      jest.mocked(formDefinition.get).mockResolvedValueOnce(
        buildDefinition({
          pages: [expectedPage, summaryPage]
        })
      )
      const page = await patchFieldsOnDraftDefinitionPage(
        '123',
        pageId,
        pageFields,
        author
      )

      expect(page).toEqual(expectedPage)
      const dbMetadataSpy = jest.spyOn(formMetadata, 'update')
      const dbDefinitionSpy = jest.spyOn(formDefinition, 'updatePageFields')
      const dbDefinitionGetSpy = jest.spyOn(formDefinition, 'get')

      expect(dbMetadataSpy).toHaveBeenCalled()
      const [metaFormId, metaUpdateOperations] = dbMetadataSpy.mock.calls[0]
      expect(metaFormId).toBe('123')

      expect(metaUpdateOperations.$set).toEqual({
        'draft.updatedAt': dateUsedInFakeTime,
        'draft.updatedBy': author,
        updatedAt: dateUsedInFakeTime,
        updatedBy: author
      })

      expect(dbDefinitionSpy).toHaveBeenCalled()
      const [formId, calledPageId, pageFieldsToUpdate, , state] =
        dbDefinitionSpy.mock.calls[0]

      expect(formId).toBe('123')
      expect(calledPageId).toBe(pageId)
      expect(pageFieldsToUpdate).toEqual(pageFields)
      expect(state).toBe(DRAFT)

      expect(dbDefinitionGetSpy.mock.calls[1][2]).toMatchObject({
        withTransaction: expect.anything()
      })
    })

    it('should fail if the page does not exist', async () => {
      jest.mocked(formDefinition.get).mockResolvedValueOnce(initialDefinition)
      jest.mocked(formDefinition.get).mockResolvedValueOnce(
        buildDefinition({
          pages: []
        })
      )

      await expect(
        patchFieldsOnDraftDefinitionPage('123', pageId, pageFields, author)
      ).rejects.toThrow(
        Boom.notFound(
          'Page ID ffefd409-f3f4-49fe-882e-6e89f44631b1 not found on Form ID 123'
        )
      )
    })
  })
})

/**
 * @import { FormDefinition, FormMetadata, FormMetadataAuthor, FormMetadataDocument, FormMetadataInput, FilterOptions, QueryOptions, PatchPageFields } from '@defra/forms-model'
 * @import { WithId } from 'mongodb'
 */
