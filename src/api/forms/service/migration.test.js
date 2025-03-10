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
import * as migrationHelperStubs from '~/src/api/forms/service/migration-helpers.js'
import {
  migrateDefinitionToV2,
  repositionSummaryPipeline
} from '~/src/api/forms/service/migration.js'
import { getAuthor } from '~/src/helpers/get-author.js'
import { prepareDb } from '~/src/mongo.js'

jest.mock('~/src/helpers/get-author.js')
jest.mock('~/src/api/forms/repositories/form-definition-repository.js')
jest.mock('~/src/api/forms/repositories/form-metadata-repository.js')
jest.mock('~/src/mongo.js')

jest.useFakeTimers().setSystemTime(new Date('2020-01-01'))

const author = getAuthor()
const summaryPage = buildSummaryPage()

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

  describe('migrateDefinitionToV2', () => {
    const getMock = jest
      .mocked(formDefinition.get)
      .mockResolvedValue(versionOne)

    it('should migrate a v1 definition to v2', async () => {
      const upsertMock = jest.mocked(formDefinition.upsert)
      jest
        .spyOn(migrationHelperStubs, 'migrateToV2')
        .mockReturnValueOnce(versionTwo)

      getMock.mockResolvedValueOnce(versionOne)

      const updatedDefinition = await migrateDefinitionToV2(id, author)

      expect(upsertMock).toHaveBeenCalled()
      const [finalExpectedId, finalExpectedDefinition] =
        upsertMock.mock.calls[0]

      expect(finalExpectedId).toBe(id)
      expect(finalExpectedDefinition).toEqual(versionTwo)

      expectMetadataUpdate()
      expect(updatedDefinition).toEqual(versionTwo)
    })

    it('should do nothing if definition is v2 already', async () => {
      jest.mocked(formDefinition.get).mockResolvedValue(versionTwo)
      const definition = await migrateDefinitionToV2(id, author)
      expect(definition).toEqual(versionTwo)
      expect(formDefinition.get).toHaveBeenCalledTimes(1)
      expect(formDefinition.upsert).not.toHaveBeenCalled()
      expect(dbMetadataSpy).not.toHaveBeenCalled()
    })

    it('should surface errors correctly', async () => {
      jest.mocked(formDefinition.get).mockResolvedValue(versionOne)
      jest
        .mocked(formDefinition.upsert)
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
