import { ApiErrorCode } from '@defra/forms-model'
import { ObjectId } from 'mongodb'

import {
  buildDefinition,
  buildQuestionPage,
  buildStatusPage,
  buildSummaryPage,
  buildTextFieldComponent
} from '~/src/api/forms/__stubs__/definition.js'
import { buildMockCollection } from '~/src/api/forms/__stubs__/mongo.js'
import {
  findComponent,
  findPage,
  removeById,
  uniquePathGate
} from '~/src/api/forms/repositories/helpers.js'
import { empty as emptyFormWithSummary } from '~/src/api/forms/templates.js'
import { getAuthor } from '~/src/helpers/get-author.js'
import { db } from '~/src/mongo.js'

jest.mock('~/src/helpers/get-author.js')

const mockCollection = buildMockCollection()

const author = getAuthor()
/**
 * @type {any}
 */
const mockSession = author
const collectionId = '111bd1111222fe1b33333ccc'

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

describe('repository helpers', () => {
  const pageId = '0d174e6c-6131-4588-80bc-684238e13096'
  const summaryPageId = '449a45f6-4541-4a46-91bd-8b8931b07b50'
  const statusPageId = '38a2946b-78d9-4b94-9a31-4aa979ce2a89'
  const componentId = '62559680-e45e-4178-acdc-68f6b65d42bb'

  const component = buildTextFieldComponent({
    id: componentId
  })
  const summary = buildSummaryPage()

  const questionPageWithComponent = buildQuestionPage({
    id: pageId,
    components: [component]
  })
  const questionPageWithoutComponent = buildQuestionPage({
    id: pageId
  })
  const summaryPageWithoutComponents = buildSummaryPage({
    id: summaryPageId
  })
  const statusPage = buildStatusPage({})

  const componentWithoutAnId = buildTextFieldComponent({
    name: 'Ghcbmw'
  })
  delete componentWithoutAnId.id

  describe('findPage', () => {
    it('should find page if page exists in definition', () => {
      const definition = buildDefinition({
        pages: [questionPageWithoutComponent, summary]
      })
      expect(findPage(definition, pageId)).toEqual(questionPageWithoutComponent)
    })

    it('should return undefined if page is not found', () => {
      const definition = buildDefinition({
        pages: [summaryPageWithoutComponents]
      })
      expect(findPage(definition, 'incorrect-id')).toBeUndefined()
    })
  })

  describe('findComponent', () => {
    it('should return undefined if page is not found', () => {
      const definition = buildDefinition({
        pages: [summary]
      })
      expect(findComponent(definition, 'abc', 'def')).toBeUndefined()
    })

    it('should return undefined if page is a summary page', () => {
      const definition = buildDefinition({
        pages: [summaryPageWithoutComponents]
      })
      expect(findComponent(definition, summaryPageId, 'abc')).toBeUndefined()
    })

    it('should return undefined if page is a status page', () => {
      const definition = buildDefinition({
        pages: [statusPage]
      })
      expect(findComponent(definition, statusPageId, 'abc')).toBeUndefined()
    })

    it('should return component if component is found', () => {
      const definition = buildDefinition({
        pages: [questionPageWithComponent]
      })
      expect(findComponent(definition, pageId, componentId)).toEqual(component)
    })
  })

  describe('removeById', () => {
    beforeEach(() => {
      jest.mocked(db.collection).mockReturnValue(mockCollection)
    })

    it('should remove', async () => {
      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 })
      await removeById(mockSession, 'my-collection', collectionId)
      const [filter] = mockCollection.deleteOne.mock.calls[0]
      expect(filter).toEqual({
        _id: new ObjectId(collectionId)
      })
    })

    it('should throw if not deleted', async () => {
      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 0 })
      await expect(
        removeById(mockSession, 'my-collection', collectionId)
      ).rejects.toThrow(
        "Failed to delete id '111bd1111222fe1b33333ccc' from 'my-collection'. Expected deleted count of 1, received 0"
      )
    })
  })

  describe('uniquePathGate', () => {
    it('should throw if not unique', () => {
      const definition = emptyFormWithSummary()
      const pageOne = buildQuestionPage({
        id: 'p1',
        path: '/page-one'
      })
      const pageTwo = buildQuestionPage({
        id: 'p2',
        path: '/page-two'
      })
      const definition1 = buildDefinition({
        ...definition,
        pages: [pageOne, pageTwo]
      })
      expect(() => {
        uniquePathGate(definition1, '/page-one', 'Duplicate page path found')
      }).toThrow('Duplicate page path found')
    })

    it('should not throw if unique', () => {
      const definition = emptyFormWithSummary()
      const pageOne = buildQuestionPage({
        id: 'p1',
        path: '/page-one'
      })
      const pageTwo = buildQuestionPage({
        id: 'p2',
        path: '/page-two'
      })
      const definition1 = buildDefinition({
        ...definition,
        pages: [pageOne, pageTwo]
      })
      expect(() => {
        uniquePathGate(definition1, '/page-three', 'Duplicate page path found')
      }).not.toThrow()
    })

    it('should not throw if unique, despite updating current page to same as existing path', () => {
      const definition = emptyFormWithSummary()
      const pageOne = buildQuestionPage({
        id: 'p1',
        path: '/page-one'
      })
      const pageTwo = buildQuestionPage({
        id: 'p2',
        path: '/page-two'
      })
      const definition1 = buildDefinition({
        ...definition,
        pages: [pageOne, pageTwo]
      })
      expect(() => {
        uniquePathGate(
          definition1,
          '/page-two',
          'Duplicate page path found',
          ApiErrorCode.DuplicatePagePathPage,
          'p2'
        )
      }).not.toThrow()
    })
  })
})
