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
  addPageIdsPipeline,
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
  // const pageId = 'ffefd409-f3f4-49fe-882e-6e89f44631b1'
  const dateUsedInFakeTime = new Date('2020-01-01')

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
})

/**
 * @import { WithId } from 'mongodb'
 */
