import { ControllerType, Engine, FormStatus } from '@defra/forms-model'
import Boom from '@hapi/boom'
import { ObjectId } from 'mongodb'

import {
  buildDefinition,
  buildList,
  buildListItem,
  buildQuestionPage,
  buildSummaryPage,
  buildTextFieldComponent
} from '~/src/api/forms/__stubs__/definition.js'
import { buildMockCollection } from '~/src/api/forms/__stubs__/mongo.js'
import {
  addComponents,
  addLists,
  addPageAtPosition,
  deleteComponent,
  get,
  removeList,
  removeMatchingPages,
  removePage,
  setEngineVersion,
  updateComponent,
  updateList,
  updatePage,
  updatePageFields
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
const componentId = 'e296d931-2364-4b17-9049-1aa1afea29d3'

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
  const mockDefinition = buildDefinition({})

  describe('get', () => {
    beforeEach(() => {
      mockCollection.findOne.mockResolvedValue({
        draft: mockDefinition
      })
    })

    it('should handle a call outside of a session', async () => {
      const definition = await get(formId)
      const [filter, options] = mockCollection.findOne.mock.calls[0]

      expect(filter).toEqual({ _id: new ObjectId(formId) })
      expect(options).toEqual({ projection: { draft: 1 } })
      expect(definition).toEqual(mockDefinition)
    })

    it('should handle a call inside a session', async () => {
      await get(formId, FormStatus.Draft, mockSession)
      const [, options] = mockCollection.findOne.mock.calls[0]

      expect(options).toEqual({
        projection: { draft: 1 },
        session: mockSession
      })
    })
  })

  describe('removeMatchingPages', () => {
    it('should remove a page', async () => {
      await removeMatchingPages(
        formId,
        { controller: ControllerType.Summary },
        mockSession
      )
      const [filter, update] = mockCollection.updateOne.mock.calls[0]
      expect(filter).toMatchObject({
        _id: new ObjectId(formId)
      })
      expect(update).toMatchObject({
        $pull: { 'draft.pages': { controller: 'SummaryPageController' } }
      })
    })
  })

  describe('addPageAtPosition', () => {
    const page = buildQuestionPage()

    it('should add a page at position', async () => {
      await addPageAtPosition(formId, page, mockSession, -1)

      const [filter, update] = mockCollection.updateOne.mock.calls[0]
      expect(filter).toEqual({
        _id: new ObjectId(formId)
      })
      expect(update).toMatchObject({
        $push: { 'draft.pages': { $each: [page], $position: -1 } }
      })
    })

    it('should add a page to the end', async () => {
      await addPageAtPosition(formId, page, mockSession)

      const [filter, update] = mockCollection.updateOne.mock.calls[0]
      expect(filter).toEqual({
        _id: new ObjectId(formId)
      })
      expect(update).toEqual({
        $push: {
          'draft.pages': { $each: [page] }
        }
      })
    })
  })

  describe('updatePage', () => {
    const page = buildQuestionPage({
      id: pageId,
      title: 'New title',
      path: 'New path',
      components: [buildTextFieldComponent({})]
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

  describe('addComponents', () => {
    const component = buildTextFieldComponent()

    it('should add a component to a page', async () => {
      await addComponents(formId, pageId, [component], mockSession)
      const [filter, update] = mockCollection.updateOne.mock.calls[0]

      expect(filter).toMatchObject({
        _id: new ObjectId(formId),
        'draft.pages.id': pageId
      })
      expect(update).toEqual({
        $push: {
          'draft.pages.$.components': {
            $each: [component]
          }
        }
      })
    })

    it('should add a component to a page a position x', async () => {
      await addComponents(formId, pageId, [component], mockSession, {
        position: 0
      })
      const [filter, update] = mockCollection.updateOne.mock.calls[0]

      expect(filter).toEqual({
        _id: new ObjectId(formId),
        'draft.pages.id': pageId
      })
      expect(update).toEqual({
        $push: {
          'draft.pages.$.components': {
            $each: [component],
            $position: 0
          }
        }
      })
    })
  })

  describe('updateComponent', () => {
    const component = buildTextFieldComponent({
      id: componentId
    })

    it('should update the component', async () => {
      const expectedComponent = buildTextFieldComponent({
        ...component,
        title: 'New Component Title'
      })
      mockCollection.findOneAndUpdate.mockResolvedValue({
        draft: buildDefinition({
          pages: [
            buildQuestionPage({
              id: pageId,
              components: [expectedComponent]
            }),
            buildSummaryPage()
          ]
        })
      })

      const savedComponent = await updateComponent(
        formId,
        pageId,
        componentId,
        component,
        mockSession
      )

      const [filter, update, options] =
        mockCollection.findOneAndUpdate.mock.calls[0]

      expect(filter).toEqual({
        _id: new ObjectId(formId),
        'draft.pages.id': pageId,
        'draft.pages.components.id': componentId
      })
      expect(update).toEqual({
        $set: {
          'draft.pages.$[pageId].components.$[component]': component
        }
      })
      expect(options).toMatchObject({
        arrayFilters: [{ 'pageId.id': pageId }, { 'component.id': componentId }]
      })
      expect(savedComponent).toEqual(expectedComponent)
    })

    it('should fail if the component is not found', async () => {
      mockCollection.findOneAndUpdate.mockResolvedValue(null)

      await expect(
        updateComponent(formId, pageId, componentId, component, mockSession)
      ).rejects.toThrow(
        Boom.badRequest(
          'Component ID e296d931-2364-4b17-9049-1aa1afea29d3 not found on Page ID 87ffdbd3-9e43-41e2-8db3-98ade26ca0b7 & Form ID 1eabd1437567fe1b26708bbb'
        )
      )
    })
  })

  describe('updatePageFields', () => {
    /** @satisfies {PatchPageFields} */
    let pageFields = {}

    beforeEach(() => {
      pageFields = {
        title: 'Updated page title',
        path: '/updated-page-title'
      }
    })

    it('should update a single page field', async () => {
      pageFields = {
        title: 'Updated page title'
      }

      await updatePageFields(formId, pageId, pageFields, mockSession)
      const [filter, update] = mockCollection.updateOne.mock.calls[0]

      expect(filter).toEqual({
        _id: new ObjectId(formId),
        'draft.pages.id': pageId
      })
      expect(update).toEqual({
        $set: {
          'draft.pages.$.title': 'Updated page title'
        },
        $unset: {}
      })
    })

    it('should update a single page field 2', async () => {
      pageFields = {
        path: '/updated-page-title'
      }

      await updatePageFields(formId, pageId, pageFields, mockSession)
      const [filter, update] = mockCollection.updateOne.mock.calls[0]

      expect(filter).toEqual({
        _id: new ObjectId(formId),
        'draft.pages.id': pageId
      })
      expect(update).toEqual({
        $set: {
          'draft.pages.$.path': '/updated-page-title'
        },
        $unset: {}
      })
    })

    it('should update multiple page fields', async () => {
      await updatePageFields(formId, pageId, pageFields, mockSession)
      const [filter, update] = mockCollection.updateOne.mock.calls[0]

      expect(filter).toEqual({
        _id: new ObjectId(formId),
        'draft.pages.id': pageId
      })
      expect(update).toEqual({
        $set: {
          'draft.pages.$.title': 'Updated page title',
          'draft.pages.$.path': '/updated-page-title'
        },
        $unset: {}
      })
    })

    it('should set controller', async () => {
      pageFields = {
        title: 'Updated page title',
        controller: ControllerType.FileUpload
      }
      await updatePageFields(formId, pageId, pageFields, mockSession)
      const [filter, update] = mockCollection.updateOne.mock.calls[0]

      expect(filter).toEqual({
        _id: new ObjectId(formId),
        'draft.pages.id': pageId
      })
      expect(update).toEqual({
        $set: {
          'draft.pages.$.title': 'Updated page title',
          'draft.pages.$.controller': ControllerType.FileUpload
        },
        $unset: {}
      })
    })

    it('should unset controller', async () => {
      pageFields = {
        title: 'Updated page title',
        controller: null
      }
      await updatePageFields(formId, pageId, pageFields, mockSession)
      const [filter, update] = mockCollection.updateOne.mock.calls[0]

      expect(filter).toEqual({
        _id: new ObjectId(formId),
        'draft.pages.id': pageId
      })
      expect(update).toEqual({
        $set: {
          'draft.pages.$.title': 'Updated page title'
        },
        $unset: {
          'draft.pages.$.controller': ''
        }
      })
    })
  })

  describe('removePage', () => {
    it('should remove a page from a draft component', async () => {
      mockCollection.findOneAndUpdate.mockResolvedValueOnce(mockDefinition)
      await removePage(formId, pageId, mockSession)
      const [filter, update] = mockCollection.findOneAndUpdate.mock.calls[0]

      expect(filter).toMatchObject({
        _id: new ObjectId(formId),
        'draft.pages.id': pageId
      })
      expect(update).toMatchObject({
        $pull: {
          'draft.pages': {
            id: pageId
          }
        }
      })
    })

    it('should fail if definition does not exist', async () => {
      mockCollection.findOneAndUpdate.mockResolvedValueOnce(null)
      await expect(removePage(formId, pageId, mockSession)).rejects.toThrow(
        Boom.notFound(
          'Form with ID 1eabd1437567fe1b26708bbb not found. Failed to delete page ID 87ffdbd3-9e43-41e2-8db3-98ade26ca0b7.'
        )
      )
    })
  })

  describe('deleteComponent', () => {
    it('should delete a component', async () => {
      await deleteComponent(formId, pageId, componentId, mockSession)
      const [filter, update] = mockCollection.updateOne.mock.calls[0]

      expect(filter).toMatchObject({
        _id: new ObjectId(formId),
        'draft.pages.id': pageId
      })
      expect(update).toMatchObject({
        $pull: {
          'draft.pages.$.components': { id: componentId }
        }
      })
    })
  })

  describe('setEngineVersion', () => {
    it('should fail if form is live', async () => {
      const mockDefinition = buildDefinition({})
      await expect(
        setEngineVersion(
          formId,
          Engine.V2,
          mockDefinition,
          mockSession,
          FormStatus.Live
        )
      ).rejects.toThrow(
        Boom.badRequest('Cannot update the engine version of a live form')
      )
    })
    it('should fail if invalid version', async () => {
      const mockDefinition = buildDefinition({})
      await expect(
        setEngineVersion(
          formId,
          /** @type {Engine} */ ('V9'),
          mockDefinition,
          mockSession
        )
      ).rejects.toThrow(
        Boom.badRequest(
          'Invalid engine version for form ID 1eabd1437567fe1b26708bbb'
        )
      )
    })
    it('should update the version if not already at V2', async () => {
      const mockDefinition = buildDefinition({})
      await setEngineVersion(formId, Engine.V2, mockDefinition, mockSession)
      const [filter, update] = mockCollection.updateOne.mock.calls[0]

      expect(filter).toMatchObject({
        _id: new ObjectId(formId)
      })
      expect(update).toMatchObject({
        $set: {
          'draft.engine': 'V2'
        }
      })
    })

    it('should leave the version as is if already at V2', async () => {
      const mockDefinition = buildDefinition({})
      mockDefinition.engine = Engine.V2
      await setEngineVersion(formId, Engine.V2, mockDefinition, mockSession)
      expect(mockCollection.updateOne).not.toHaveBeenCalled()
    })
  })

  describe('addLists', () => {
    it('should add an array of lists', async () => {
      const lists = [
        buildList({
          id: 'daa6c67c-a734-4c28-a93a-ffd9651f44c4',
          items: [buildListItem()]
        }),
        buildList({
          id: 'eb68b22f-b6ba-4358-8cba-b61282fecdb1',
          items: []
        })
      ]
      const returnedLists = await addLists(formId, lists, mockSession)
      expect(lists).toEqual(returnedLists)
      const [filter, update] = mockCollection.updateOne.mock.calls[0]

      expect(filter).toMatchObject({
        _id: new ObjectId(formId)
      })
      expect(update).toMatchObject({
        $push: {
          'draft.lists': {
            $each: lists
          }
        }
      })
    })
  })

  describe('updateList', () => {
    const listId = 'daa6c67c-a734-4c28-a93a-ffd9651f44c4'
    const listItem = buildList({
      id: listId,
      items: [buildListItem()]
    })

    it('should update a list', async () => {
      jest.mocked(mockCollection.updateOne).mockResolvedValueOnce(listItem)

      const returnedList = await updateList(
        formId,
        listId,
        listItem,
        mockSession
      )
      expect(returnedList).toEqual(listItem)
      const [filter, update] = mockCollection.updateOne.mock.calls[0]

      expect(filter).toMatchObject({
        _id: new ObjectId(formId),
        'draft.lists.id': listId
      })
      expect(update).toMatchObject({
        $set: {
          'draft.lists.$': listItem
        }
      })
    })
  })

  describe('removeList', () => {
    const listId = 'daa6c67c-a734-4c28-a93a-ffd9651f44c4'

    it('should delete a list', async () => {
      await removeList(formId, listId, mockSession)
      const [filter, update] = mockCollection.updateOne.mock.calls[0]

      expect(filter).toMatchObject({
        _id: new ObjectId(formId),
        'draft.lists.id': listId
      })
      expect(update).toMatchObject({
        $pull: {
          'draft.lists': { id: listId }
        }
      })
    })
  })
})

/**
 * @import { PatchPageFields } from '@defra/forms-model'
 */
