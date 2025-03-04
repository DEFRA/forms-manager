import { ControllerType, Engine } from '@defra/forms-model'
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
  const questionPageWithId = buildQuestionPage()
  const questionPageWithoutId = buildQuestionPage()
  delete questionPageWithoutId.id

  const versionOne = buildDefinition({
    pages: [summaryWithoutId, questionPageWithoutId],
    engine: Engine.V1
  })
  const versionTwo = buildDefinition({
    pages: [questionPageWithId, summaryWithId],
    engine: Engine.V2
  })

  beforeAll(async () => {
    await prepareDb(pino())
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
      const formMetadataUpdateSpy = jest.spyOn(formMetadata, 'update')
      const returnedSummary = await repositionSummaryPipeline(
        id,
        versionOne,
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
      expect(calledSummary).toEqual({
        ...summaryWithId,
        id: expect.any(String)
      })
      expect(state).toBeUndefined()
      expect(options).toEqual({})
      expect(updateFilter.$set).toEqual(defaultAudit)
      expect(returnedSummary.summary).toEqual({
        ...summaryWithId,
        id: expect.any(String)
      })
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

      expect(updateFilter.$set).toEqual(defaultAudit)
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
      expect(formMetadata.update).toHaveBeenCalledWith(
        id,
        {
          $set: defaultAudit
        },
        expect.anything()
      )
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
    it('should migrate a v1 definition to v2', async () => {
      const getMock = jest.mocked(formDefinition.get)
      const setEngineMock = jest.mocked(formDefinition.setEngineVersion)
      const versionOneB = buildDefinition({
        ...versionOne,
        pages: [questionPageWithoutId, summaryWithId]
      })
      const versionOneC = buildDefinition({
        ...versionOne,
        pages: [questionPageWithId, summaryWithId]
      })
      getMock.mockResolvedValueOnce(versionOneB)
      getMock.mockResolvedValueOnce(versionOneC)
      getMock.mockResolvedValueOnce(versionTwo)

      const updatedDefinition = await migrateDefinitionToV2(
        id,
        versionOne,
        author
      )

      expect(updatedDefinition).toEqual(versionTwo)
      const [finalExpectedId, finalExpectedEngine, finalExpectedDefinition] =
        setEngineMock.mock.calls[0]
      const [metaId, metaUpdate] = jest.mocked(formMetadata.update).mock
        .calls[0]

      expect(formDefinition.removeMatchingPages).toHaveBeenCalled()
      expect(formDefinition.addPageFieldByPath).toHaveBeenCalledTimes(1)
      expect([
        finalExpectedId,
        finalExpectedEngine,
        finalExpectedDefinition
      ]).toEqual([id, Engine.V2, versionOneC])
      expect([metaId, metaUpdate]).toEqual([id, { $set: defaultAudit }])
    })

    it('should do nothing if definition is v2 already', async () => {
      await migrateDefinitionToV2(id, versionTwo, author)
      expect(formDefinition.get).not.toHaveBeenCalled()
      expect(formDefinition.addPageFieldByPath).not.toHaveBeenCalled()
      expect(formDefinition.removeMatchingPages).not.toHaveBeenCalled()
      expect(formDefinition.addPageAtPosition).not.toHaveBeenCalled()
      expect(formDefinition.addPageFieldByPath).not.toHaveBeenCalled()
    })

    it('should surface errors correctly', async () => {
      jest
        .mocked(formDefinition.removeMatchingPages)
        .mockRejectedValueOnce(Boom.internal('err'))
      await expect(
        migrateDefinitionToV2(id, versionOne, author)
      ).rejects.toThrow(Boom.internal('err'))
    })
  })
})

/**
 * @import { WithId } from 'mongodb'
 */
