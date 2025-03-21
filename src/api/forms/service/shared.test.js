import Boom from '@hapi/boom'
import { pino } from 'pino'

import * as formMetadata from '~/src/api/forms/repositories/form-metadata-repository.js'
import { formMetadataDocument } from '~/src/api/forms/service/__stubs__/service.js'
import { callSessionTransaction } from '~/src/api/forms/service/shared.js'
import { getAuthor } from '~/src/helpers/get-author.js'
import { prepareDb } from '~/src/mongo.js'

jest.mock('~/src/helpers/get-author.js')
jest.mock('~/src/api/forms/repositories/form-metadata-repository.js')
jest.mock('~/src/mongo.js')

jest.useFakeTimers().setSystemTime(new Date('2020-01-01'))
describe('lists', () => {
  beforeAll(async () => {
    await prepareDb(pino())
  })

  beforeEach(() => {
    jest.mocked(formMetadata.get).mockResolvedValue(formMetadataDocument)
  })

  describe('callSessionTransaction', () => {
    const id = '661e4ca5039739ef2902b214'
    const author = getAuthor()
    const dateUsedInFakeTime = new Date('2020-01-01')
    const defaultAudit = {
      'draft.updatedAt': dateUsedInFakeTime,
      'draft.updatedBy': author,
      updatedAt: dateUsedInFakeTime,
      updatedBy: author
    }

    beforeAll(async () => {
      await prepareDb(pino())
    })

    it('should update the component', async () => {
      const transactionResolved = '265a71fd-f2c2-4028-94aa-7c1e2739730f'
      const transactionHandler = jest
        .fn()
        .mockResolvedValue(transactionResolved)

      const dbMetadataSpy = jest.spyOn(formMetadata, 'update')

      const result = await callSessionTransaction(
        id,
        transactionHandler,
        author,
        'started',
        'finished',
        'failed'
      )

      expect(transactionHandler).toHaveBeenCalled()
      expect(result).toBe(transactionResolved)
      const [metaFormId, metaUpdateOperations] = dbMetadataSpy.mock.calls[0]
      expect(metaFormId).toBe(id)

      expect(metaUpdateOperations.$set).toEqual(defaultAudit)
    })

    it('should correctly surface the error is the component is not found', async () => {
      const transactionHandler = jest
        .fn()
        .mockRejectedValue(Boom.notFound('Not found'))

      await expect(
        callSessionTransaction(
          id,
          transactionHandler,
          author,
          'started',
          'finished',
          'failed'
        )
      ).rejects.toThrow(Boom.notFound('Not found'))
    })
  })
})
