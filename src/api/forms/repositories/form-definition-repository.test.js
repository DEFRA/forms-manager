import Boom from '@hapi/boom'

import {
  buildDefinition,
  buildPage,
  buildSummaryPage
} from '~/src/api/forms/__stubs__/definition.js'
import {
  addPage,
  pushSummaryToEnd
} from '~/src/api/forms/repositories/form-definition-repository.js'
import { emptyPage } from '~/src/api/forms/templates.js'
import { getAuthor } from '~/src/helpers/get-author.js'
import { db } from '~/src/mongo.js'

const mockCollection = {
  findOne: jest.fn(),
  updateOne: jest.fn()
}

jest.mock('~/src/helpers/get-author.js')

const author = getAuthor()
/**
 * @type {any}
 */
const mockSession = author

jest.mock('~/src/mongo.js', () => {
  let isPrepared = false

  return {
    db: {
      collection: jest.fn().mockImplementation(() => mockCollection)
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
    db.collection.mockReturnValue(mockCollection)
  })
  describe('pushSummaryToEnd', () => {
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
            {
              id: '1e322ebc-18ea-4b5d-846a-76bc08fc9943',
              title: 'Summary',
              path: '/summary',
              controller: 'SummaryPageController'
            },
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
      expect(summary).toEqual({
        id: '1e322ebc-18ea-4b5d-846a-76bc08fc9943',
        title: 'Summary',
        path: '/summary',
        controller: 'SummaryPageController'
      })
      expect(mockCollection.updateOne).toHaveBeenCalled()
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
            {
              id: '1e322ebc-18ea-4b5d-846a-76bc08fc9943',
              title: 'Summary',
              path: '/summary',
              controller: 'SummaryPageController'
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
      expect(summary).toEqual({
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
    const pageToAdd = emptyPage()
    const summaryPage = buildPage(buildSummaryPage({}))

    it('should add a page if no summary page summaryExists', async () => {
      mockCollection.findOne.mockResolvedValue({
        draft: buildDefinition({
          pages: []
        })
      })
      await addPage('1eabd1437567fe1b26708bbb', pageToAdd, mockSession)
      expect(mockCollection.updateOne).toHaveBeenCalledTimes(1)
    })

    it('should add a page if summary page is last page', async () => {
      mockCollection.findOne.mockResolvedValue({
        draft: buildDefinition({})
      })
      await addPage('1eabd1437567fe1b26708bbb', pageToAdd, mockSession)
      expect(mockCollection.updateOne).toHaveBeenCalledTimes(1)
    })

    it('should add a page and push summary to end if summary page summaryExists and is not last page', async () => {
      const pageOne = buildPage({})

      mockCollection.findOne.mockResolvedValue({
        draft: buildDefinition({
          pages: [summaryPage, pageOne]
        })
      })
      await addPage('1eabd1437567fe1b26708bbb', pageToAdd, mockSession)
      expect(mockCollection.updateOne).toHaveBeenCalledTimes(3)
    })
  })
})

/**
 * @import { FormDefinition, Page, PageSummary } from '@defra/forms-model'
 * @import { WithId } from 'mongodb'
 */
