import { FormStatus } from '@defra/forms-model'
import Boom from '@hapi/boom'
import { MongoServerError, ObjectId } from 'mongodb'

import {
  buildMetadataDocument,
  metadataId
} from '~/src/api/forms/__stubs__/metadata.js'
import { buildMockCollection } from '~/src/api/forms/__stubs__/mongo.js'
import { FormAlreadyExistsError } from '~/src/api/forms/errors.js'
import {
  MAX_RESULTS,
  addVersionMetadata,
  create,
  get,
  getBySlug,
  getVersionMetadata,
  list,
  listAll,
  remove,
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
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        { _id: new ObjectId(metadataId) },
        expectedUpdate,
        expect.anything()
      )
      expect(updated).toEqual(metadataAfter)
    })
  })

  describe('listAll', () => {
    it('should retrieve all documents with limit', async () => {
      const mockDocuments = [metadataBefore, metadataAfter]
      mockCollection.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(mockDocuments)
      })

      const result = await listAll()

      expect(mockCollection.find).toHaveBeenCalledWith()
      expect(mockCollection.find().sort).toHaveBeenCalledWith({ updatedAt: -1 })
      expect(mockCollection.find().limit).toHaveBeenCalledWith(MAX_RESULTS)
      expect(result).toEqual(mockDocuments)
    })

    it('should handle empty results', async () => {
      mockCollection.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([])
      })

      const result = await listAll()

      expect(result).toEqual([])
    })
  })

  describe('list', () => {
    beforeEach(() => {
      mockCollection.aggregate.mockReturnValue({
        toArray: jest.fn().mockResolvedValue([
          {
            authors: { facet: [{ name: 'John Doe' }] },
            organisations: { facet: [{ organisation: 'Defra' }] },
            status: { facet: [{ status: 'draft' }] }
          }
        ])
      })
      mockCollection.countDocuments.mockResolvedValue(2)
    })

    it('should list documents with default options', async () => {
      mockCollection.aggregate.mockReturnValue({
        toArray: jest
          .fn()
          .mockResolvedValueOnce([
            {
              authors: [{ name: 'John Doe' }],
              organisations: [{ name: 'Defra' }],
              status: [{ statuses: ['draft'] }]
            }
          ])
          .mockResolvedValueOnce([metadataBefore])
      })

      const result = await list({ page: 1, perPage: 10 })

      expect(result).toHaveProperty('documents')
      expect(result).toHaveProperty('totalItems')
      expect(result).toHaveProperty('filters')
      expect(mockCollection.countDocuments).toHaveBeenCalled()
    })

    it('should handle pagination and sorting', async () => {
      mockCollection.aggregate.mockReturnValue({
        toArray: jest
          .fn()
          .mockResolvedValueOnce([
            {
              authors: [],
              organisations: [],
              status: [{ statuses: [] }]
            }
          ])
          .mockResolvedValueOnce([metadataBefore])
      })

      const options = {
        page: 2,
        perPage: 10,
        sortBy: 'title',
        order: 'asc',
        title: 'test',
        author: 'John',
        organisations: ['Defra'],
        status: [FormStatus.Draft]
      }

      const result = await list(options)

      expect(result).toHaveProperty('documents')
      expect(result).toHaveProperty('totalItems', 2)
      expect(result).toHaveProperty('filters')
    })

    it('should handle errors', async () => {
      const error = new Error('Database error')
      mockCollection.aggregate.mockReturnValue({
        toArray: jest.fn().mockRejectedValue(error)
      })

      await expect(list({ page: 1, perPage: 10 })).rejects.toThrow(error)
    })
  })

  describe('get', () => {
    it('should retrieve form by ID', async () => {
      mockCollection.findOne.mockResolvedValue(metadataBefore)

      const result = await get(metadataId, mockSession)

      expect(mockCollection.findOne).toHaveBeenCalledWith(
        { _id: new ObjectId(metadataId) },
        { session: mockSession }
      )
      expect(result).toEqual(metadataBefore)
    })

    it('should throw Boom.notFound when form not found', async () => {
      mockCollection.findOne.mockResolvedValue(null)

      await expect(get(metadataId)).rejects.toThrow(
        Boom.notFound(`Form with ID '${metadataId}' not found`)
      )
    })

    it('should rethrow Boom errors', async () => {
      const boomError = Boom.forbidden('Access denied')
      mockCollection.findOne.mockRejectedValue(boomError)

      await expect(get(metadataId)).rejects.toThrow(boomError)
    })

    it('should throw Boom.badRequest for generic errors', async () => {
      const error = new Error('Database error')
      mockCollection.findOne.mockRejectedValue(error)

      await expect(get(metadataId)).rejects.toThrow(Boom.badRequest(error))
    })
  })

  describe('getBySlug', () => {
    const slug = 'test-form'

    it('should retrieve form by slug', async () => {
      mockCollection.findOne.mockResolvedValue(metadataBefore)

      const result = await getBySlug(slug)

      expect(mockCollection.findOne).toHaveBeenCalledWith({ slug })
      expect(result).toEqual(metadataBefore)
    })

    it('should throw Boom.notFound when form not found', async () => {
      mockCollection.findOne.mockResolvedValue(null)

      await expect(getBySlug(slug)).rejects.toThrow(
        Boom.notFound(`Form with slug '${slug}' not found`)
      )
    })

    it('should rethrow Boom errors', async () => {
      const boomError = Boom.forbidden('Access denied')
      mockCollection.findOne.mockRejectedValue(boomError)

      await expect(getBySlug(slug)).rejects.toThrow(boomError)
    })

    it('should throw Boom.internal for generic errors', async () => {
      const error = new Error('Database error')
      mockCollection.findOne.mockRejectedValue(error)

      await expect(getBySlug(slug)).rejects.toThrow(Boom.internal(error))
    })
  })

  describe('create', () => {
    const document = buildMetadataDocument()
    const insertedId = new ObjectId()

    it('should create a new document', async () => {
      mockCollection.insertOne.mockResolvedValue({
        insertedId,
        acknowledged: true
      })

      const result = await create(document, mockSession)

      expect(mockCollection.insertOne).toHaveBeenCalledWith(document, {
        session: mockSession
      })
      expect(result).toHaveProperty('insertedId', insertedId)
    })

    it('should throw FormAlreadyExistsError for duplicate slug', async () => {
      const mongoError = new MongoServerError({ message: 'Duplicate key' })
      mongoError.code = 11000
      mockCollection.insertOne.mockRejectedValue(mongoError)

      await expect(create(document, mockSession)).rejects.toThrow(
        new FormAlreadyExistsError(document.slug, { cause: mongoError })
      )
    })

    it('should handle other MongoServerErrors', async () => {
      const mongoError = new MongoServerError({ message: 'Other error' })
      mongoError.code = 123
      mockCollection.insertOne.mockRejectedValue(mongoError)

      await expect(create(document, mockSession)).rejects.toThrow(mongoError)
    })

    it('should handle generic errors', async () => {
      const error = new Error('Generic error')
      mockCollection.insertOne.mockRejectedValue(error)

      await expect(create(document, mockSession)).rejects.toThrow(error)
    })
  })

  describe('remove', () => {
    it('should remove a form metadata', async () => {
      mockCollection.deleteOne.mockResolvedValue({
        deletedCount: 1,
        acknowledged: true
      })

      await remove(metadataId, mockSession)

      expect(mockCollection.deleteOne).toHaveBeenCalledWith(
        { _id: new ObjectId(metadataId) },
        { session: mockSession }
      )
    })
  })

  describe('addVersionMetadata', () => {
    const versionMetadata = {
      versionNumber: 1,
      createdAt: new Date()
    }

    it('should add version metadata to form', async () => {
      mockCollection.updateOne.mockResolvedValue({
        modifiedCount: 1
      })
      mockCollection.findOne.mockResolvedValue(metadataAfter)

      const result = await addVersionMetadata(
        metadataId,
        versionMetadata,
        mockSession
      )

      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: new ObjectId(metadataId) },
        {
          $push: {
            versions: {
              $each: [versionMetadata],
              $sort: { versionNumber: -1 }
            }
          }
        },
        { session: mockSession }
      )
      expect(result).toEqual(metadataAfter)
    })
  })

  describe('getVersionMetadata', () => {
    it('should get version metadata for a form', async () => {
      const versions = [
        { versionNumber: 2, createdAt: new Date('2023-02-01') },
        { versionNumber: 1, createdAt: new Date('2023-01-01') }
      ]
      mockCollection.findOne.mockResolvedValue({
        ...metadataBefore,
        versions
      })

      const result = await getVersionMetadata(metadataId, mockSession)

      expect(mockCollection.findOne).toHaveBeenCalledWith(
        { _id: new ObjectId(metadataId) },
        { session: mockSession }
      )
      expect(result).toEqual(versions)
    })

    it('should return empty array when no versions exist', async () => {
      mockCollection.findOne.mockResolvedValue({
        ...metadataBefore,
        versions: undefined
      })

      const result = await getVersionMetadata(metadataId)

      expect(result).toEqual([])
    })

    it('should throw when form not found', async () => {
      mockCollection.findOne.mockResolvedValue(null)

      await expect(getVersionMetadata(metadataId)).rejects.toThrow(
        Boom.notFound(`Form with ID '${metadataId}' not found`)
      )
    })
  })

  describe('update error handling', () => {
    it('should throw Boom.badRequest when modifiedCount is 0', async () => {
      mockCollection.updateOne.mockResolvedValue({
        modifiedCount: 0
      })

      await expect(
        update(metadataId, { $set: { title: 'New' } }, mockSession)
      ).rejects.toThrow(
        Boom.badRequest(
          `Form with ID ${metadataId} not updated. Modified count 0`
        )
      )
    })

    it('should rethrow Boom errors in update', async () => {
      const boomError = Boom.forbidden('Access denied')
      mockCollection.updateOne.mockRejectedValue(boomError)

      await expect(
        update(metadataId, { $set: { title: 'New' } }, mockSession)
      ).rejects.toThrow(boomError)
    })

    it('should throw Boom.internal for generic errors in update', async () => {
      const error = new Error('Database error')
      mockCollection.updateOne.mockRejectedValue(error)

      await expect(
        update(metadataId, { $set: { title: 'New' } }, mockSession)
      ).rejects.toThrow(Boom.internal(error))
    })
  })

  describe('getById', () => {
    it('should retrieve form by ID', async () => {
      mockCollection.findOne.mockResolvedValue(metadataBefore)

      const result = await get(metadataId)

      expect(mockCollection.findOne).toHaveBeenCalledWith(
        { _id: new ObjectId(metadataId) },
        { session: undefined }
      )
      expect(result).toEqual(metadataBefore)
    })

    it('should throw Boom.notFound when form not found', async () => {
      mockCollection.findOne.mockResolvedValue(null)

      await expect(get(metadataId)).rejects.toThrow(
        Boom.notFound(`Form with ID '${metadataId}' not found`)
      )
    })

    it('should rethrow Boom errors', async () => {
      const boomError = Boom.forbidden('Access denied')
      mockCollection.findOne.mockRejectedValue(boomError)

      await expect(get(metadataId)).rejects.toThrow(boomError)
    })

    it('should throw Boom.internal for generic errors', async () => {
      const error = new Error('Database error')
      mockCollection.findOne.mockRejectedValue(error)

      await expect(get(metadataId)).rejects.toThrow(Boom.internal(error))
    })
  })
})
