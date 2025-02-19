import Boom from '@hapi/boom'
import { ObjectId } from 'mongodb'

import {
  buildDefinition,
  buildQuestionPage,
  buildSummaryPage,
  buildTextFieldComponent
} from '~/src/api/forms/__stubs__/definition.js'
import { buildMockCollection } from '~/src/api/forms/__stubs__/mongo.js'
import {
  addPage,
  pushSummaryToEnd,
  updatePage
} from '~/src/api/forms/repositories/form-definition-repository.js'
import { getAuthor } from '~/src/helpers/get-author.js'
import { db } from '~/src/mongo.js'

const mockCollection = buildMockCollection()

jest.mock('~/src/helpers/get-author.js')

const author = getAuthor()
/**
 * @type {any}
 */
const mockSession = author
const formId = '1eabd1437567fe1b26708bbb'
const pageId = '87ffdbd3-9e43-41e2-8db3-98ade26ca0b7'

jest.mock('~/src/mongo.js', () => {
  let isPrepared = false
  const collection =
    /** @satisfies {Collection<{draft: FormDefinition}>} */ jest
      .fn()
      .mockImplementation(() => mockCollection)
  return {
    db: {
      collection
    },
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

describe('form-definition-repository', () => {
  beforeEach(() => {
    jest.mocked(db.collection).mockReturnValue(mockCollection)
  })
  describe('pushSummaryToEnd', () => {
    const summary = {
      id: '1e322ebc-18ea-4b5d-846a-76bc08fc9943',
      title: 'Summary',
      path: '/summary',
      controller: 'SummaryPageController'
    }

    it('should not edit a live summary', async () => {
      await expect(
        pushSummaryToEnd('1234', mockSession, 'live')
      ).rejects.toThrow(
        Boom.badRequest('Cannot add summary page to end of a live form')
      )
    })
    it('should fail if collection does not exist', async () => {
      mockCollection.findOne.mockResolvedValue(null)

      await expect(
        pushSummaryToEnd('67ade425d6e8ab1116b0aa9a', mockSession)
      ).rejects.toThrow(
        Boom.notFound(
          `Form definition with ID '67ade425d6e8ab1116b0aa9a' not found`
        )
      )
    })
    it('should push the summary to the end if it summaryExists but is not at the end', async () => {
      const docMock = {
        draft: {
          name: 'Form with Summary at end',
          startPage: '/form-with-summary',
          pages: [
            summary,
            {
              title: 'Test page',
              path: '/test-page',
              next: [],
              components: []
            }
          ],
          conditions: [],
          sections: [],
          lists: []
        }
      }
      mockCollection.findOne.mockResolvedValue(docMock)

      const summaryResult = await pushSummaryToEnd(
        '67ade425d6e8ab1116b0aa9a',
        mockSession
      )

      expect(summaryResult).toEqual(summary)
      expect(mockCollection.updateOne).toHaveBeenNthCalledWith(
        1,
        expect.anything(),
        {
          $pull: { 'draft.pages': { controller: 'SummaryPageController' } }
        },
        expect.anything()
      )
      expect(mockCollection.updateOne).toHaveBeenNthCalledWith(
        2,
        expect.anything(),
        {
          $push: { 'draft.pages': summary } // Adds the summary page back
        },
        expect.anything()
      )
    })

    it('should not update the document if summary page is at end', async () => {
      const docMock = {
        draft: {
          name: 'Form with Summary at end',
          startPage: '/form-with-summary',
          pages: [
            {
              title: 'Test page',
              path: '/test-page',
              next: [],
              components: []
            },
            summary
          ],
          conditions: [],
          sections: [],
          lists: []
        }
      }
      mockCollection.findOne.mockResolvedValue(docMock)

      const summaryResult = await pushSummaryToEnd(
        '67ade425d6e8ab1116b0aa9a',
        mockSession
      )
      expect(mockCollection.updateOne).not.toHaveBeenCalled()
      expect(summaryResult).toEqual({
        id: '1e322ebc-18ea-4b5d-846a-76bc08fc9943',
        title: 'Summary',
        path: '/summary',
        controller: 'SummaryPageController'
      })
    })

    it('should not update the document if no summary page summaryExists', async () => {
      const docMock = {
        draft: {
          name: 'Form with Summary at end',
          startPage: '/form-with-summary',
          pages: [
            {
              title: 'Test page',
              path: '/test-page',
              next: [],
              components: []
            }
          ],
          conditions: [],
          sections: [],
          lists: []
        }
      }
      mockCollection.findOne.mockResolvedValue(docMock)

      const summary = await pushSummaryToEnd(
        '67ade425d6e8ab1116b0aa9a',
        mockSession
      )
      expect(mockCollection.updateOne).not.toHaveBeenCalled()
      expect(summary).toBeUndefined()
    })
  })

  describe('addPage', () => {
    const pageToAdd = buildQuestionPage()
    const summaryPage = buildSummaryPage({})

    it('should add a page if no summary page summaryExists', async () => {
      mockCollection.findOne.mockResolvedValue({
        draft: buildDefinition({
          pages: []
        })
      })
      const page = await addPage(formId, pageToAdd, mockSession)
      expect(mockCollection.updateOne).toHaveBeenCalledTimes(1)
      expect(page).toMatchObject({
        ...pageToAdd,
        id: expect.any(String)
      })
    })

    it('should add a page if summary page is last page', async () => {
      mockCollection.findOne.mockResolvedValue({
        draft: buildDefinition({})
      })
      await addPage(formId, pageToAdd, mockSession)
      expect(mockCollection.updateOne).toHaveBeenCalledTimes(1)
    })

    it('should add a page and push summary to end if summary page summaryExists and is not last page', async () => {
      const pageOne = buildQuestionPage({})

      mockCollection.findOne.mockResolvedValue({
        draft: buildDefinition({
          pages: [summaryPage, pageOne]
        })
      })
      await addPage(formId, pageToAdd, mockSession)
      expect(mockCollection.updateOne).toHaveBeenCalledTimes(3)
    })
  })

  describe('updatePage', () => {
    const page = buildQuestionPage({
      id: pageId,
      title: 'New title',
      path: 'New path',
      components: [buildTextFieldComponent({})]
    })

    it('should fail if form is live', async () => {
      await expect(
        updatePage(formId, pageId, page, mockSession, 'live')
      ).rejects.toThrow(
        Boom.badRequest(
          'Cannot update page on a live form - 1eabd1437567fe1b26708bbb'
        )
      )
    })
    it('should update a page', async () => {
      await updatePage(formId, pageId, page, mockSession)
      const [filter, update] = mockCollection.updateOne.mock.calls[0]

      expect(filter).toMatchObject({
        _id: new ObjectId(formId),
        'draft.pages.id': pageId
      })
      expect(update).toMatchObject({
        $set: {
          'draft.pages.$': page
        }
      })
    })
  })
})

/**
 * @import { FormDefinition, Page, PageSummary } from '@defra/forms-model'
 * @import { WithId, Collection, Db } from 'mongodb'
 */
