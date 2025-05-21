import {
  ControllerType,
  FormStatus,
  formDefinitionSchema,
  hasComponentsEvenIfNoNext
} from '@defra/forms-model'
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
  addComponent,
  addList,
  addPage,
  deleteComponent,
  deleteList,
  deletePage,
  deletePages,
  get,
  insert,
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
const listId = 'eb68b22f-b6ba-4358-8cba-b61282fecdb1'

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
  /** @type {FormDefinition} */
  let mockDefinition

  /** @type {FormDefinition} */
  let draft

  /** @type {Page} */
  let questionPageWithComponent

  /** @type {Page} */
  let summaryPage

  /** @type {List[]} */
  let lists

  beforeEach(() => {
    jest.mocked(db.collection).mockReturnValue(mockCollection)

    mockDefinition = buildDefinition({})
    const component = buildTextFieldComponent({
      id: componentId
    })
    questionPageWithComponent = buildQuestionPage({
      id: pageId,
      components: [component]
    })
    summaryPage = buildSummaryPage()

    const list = buildList({
      id: listId,
      items: []
    })

    lists = [list]

    draft = buildDefinition({
      pages: [questionPageWithComponent, summaryPage],
      lists
    })
  })

  /**
   * The update callback method
   * @callback UpdateCallback
   */

  /**
   * The verify callback method
   * @callback VerifyCallback
   * @param {FormDefinition} definition
   */

  /**
   * Test helper
   * @param {UpdateCallback} callback
   * @param {VerifyCallback} verify
   */
  async function helper(callback, verify) {
    mockCollection.findOne.mockReturnValue({ draft })
    mockCollection.findOneAndUpdate.mockResolvedValue({ draft })

    await callback()

    const [filter] = mockCollection.findOne.mock.calls[0]
    expect(filter).toMatchObject({
      _id: new ObjectId(formId)
    })

    const [filter2, update] = mockCollection.findOneAndUpdate.mock.calls[0]
    expect(filter2).toMatchObject({
      _id: new ObjectId(formId)
    })
    expect(update).toMatchObject({
      $set: { draft: expect.any(Object) }
    })

    /** @type {UpdateFilter<{ draft: FormDefinition }>} */
    const updateFilter = update

    expect(updateFilter.$set?.draft).toBeDefined()

    if (!updateFilter.$set?.draft) {
      throw new Error('Unexpected empty draft on $set')
    }

    await verify(updateFilter.$set.draft)
  }

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

  describe('deletePages', () => {
    it('should delete a page with predicate', async () => {
      await helper(
        async () => {
          await deletePages(
            formId,
            (page) => page.controller === ControllerType.Summary,
            mockSession
          )
        },
        (definition) => {
          expect(definition.pages).toHaveLength(1)
        }
      )
    })
  })

  describe('addPage', () => {
    const page = buildQuestionPage({
      id: '698b9a08-0853-4827-86e6-b900d59e03df',
      path: '/new-path'
    })

    it('should add a page at position', async () => {
      await helper(
        async () => {
          await addPage(formId, page, mockSession, -1)
        },
        (definition) => {
          expect(definition.pages).toHaveLength(3)
        }
      )
    })

    it('should add a page to the end', async () => {
      await helper(
        async () => {
          await addPage(formId, page, mockSession)
        },
        (definition) => {
          expect(definition.pages).toHaveLength(3)
        }
      )
    })
  })

  describe('updatePage', () => {
    it('should update a page', async () => {
      const newPage = buildQuestionPage({
        id: pageId,
        title: 'New title',
        path: '/new-path',
        components: []
      })

      await helper(
        async () => {
          await updatePage(formId, pageId, newPage, mockSession)
        },
        (definition) => {
          expect(definition.pages.at(0)).toEqual(newPage)
        }
      )
    })
  })

  describe('addComponent', () => {
    const component = buildTextFieldComponent({
      id: 'e07916d1-5bab-499d-9ff9-d3c0df0f88eb',
      name: 'abcdef'
    })

    it('should add a component to a page', async () => {
      await helper(
        async () => {
          await addComponent(formId, pageId, component, mockSession)
        },
        (definition) => {
          const page = definition.pages.at(0)
          expect(
            hasComponentsEvenIfNoNext(page) && page.components
          ).toHaveLength(2)
          expect(
            hasComponentsEvenIfNoNext(page) && page.components.at(1)
          ).toEqual(component)
        }
      )
    })

    it('should add a component to a page at position x', async () => {
      await helper(
        async () => {
          await addComponent(formId, pageId, component, mockSession, 0)
        },
        (definition) => {
          const page = definition.pages.at(0)
          expect(
            hasComponentsEvenIfNoNext(page) && page.components
          ).toHaveLength(2)
          expect(
            hasComponentsEvenIfNoNext(page) && page.components.at(0)
          ).toEqual(component)
        }
      )
    })
  })

  describe('updateComponent', () => {
    const component = buildTextFieldComponent({
      id: componentId
    })

    it('should update a component', async () => {
      /** @type {ComponentDef} */
      let savedComponent

      await helper(
        async () => {
          savedComponent = await updateComponent(
            formId,
            pageId,
            componentId,
            component,
            mockSession
          )
        },
        (definition) => {
          const expectedComponent = buildTextFieldComponent({
            ...component
          })
          const page = definition.pages.at(0)
          expect(savedComponent).toEqual(expectedComponent)

          expect(
            hasComponentsEvenIfNoNext(page) && page.components
          ).toHaveLength(1)
        }
      )
    })

    it('should fail if the component is not found', async () => {
      mockCollection.findOne.mockResolvedValue(null)

      await expect(
        updateComponent(formId, pageId, componentId, component, mockSession)
      ).rejects.toThrow(
        Boom.notFound("Document not found '1eabd1437567fe1b26708bbb'")
      )
    })
  })

  describe('updatePageFields', () => {
    it('should update a single page title', async () => {
      await helper(
        async () => {
          const pageFields = {
            title: 'Updated page title'
          }

          await updatePageFields(formId, pageId, pageFields, mockSession)
        },
        (definition) => {
          const page = definition.pages.at(0)

          expect(page?.title).toBe('Updated page title')
        }
      )
    })

    it('should update a single page path', async () => {
      await helper(
        async () => {
          const pageFields = {
            path: '/updated-page-title'
          }

          await updatePageFields(formId, pageId, pageFields, mockSession)
        },
        (definition) => {
          const page = definition.pages.at(0)

          expect(page?.path).toBe('/updated-page-title')
        }
      )
    })

    it('should update multiple page fields', async () => {
      await helper(
        async () => {
          const pageFields = {
            title: 'Updated page title',
            path: '/updated-page-title'
          }

          await updatePageFields(formId, pageId, pageFields, mockSession)
        },
        (definition) => {
          const page = definition.pages.at(0)

          expect(page?.title).toBe('Updated page title')
          expect(page?.path).toBe('/updated-page-title')
        }
      )
    })

    it('should set controller', async () => {
      await helper(
        async () => {
          const pageFields = {
            title: 'Updated page title',
            controller: ControllerType.FileUpload
          }

          await updatePageFields(formId, pageId, pageFields, mockSession)
        },
        (definition) => {
          const page = definition.pages.at(0)

          expect(page?.title).toBe('Updated page title')
          expect(page?.controller).toBe(ControllerType.FileUpload)
        }
      )
    })

    it('should unset controller', async () => {
      await helper(
        async () => {
          /** @satisfies {PatchPageFields} */
          const pageFields = {
            title: 'Updated page title',
            controller: null
          }

          await updatePageFields(formId, pageId, pageFields, mockSession)
        },
        (definition) => {
          const page = definition.pages.at(0)

          expect(page?.title).toBe('Updated page title')
          expect(page?.controller).toBeUndefined()
        }
      )
    })
  })

  describe('deletePage', () => {
    it('should delete a page from a draft', async () => {
      await helper(
        async () => {
          await deletePage(formId, pageId, mockSession)
        },
        (definition) => {
          expect(definition.pages).toHaveLength(1)
        }
      )
    })

    it('should fail if definition does not exist', async () => {
      mockCollection.findOneAndUpdate.mockResolvedValueOnce(null)

      await expect(deletePage(formId, pageId, mockSession)).rejects.toThrow(
        Boom.notFound("Document not found '1eabd1437567fe1b26708bbb'")
      )
    })
  })

  describe('deleteComponent', () => {
    it('should delete a component', async () => {
      await helper(
        async () => {
          await deleteComponent(formId, pageId, componentId, mockSession)
        },
        (definition) => {
          const page = definition.pages.at(0)

          expect(
            hasComponentsEvenIfNoNext(page) && page.components
          ).toHaveLength(0)
        }
      )
    })
  })

  describe('addList', () => {
    it('should add an array of lists', async () => {
      const list = buildList({
        id: '05a1f94e-17ff-4407-b20e-bbc76b346b3c',
        title: 'New list',
        name: 'abcdef',
        items: []
      })

      await helper(
        async () => {
          await addList(formId, list, mockSession)
        },
        (definition) => {
          expect(definition.lists).toHaveLength(2)
        }
      )
    })
  })

  describe('updateList', () => {
    const list = buildList({
      id: listId,
      items: [buildListItem()]
    })

    it('should update a list', async () => {
      await helper(
        async () => {
          await updateList(formId, listId, list, mockSession)
        },
        (definition) => {
          expect(definition.lists).toHaveLength(1)
          expect(definition.lists.at(0)?.items).toHaveLength(1)
        }
      )
    })
  })

  describe('deleteList', () => {
    it('should delete a list', async () => {
      await helper(
        async () => {
          await deleteList(formId, listId, mockSession)
        },
        (definition) => {
          expect(definition.lists).toHaveLength(0)
        }
      )
    })
  })

  describe('insert', () => {
    it('should insert a new draft definition', async () => {
      mockCollection.findOneAndUpdate.mockResolvedValue({ draft })

      await insert(formId, draft, mockSession, formDefinitionSchema)

      const [filter, update] = mockCollection.findOneAndUpdate.mock.calls[0]
      expect(filter).toMatchObject({
        _id: new ObjectId(formId)
      })
      expect(update).toMatchObject({
        $setOnInsert: { draft: expect.any(Object) }
      })

      /** @type {UpdateFilter<{ draft: FormDefinition }>} */
      const updateFilter = update

      expect(updateFilter.$setOnInsert?.draft).toBeDefined()

      if (!updateFilter.$setOnInsert?.draft) {
        throw new Error('Unexpected empty draft on $setOnInsert')
      }
    })
  })
})

/**
 * @import { FormDefinition, PatchPageFields, Page, ComponentDef, List } from '@defra/forms-model'
 * @import { UpdateFilter } from 'mongodb'
 */
