import { buildList } from '~/src/api/forms/__stubs__/definition.js'
import * as formDefinition from '~/src/api/forms/repositories/form-definition-repository.js'
import { callSessionTransaction } from '~/src/api/forms/service/callSessionTransaction.js'
import {
  addListsToDraftFormDefinition,
  removeListOnDraftFormDefinition,
  updateListOnDraftFormDefinition
} from '~/src/api/forms/service/lists.js'
import { getAuthor } from '~/src/helpers/get-author.js'

jest.mock('~/src/api/forms/service/callSessionTransaction.js')
jest.mock('~/src/helpers/get-author.js')
jest.mock('~/src/api/forms/repositories/form-definition-repository.js')
jest.mock('~/src/api/forms/repositories/form-metadata-repository.js')
jest.mock('~/src/api/forms/templates.js')
jest.mock('~/src/mongo.js')

jest.useFakeTimers().setSystemTime(new Date('2020-01-01'))
describe('lists', () => {
  const id = '661e4ca5039739ef2902b214'
  const author = getAuthor()
  const callSessionTransactionMock = jest.mocked(callSessionTransaction)
  /**
   * @type {any}
   */
  const mockSession = author
  const listId = '47cfaf57-6cda-44aa-9268-f37c674823d2'

  beforeEach(() => {
    callSessionTransactionMock.mockClear()
  })

  describe('addListsToDraftFormDefinition', () => {
    it('should call callSessionTransaction with the correct parameters', async () => {
      const expectedLists = [
        buildList({
          name: 'my-list'
        }),
        buildList({
          name: 'my-list-2'
        })
      ]
      const addListsMock = jest
        .mocked(formDefinition.addLists)
        .mockResolvedValueOnce(expectedLists)
      callSessionTransactionMock.mockResolvedValueOnce(expectedLists)

      const result = await addListsToDraftFormDefinition(
        id,
        expectedLists,
        author
      )
      expect(callSessionTransactionMock).toHaveBeenCalledWith(
        id,
        expect.any(Function),
        author,
        {
          start: `Adding lists my-list, my-list-2 on Form Definition (draft) for form ID 661e4ca5039739ef2902b214`,
          end: `Added lists my-list, my-list-2 on Form Definition (draft) for form ID 661e4ca5039739ef2902b214`,
          fail: `Failed to add lists my-list, my-list-2 on Form Definition (draft) for form ID 661e4ca5039739ef2902b214`
        }
      )
      const [, callback] = callSessionTransactionMock.mock.calls[0]
      await callback(mockSession)
      expect(addListsMock).toHaveBeenCalledWith(id, expectedLists, mockSession)
      expect(result).toEqual(expectedLists)
    })
  })

  describe('updateListOnDraftFormDefinition', () => {
    it('should update a list on the form definition', async () => {
      const listToUpdate = buildList()
      callSessionTransactionMock.mockResolvedValueOnce(listToUpdate)
      const updateListMock = jest
        .mocked(formDefinition.updateList)
        .mockResolvedValueOnce(listToUpdate)

      const result = await updateListOnDraftFormDefinition(
        id,
        listId,
        listToUpdate,
        author
      )

      expect(callSessionTransactionMock).toHaveBeenCalledWith(
        id,
        expect.any(Function),
        author,
        {
          start: `Updating list 47cfaf57-6cda-44aa-9268-f37c674823d2 on Form Definition (draft) for form ID 661e4ca5039739ef2902b214`,
          end: `Updated list 47cfaf57-6cda-44aa-9268-f37c674823d2 on Form Definition (draft) for form ID 661e4ca5039739ef2902b214`,
          fail: `Failed to update list 47cfaf57-6cda-44aa-9268-f37c674823d2 on Form Definition (draft) for form ID 661e4ca5039739ef2902b214`
        }
      )

      const [, callback] = callSessionTransactionMock.mock.calls[0]
      await callback(mockSession)
      expect(updateListMock).toHaveBeenCalledWith(
        id,
        listId,
        listToUpdate,
        mockSession
      )
      expect(result).toEqual(listToUpdate)
    })
  })

  describe('removeListOnDraftFormDefinition', () => {
    it('should remove a list on the form definition', async () => {
      await removeListOnDraftFormDefinition(id, listId, author)
      expect(callSessionTransactionMock).toHaveBeenCalledWith(
        id,
        expect.any(Function),
        author,
        {
          start: `Removing list 47cfaf57-6cda-44aa-9268-f37c674823d2 on Form Definition (draft) for form ID 661e4ca5039739ef2902b214`,
          end: `Removed list 47cfaf57-6cda-44aa-9268-f37c674823d2 on Form Definition (draft) for form ID 661e4ca5039739ef2902b214`,
          fail: `Failed to remove list 47cfaf57-6cda-44aa-9268-f37c674823d2 on Form Definition (draft) for form ID 661e4ca5039739ef2902b214`
        }
      )
      const [, callback] = callSessionTransactionMock.mock.calls[0]
      await callback(mockSession)
      expect(jest.mocked(formDefinition.removeList)).toHaveBeenCalledWith(
        id,
        listId,
        mockSession
      )
    })
  })
})
