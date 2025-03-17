import Boom from '@hapi/boom'
import { pino } from 'pino'

import { buildList } from '~/src/api/forms/__stubs__/definition.js'
import * as formDefinition from '~/src/api/forms/repositories/form-definition-repository.js'
import * as formMetadata from '~/src/api/forms/repositories/form-metadata-repository.js'
import { formMetadataDocument } from '~/src/api/forms/service/__stubs__/service.js'
import {
  addListsToDraftFormDefinition,
  removeListOnDraftFormDefinition,
  updateListOnDraftFormDefinition
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

  beforeEach(() => {
    jest.mocked(formMetadata.get).mockResolvedValue(formMetadataDocument)
  })

  describe('addListsToDraftFormDefinition', () => {
    it('should add a list of lists to the form definition', async () => {
      const expectedLists = [buildList()]
      const addListsMock = jest
        .mocked(formDefinition.addLists)
        .mockResolvedValueOnce(expectedLists)

      const result = await addListsToDraftFormDefinition(
        id,
        expectedLists,
        author
      )
      const [expectedFormId, listToInsert, , state] = addListsMock.mock.calls[0]
      expect(expectedFormId).toBe(id)
      expect(listToInsert).toEqual(expectedLists)
      expect(state).toBeUndefined()
      expect(result).toEqual(expectedLists)
      expectMetadataUpdate()
    })
    it('should surface errors', async () => {
      const boomInternal = Boom.internal('Something went wrong')
      jest.mocked(formDefinition.addLists).mockRejectedValueOnce(boomInternal)
      await expect(
        addListsToDraftFormDefinition(id, [buildList()], author)
      ).rejects.toThrow(boomInternal)
    })
  })

  describe('updateListOnDraftFormDefinition', () => {
    const listToUpdate = buildList()
    const listId = '47cfaf57-6cda-44aa-9268-f37c674823d2'

    it('should update a list on the form definition', async () => {
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
