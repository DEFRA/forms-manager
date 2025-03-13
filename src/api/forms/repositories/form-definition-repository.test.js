import { ControllerType, Engine, FormStatus } from '@defra/forms-model'
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
  addComponents,
  addPageAtPosition,
  deleteComponent,
  get,
  removeMatchingPages,
  setEngineVersion,
  updateComponent,
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

  describe('get', () => {
    const mockDefinition = buildDefinition({})

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
    it('should not edit a live summary', async () => {
      await expect(
        removeMatchingPages(
          formId,
          { controller: ControllerType.Summary },
          mockSession,
          FormStatus.Live
        )
      ).rejects.toThrow(
        Boom.badRequest(
          'Cannot remove page on live form ID 1eabd1437567fe1b26708bbb'
        )
      )
    })

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

    it('should not edit a live summary', async () => {
      await expect(
        addPageAtPosition('1234', page, mockSession, {
          state: FormStatus.Live
        })
      ).rejects.toThrow(
        Boom.badRequest('Cannot remove add on live form ID 1234')
      )
    })

    it('should add a page at position', async () => {
      await addPageAtPosition(formId, page, mockSession, { position: -1 })

      const [filter, update] = mockCollection.updateOne.mock.calls[0]
      expect(filter).toEqual({
        _id: new ObjectId(formId)
      })
      expect(update).toMatchObject({
        $push: { 'draft.pages': { $each: [page], $position: -1 } }
      })
    })

    it('should add a page to the end', async () => {
      await addPageAtPosition(formId, page, mockSession, {})

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

    it('should fail if form is live', async () => {
      await expect(
        updatePage(formId, pageId, page, mockSession, FormStatus.Live)
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

  describe('addComponents', () => {
    const component = buildTextFieldComponent()

    it('should fail if form is live', async () => {
      await expect(
        addComponents(formId, pageId, [component], mockSession, {
          state: FormStatus.Live
        })
      ).rejects.toThrow(
        Boom.badRequest(
          'Cannot add component to a live form - 1eabd1437567fe1b26708bbb'
        )
      )
    })

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

    it('should fail if state is live', async () => {
      await expect(
        updateComponent(
          formId,
          pageId,
          componentId,
          component,
          mockSession,
          FormStatus.Live
        )
      ).rejects.toThrow(
        Boom.badRequest(
          'Cannot update component on a live form - 1eabd1437567fe1b26708bbb'
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
        }
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
        }
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
        }
      })
    })

    it('should fail if form is live', async () => {
      await expect(
        updatePageFields(
          formId,
          pageId,
          pageFields,
          mockSession,
          FormStatus.Live
        )
      ).rejects.toThrow(
        Boom.badRequest(
          'Cannot update pageFields on a live form - 1eabd1437567fe1b26708bbb'
        )
      )
    })
  })

  describe('deleteComponent', () => {
    it('should fail if form is live', async () => {
      await expect(
        deleteComponent(
          formId,
          pageId,
          componentId,
          mockSession,
          FormStatus.Live
        )
      ).rejects.toThrow(
        Boom.badRequest(
          'Cannot delete component on a live form - 1eabd1437567fe1b26708bbb'
        )
      )
    })
    it('should delte a component', async () => {
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
})

/**
 * @import { PatchPageFields } from '@defra/forms-model'
 */
