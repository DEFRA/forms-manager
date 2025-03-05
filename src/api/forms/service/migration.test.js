import { ControllerType, Engine } from '@defra/forms-model'
import Boom from '@hapi/boom'
import { pino } from 'pino'

import {
  buildDefinition,
  buildQuestionPage,
  buildSummaryPage,
  buildTextFieldComponent
} from '~/src/api/forms/__stubs__/definition.js'
import * as formDefinition from '~/src/api/forms/repositories/form-definition-repository.js'
import * as formMetadata from '~/src/api/forms/repositories/form-metadata-repository.js'
import {
  addComponentIdsPipeline,
  addPageIdsPipeline,
  migrateDefinitionToV2,
  repositionSummaryPipeline,
  setEngineVersionToV2
} from '~/src/api/forms/service/migration.js'
import { getAuthor } from '~/src/helpers/get-author.js'
import { prepareDb } from '~/src/mongo.js'

jest.mock('~/src/helpers/get-author.js')
jest.mock('~/src/api/forms/repositories/form-definition-repository.js')
jest.mock('~/src/api/forms/repositories/form-metadata-repository.js')
jest.mock('~/src/mongo.js')

jest.useFakeTimers().setSystemTime(new Date('2020-01-01'))

const author = getAuthor()

describe('migration', () => {
  const id = '661e4ca5039739ef2902b214'
  const v4Id = '083f2f65-7c1d-48e0-a195-3f6b0836ad08'
  // const pageId = 'ffefd409-f3f4-49fe-882e-6e89f44631b1'
  const dateUsedInFakeTime = new Date('2020-01-01')
  const defaultAudit = {
    'draft.updatedAt': dateUsedInFakeTime,
    'draft.updatedBy': author,
    updatedAt: dateUsedInFakeTime,
    updatedBy: author
  }

  const summaryWithoutId = buildSummaryPage()
  delete summaryWithoutId.id
  const summaryWithId = buildSummaryPage({
    id: v4Id
  })
  const componentWithoutId = buildTextFieldComponent({
    id: undefined,
    name: 'CWId'
  })
  const componentWithId = buildTextFieldComponent({
    ...componentWithoutId,
    id: '17f791b5-ecef-40a3-a4c5-e1865f7f3aea'
  })
  const questionPageWithoutId = buildQuestionPage({
    components: [componentWithoutId]
  })
  delete questionPageWithoutId.id

  const questionPageWithId = buildQuestionPage({
    ...questionPageWithoutId,
    id: '20d966ab-b926-449a-ad86-9236d44980ab'
  })
  const questionPageWithIdAndComponentIds = buildQuestionPage({
    ...questionPageWithId,
    components: [componentWithId]
  })

  const versionOne = buildDefinition({
    pages: [summaryWithoutId, questionPageWithoutId],
    engine: Engine.V1
  })
  const versionTwo = buildDefinition({
    pages: [questionPageWithIdAndComponentIds, summaryWithId],
    engine: Engine.V2
  })
  const dbMetadataSpy = jest.spyOn(formMetadata, 'update')
  const expectMetadataUpdate = () => {
    expect(dbMetadataSpy).toHaveBeenCalled()
    const [formId, updateFilter] = dbMetadataSpy.mock.calls[0]
    expect(formId).toBe(id)
    expect(updateFilter.$set).toEqual(defaultAudit)
  }

  beforeAll(async () => {
    await prepareDb(pino())
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('repositionSummaryPipeline', () => {
    it('should reposition summary if it exists but is not at the end', async () => {
      const removeMatchingPagesSpy = jest.spyOn(
        formDefinition,
        'removeMatchingPages'
      )
      const addPageAtPositionSpy = jest.spyOn(
        formDefinition,
        'addPageAtPosition'
      )
      const returnedSummary = await repositionSummaryPipeline(
        id,
        versionOne,
        author
      )

      expect(removeMatchingPagesSpy).toHaveBeenCalled()
      expect(addPageAtPositionSpy).toHaveBeenCalled()

      const [formId1, matchCriteria, , state] =
        removeMatchingPagesSpy.mock.calls[0]
      const [formId2, calledSummary, , options] =
        addPageAtPositionSpy.mock.calls[0]

      expect(formId1).toBe(id)
      expect(formId2).toBe(id)
      expect(matchCriteria).toEqual({ controller: ControllerType.Summary })
      expect(calledSummary).toEqual({
        ...summaryWithId,
        id: expect.any(String)
      })
      expect(state).toBeUndefined()
      expect(options).toEqual({})
      expect(returnedSummary.summary).toEqual({
        ...summaryWithId,
        id: expect.any(String)
      })
      expectMetadataUpdate()
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
      await repositionSummaryPipeline(id, formDefinition1, author)

      expect(removeMatchingPagesSpy).not.toHaveBeenCalled()
      expect(addPageAtPositionSpy).not.toHaveBeenCalled()
      expect(dbMetadataSpy).not.toHaveBeenCalled()
    })

    it('should not reposition the summary if summary is at the end', async () => {
      const formDefinition1 = buildDefinition({
        pages: [buildQuestionPage(), summaryWithId]
      })
      const removeMatchingPagesSpy = jest.spyOn(
        formDefinition,
        'removeMatchingPages'
      )
      const addPageAtPositionSpy = jest.spyOn(
        formDefinition,
        'addPageAtPosition'
      )
      await repositionSummaryPipeline(id, formDefinition1, author)

      expect(removeMatchingPagesSpy).not.toHaveBeenCalled()
      expect(addPageAtPositionSpy).not.toHaveBeenCalled()
      expect(dbMetadataSpy).not.toHaveBeenCalled()
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
      await repositionSummaryPipeline(id, formDefinition1, author)

      expect(removeMatchingPagesSpy).not.toHaveBeenCalled()
      expect(addPageAtPositionSpy).not.toHaveBeenCalled()
      expect(dbMetadataSpy).not.toHaveBeenCalled()
    })

    it('should surface errors correctly', async () => {
      jest
        .mocked(formDefinition.addPageAtPosition)
        .mockRejectedValueOnce(Boom.badRequest('Error'))

      await expect(
        repositionSummaryPipeline('123', versionOne, author)
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

      jest.mocked(formDefinition.get).mockResolvedValueOnce(definition)

      const dbDefinitionSpy = jest.spyOn(formDefinition, 'addPageFieldByPath')

      await addPageIdsPipeline(id, author)

      expect(dbDefinitionSpy).toHaveBeenCalledTimes(2)

      const [formId1, path1, fieldsToUpdate1] = dbDefinitionSpy.mock.calls[0]
      const [formId2, path2, fieldsToUpdate2] = dbDefinitionSpy.mock.calls[1]

      expect([formId1, formId2]).toEqual([id, id])
      expect([path1, path2]).toEqual(['/page-one', '/summary'])
      expect(fieldsToUpdate1).toMatchObject({ id: expect.any(String) })
      expect(fieldsToUpdate2).toMatchObject({ id: expect.any(String) })

      expectMetadataUpdate()
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

  describe('addComponentIdsPipeline', () => {
    const componentWithoutId1 = buildTextFieldComponent({
      id: undefined,
      name: 'CWId1'
    })
    const componentWithoutId2 = buildTextFieldComponent({
      name: 'CWId2'
    })
    delete componentWithoutId2.id

    const componentWithId1 = buildTextFieldComponent({
      ...componentWithoutId1,
      id: 'ba002235-2102-4146-9dc6-42b71725d073'
    })
    const componentWithId2 = buildTextFieldComponent({
      ...componentWithoutId2,
      id: 'b3749bf9-8987-4731-902c-204603c6ddca'
    })

    const pageWithComponentIds = buildQuestionPage({
      id: 'd9448b9c-02d6-41a9-aaf6-704b8fb8314d',
      components: [componentWithId1, componentWithId2]
    })
    const summaryPage = buildSummaryPage({
      id: '51a73631-4ec5-4fb1-9a2d-cd44bd1e15c2'
    })
    const pageWithoutComponentIds = buildQuestionPage({
      id: '5eea21ed-fe44-4836-b780-7255f029fbff',
      components: [componentWithoutId1, componentWithoutId2]
    })
    const editedPageWithComponentIds = buildQuestionPage({
      ...pageWithComponentIds,
      id: '5eea21ed-fe44-4836-b780-7255f029fbff'
    })
    const definitionWithoutComponentIds = buildDefinition({
      pages: [pageWithComponentIds, pageWithoutComponentIds, summaryPage]
    })
    const definitionWithComponentIds = buildDefinition({
      pages: [pageWithComponentIds, editedPageWithComponentIds, summaryPage]
    })
    it('should add component ids if they are missing', async () => {
      jest
        .mocked(formDefinition.get)
        .mockResolvedValueOnce(definitionWithComponentIds)
      const definition = await addComponentIdsPipeline(
        id,
        definitionWithoutComponentIds,
        author
      )
      expect(formDefinition.addComponentFieldByName).toHaveBeenCalledTimes(2)
      expect(formDefinition.addComponentFieldByName).toHaveBeenNthCalledWith(
        1,
        id,
        '5eea21ed-fe44-4836-b780-7255f029fbff',
        'CWId1',
        { id: expect.any(String) },
        expect.any(Object)
      )
      expect(formDefinition.addComponentFieldByName).toHaveBeenNthCalledWith(
        2,
        id,
        '5eea21ed-fe44-4836-b780-7255f029fbff',
        'CWId2',
        { id: expect.any(String) },
        expect.any(Object)
      )
      expect(definition).toEqual(definitionWithComponentIds)
      expectMetadataUpdate()
    })

    it('should surface errors correctly', async () => {
      jest
        .mocked(formDefinition.addComponentFieldByName)
        .mockRejectedValueOnce(Boom.internal('err'))
      await expect(
        addComponentIdsPipeline(id, definitionWithoutComponentIds, author)
      ).rejects.toThrow(Boom.internal('err'))
    })
    it('should do nothing if all components have ids', async () => {
      const definition = await addComponentIdsPipeline(
        id,
        definitionWithComponentIds,
        author
      )
      expect(definition).toEqual(definitionWithComponentIds)
      expect(formDefinition.addComponentFieldByName).not.toHaveBeenCalled()
      expect(dbMetadataSpy).not.toHaveBeenCalled()
    })
  })

  describe('setEngineVersion', () => {
    it('should set the engine version', async () => {
      const engineMock = jest.mocked(formDefinition.setEngineVersion)
      await setEngineVersionToV2(id, versionOne, author)

      const [finalExpectedId, finalExpectedEngine, finalExpectedDefinition] =
        engineMock.mock.calls[0]

      expect([
        finalExpectedId,
        finalExpectedEngine,
        finalExpectedDefinition
      ]).toEqual([id, Engine.V2, versionOne])
      expectMetadataUpdate()
    })

    it('should do nothing if definition is v2 already', async () => {
      const engineMock = jest.mocked(formDefinition.setEngineVersion)
      await setEngineVersionToV2(id, versionTwo, author)
      expect(engineMock).not.toHaveBeenCalled()
    })

    it('should surface errors', async () => {
      jest
        .mocked(formDefinition.setEngineVersion)
        .mockRejectedValueOnce(Boom.internal('an error'))
      await expect(
        setEngineVersionToV2(id, versionOne, author)
      ).rejects.toThrow(Boom.internal('an error'))
    })
  })

  describe('migrateDefinitionToV2', () => {
    const getMock = jest
      .mocked(formDefinition.get)
      .mockResolvedValue(versionOne)

    it('should migrate a v1 definition to v2', async () => {
      const setEngineMock = jest.mocked(formDefinition.setEngineVersion)
      const versionOneB = buildDefinition({
        ...versionOne,
        pages: [questionPageWithoutId, summaryWithId]
      })
      const versionOneC = buildDefinition({
        ...versionOne,
        pages: [questionPageWithId, summaryWithId]
      })
      const versionOneD = buildDefinition({
        ...versionOneC,
        pages: [questionPageWithIdAndComponentIds, summaryWithId]
      })
      getMock.mockResolvedValueOnce(versionOne)
      getMock.mockResolvedValueOnce(versionOneB)
      getMock.mockResolvedValueOnce(versionOneC)
      getMock.mockResolvedValueOnce(versionOneD)
      getMock.mockResolvedValueOnce(versionTwo)

      const updatedDefinition = await migrateDefinitionToV2(id, author)

      expect(updatedDefinition).toEqual(versionTwo)
      const [finalExpectedId, finalExpectedEngine, finalExpectedDefinition] =
        setEngineMock.mock.calls[0]

      expect(formDefinition.removeMatchingPages).toHaveBeenCalled()
      expect(formDefinition.addPageFieldByPath).toHaveBeenCalledTimes(1)
      expect(formDefinition.addComponentFieldByName).toHaveBeenCalledTimes(1)
      expect([
        finalExpectedId,
        finalExpectedEngine,
        finalExpectedDefinition
      ]).toEqual([id, Engine.V2, versionOneD])
      expectMetadataUpdate()
    })

    it('should do nothing if definition is v2 already', async () => {
      jest.mocked(formDefinition.get).mockResolvedValue(versionTwo)
      const definition = await migrateDefinitionToV2(id, author)
      expect(definition).toEqual(versionTwo)
      expect(formDefinition.get).toHaveBeenCalledTimes(1)
      expect(formDefinition.addPageFieldByPath).not.toHaveBeenCalled()
      expect(formDefinition.removeMatchingPages).not.toHaveBeenCalled()
      expect(formDefinition.addPageAtPosition).not.toHaveBeenCalled()
      expect(formDefinition.addPageFieldByPath).not.toHaveBeenCalled()
      expect(dbMetadataSpy).not.toHaveBeenCalled()
    })

    it('should surface errors correctly', async () => {
      jest.mocked(formDefinition.get).mockResolvedValue(versionOne)
      jest
        .mocked(formDefinition.removeMatchingPages)
        .mockRejectedValueOnce(Boom.internal('err'))
      await expect(migrateDefinitionToV2(id, author)).rejects.toThrow(
        Boom.internal('err')
      )
    })
  })
})

/**
 * @import { WithId } from 'mongodb'
 */
