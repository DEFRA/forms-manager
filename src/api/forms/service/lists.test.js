import Boom from '@hapi/boom'
import { pino } from 'pino'

import { buildDefinition } from '~/.server/api/forms/__stubs__/definition.js'
import { buildList } from '~/src/api/forms/__stubs__/definition.js'
import * as formDefinition from '~/src/api/forms/repositories/form-definition-repository.js'
import * as formMetadata from '~/src/api/forms/repositories/form-metadata-repository.js'
import { formMetadataDocument } from '~/src/api/forms/service/__stubs__/service.js'
import {
  addListsToDraftFormDefinition,
  duplicateListGuard,
  listIsDuplicate,
  removeListOnDraftFormDefinition,
  updateListOnDraftFormDefinition,
  updatedListIsDuplicate
} from '~/src/api/forms/service/lists.js'
import { getAuthor } from '~/src/helpers/get-author.js'
import { prepareDb } from '~/src/mongo.js'

jest.mock('~/src/helpers/get-author.js')
jest.mock('~/src/api/forms/repositories/form-definition-repository.js')
jest.mock('~/src/api/forms/repositories/form-metadata-repository.js')
jest.mock('~/src/api/forms/templates.js')
jest.mock('~/src/mongo.js')

jest.useFakeTimers().setSystemTime(new Date('2020-01-01'))
describe('lists', () => {
  const id = '661e4ca5039739ef2902b214'
  const author = getAuthor()
  const dateUsedInFakeTime = new Date('2020-01-01')
  const defaultAudit = {
    'draft.updatedAt': dateUsedInFakeTime,
    'draft.updatedBy': author,
    updatedAt: dateUsedInFakeTime,
    updatedBy: author
  }
  const mockSession = author

  const dbMetadataSpy = jest.spyOn(formMetadata, 'update')

  const expectMetadataUpdate = () => {
    expect(dbMetadataSpy).toHaveBeenCalled()
    const [formId, updateFilter] = dbMetadataSpy.mock.calls[0]
    expect(formId).toBe(id)
    expect(updateFilter.$set).toEqual(defaultAudit)
  }

  const exampleList = buildList({
    id: '5fa9c135-5397-4372-b168-f75e21fc19e4',
    name: 'AbcDe',
    title: 'Original List Title'
  })
  const formDefinitionWithList = buildDefinition({
    lists: [exampleList]
  })

  beforeAll(async () => {
    await prepareDb(pino())
  })

  beforeEach(() => {
    jest.mocked(formMetadata.get).mockResolvedValue(formMetadataDocument)
  })

  describe('listIsDuplicate', () => {
    it('should return true if list title is a duplicate', () => {
      const list2 = buildList({
        ...exampleList,
        name: 'AdeXAx'
      })

      expect(listIsDuplicate(formDefinitionWithList, list2)).toBe(true)
    })

    it('should return true if list name is a duplicate', () => {
      const list2 = buildList({
        ...exampleList,
        title: 'New String List with same name'
      })

      expect(listIsDuplicate(formDefinitionWithList, list2)).toBe(true)
    })

    it('should return false if neither name or title is a duplicate', () => {
      const list2 = buildList({
        ...exampleList,
        title: 'New String List with same name',
        name: 'AdeXAx'
      })

      expect(listIsDuplicate(formDefinitionWithList, list2)).toBe(false)
    })

    it('should return true if list name is a duplicate a', () => {
      const list2 = buildList({
        ...exampleList,
        title: 'New String List with same name'
      })

      expect(listIsDuplicate(formDefinitionWithList, list2)).toBe(true)
    })
  })

  describe('updatedListIsDuplicate', () => {
    const list2Id = 'e9fb7014-a0f6-4d17-8642-53aa1d9956ba'
    const list2 = buildList({
      id: list2Id,
      name: 'jdIemWP',
      title: 'Edited Title'
    })
    const formDefinitionWithTwoLists = buildDefinition({
      ...formDefinitionWithList,
      lists: [exampleList, list2]
    })

    it('should return true if new name / title of list being updated is duplicate of other list', () => {
      const updatedList = buildList({
        ...list2,
        name: 'AbcDe',
        title: 'Original List Title'
      })
      expect(
        updatedListIsDuplicate(list2Id)(formDefinitionWithTwoLists, updatedList)
      ).toBe(true)
    })

    it('should return false if new name / title is only the same as the current name / title', () => {
      expect(
        updatedListIsDuplicate(list2Id)(formDefinitionWithTwoLists, list2)
      ).toBe(false)
    })
  })

  describe('duplicateListGuard', () => {
    it('should fail with a Boom.conflict given duplicate list name or id', async () => {
      jest
        .mocked(formDefinition.get)
        .mockResolvedValueOnce(formDefinitionWithList)

      await expect(
        duplicateListGuard('abc', exampleList, mockSession)
      ).rejects.toThrow(Boom.conflict('Duplicate list name or title found.'))
    })

    it('should pass given unique list', async () => {
      const receivedDefinition = await duplicateListGuard(
        'abc',
        buildList(),
        mockSession,
        formDefinitionWithList,
        listIsDuplicate
      )
      expect(receivedDefinition).toEqual(formDefinitionWithList)
    })
  })

  describe('addListsToDraftFormDefinition', () => {
    it('should add a list of lists to the form definition', async () => {
      jest
        .mocked(formDefinition.get)
        .mockResolvedValueOnce(formDefinitionWithList)
      const expectedLists = [buildList()]
      const addListsMock = jest
        .mocked(formDefinition.addLists)
        .mockResolvedValueOnce(expectedLists)

      const result = await addListsToDraftFormDefinition(
        id,
        expectedLists,
        author
      )
      const [expectedFormId, listToInsert] = addListsMock.mock.calls[0]
      expect(expectedFormId).toBe(id)
      expect(listToInsert).toEqual(expectedLists)
      expect(result).toEqual(expectedLists)
      expectMetadataUpdate()
    })
    it('should surface errors', async () => {
      const boomConflict = Boom.conflict('Duplicate found')
      jest.mocked(formDefinition.get).mockRejectedValueOnce(boomConflict)
      await expect(
        addListsToDraftFormDefinition(id, [buildList()], author)
      ).rejects.toThrow(boomConflict)
    })
  })

  describe('updateListOnDraftFormDefinition', () => {
    const listToUpdate = buildList()
    const listId = '47cfaf57-6cda-44aa-9268-f37c674823d2'

    it('should update a list on the form definition', async () => {
      jest
        .mocked(formDefinition.get)
        .mockResolvedValueOnce(formDefinitionWithList)
      const updateListMock = jest
        .mocked(formDefinition.updateList)
        .mockResolvedValueOnce(listToUpdate)

      const result = await updateListOnDraftFormDefinition(
        id,
        listId,
        listToUpdate,
        author
      )
      const [expectedFormId, expectedListId, expectedListToUpdate] =
        updateListMock.mock.calls[0]
      expect(expectedFormId).toBe(id)
      expect(expectedListId).toBe(listId)
      expect(expectedListToUpdate).toEqual(listToUpdate)
      expect(result).toEqual(listToUpdate)
      expectMetadataUpdate()
    })
    it('should surface errors', async () => {
      const boomInternal = Boom.internal('Something went wrong')
      jest.mocked(formDefinition.updateList).mockRejectedValueOnce(boomInternal)
      await expect(
        updateListOnDraftFormDefinition(id, listId, listToUpdate, author)
      ).rejects.toThrow(boomInternal)
    })
  })

  describe('removeListOnDraftFormDefinition', () => {
    const listId = '47cfaf57-6cda-44aa-9268-f37c674823d2'

    it('should remove a list on the form definition', async () => {
      await removeListOnDraftFormDefinition(id, listId, author)
      const [expectedFormId, expectedListId] = jest.mocked(
        formDefinition.removeList
      ).mock.calls[0]
      expect(expectedFormId).toBe(id)
      expect(expectedListId).toBe(listId)
      expectMetadataUpdate()
    })
    it('should surface errors', async () => {
      const boomInternal = Boom.internal('Something went wrong')
      jest.mocked(formDefinition.removeList).mockRejectedValueOnce(boomInternal)
      await expect(
        removeListOnDraftFormDefinition(id, listId, author)
      ).rejects.toThrow(boomInternal)
    })
  })
})
