import { ObjectId } from 'mongodb'

import {
  buildMetadataDocument,
  metadataId
} from '~/src/api/forms/__stubs__/metadata.js'
import { buildMockCollection } from '~/src/api/forms/__stubs__/mongo.js'
import {
  update,
  updateAudit
} from '~/src/api/forms/repositories/form-metadata-repository.js'
import author from '~/src/api/forms/service/__stubs__/author.js'
import { db } from '~/src/mongo.js'
const mockCollection = buildMockCollection()
/**
 * @type {any}
 */
const mockSession = author
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

describe('form-metadata-repository', () => {
  const metadataBefore = buildMetadataDocument()
  const metadataAfter = buildMetadataDocument({
    ...metadataBefore,
    title: 'New form title',
    slug: 'new-form-title'
  })

  beforeEach(() => {
    jest.mocked(db.collection).mockReturnValue(mockCollection)
  })
  describe('update', () => {
    it('should update metadata', async () => {
      mockCollection.updateOne.mockResolvedValue({
        modifiedCount: 1
      })
      mockCollection.findOne.mockResolvedValue(metadataAfter)
      mockCollection.findOneAndUpdate.mockResolvedValue(metadataAfter)
      const updated = await update(
        metadataId,
        { $set: { title: 'New form title', slug: 'new-form-title' } },
        mockSession
      )
      expect(updated).toEqual(metadataAfter)
    })

    it('should fail if document not found', async () => {
      mockCollection.updateOne.mockResolvedValue({
        modifiedCount: 1
      })
      mockCollection.findOne.mockResolvedValue(null)
      await expect(
        update(
          metadataId,
          { $set: { title: 'New form title', slug: 'new-form-title' } },
          mockSession
        )
      ).rejects.toThrow(`Form with ID ${metadataId} not found.`)
    })
  })

  describe('updateAudit', () => {
    it('should update and log', async () => {
      mockCollection.updateOne.mockResolvedValue({
        modifiedCount: 1
      })
      mockCollection.findOne.mockResolvedValue(metadataAfter)
      mockCollection.findOneAndUpdate.mockResolvedValue(metadataAfter)
      const auditDate = new Date('2025-08-01')

      const expectedUpdate = {
        $set: {
          'draft.updatedAt': auditDate,
          'draft.updatedBy': author,
          updatedAt: auditDate,
          updatedBy: author
        }
      }
      const updated = await updateAudit(
        metadataId,
        author,
        mockSession,
        auditDate
      )
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: new ObjectId(metadataId) },
        expectedUpdate,
        expect.anything()
      )
      expect(updated).toEqual(metadataAfter)
    })
  })
})
