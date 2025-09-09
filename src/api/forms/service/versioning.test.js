import { FormStatus } from '@defra/forms-model'
import { buildDefinition } from '@defra/forms-model/stubs'

import * as formDefinitionRepository from '~/src/api/forms/repositories/form-definition-repository.js'
import * as formMetadataRepository from '~/src/api/forms/repositories/form-metadata-repository.js'
import * as formVersionsRepository from '~/src/api/forms/repositories/form-versions-repository.js'
import {
  createFormVersion,
  getFormVersion,
  getFormVersions,
  getLatestFormVersion,
  removeFormVersions
} from '~/src/api/forms/service/versioning.js'

jest.mock('~/src/api/forms/repositories/form-definition-repository.js')
jest.mock('~/src/api/forms/repositories/form-metadata-repository.js')
jest.mock('~/src/api/forms/repositories/form-versions-repository.js')
jest.mock('~/src/mongo.js', () => ({
  client: {
    startSession: jest.fn()
  },
  db: {},
  METADATA_COLLECTION_NAME: 'form-metadata',
  DEFINITION_COLLECTION_NAME: 'form-definition',
  VERSIONS_COLLECTION_NAME: 'form-versions'
}))

describe('versioning service', () => {
  const formId = '661e4ca5039739ef2902b214'
  const mockFormDefinition = buildDefinition({})
  /** @type {any} */
  const mockSession = {
    withTransaction: jest.fn(),
    endSession: jest.fn()
  }
  const now = new Date()

  beforeEach(async () => {
    jest.clearAllMocks()
    jest.useFakeTimers().setSystemTime(now)

    mockSession.withTransaction = jest
      .fn()
      .mockImplementation(
        async (/** @type {() => Promise<any>} */ callback) => {
          return await callback()
        }
      )
    mockSession.endSession = jest.fn()

    const { client } = await import('~/src/mongo.js')
    jest.mocked(client.startSession).mockReturnValue(mockSession)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('createFormVersion', () => {
    const mockVersionDocument = {
      formId,
      versionNumber: 1,
      formDefinition: mockFormDefinition,
      createdAt: now
    }

    beforeEach(() => {
      jest
        .mocked(formMetadataRepository.getVersionMetadata)
        .mockResolvedValue([])
      jest
        .mocked(formDefinitionRepository.get)
        .mockResolvedValue(mockFormDefinition)
      jest
        .mocked(formMetadataRepository.addVersionMetadata)
        .mockResolvedValue(/** @type {any} */ ({}))
      jest
        .mocked(formVersionsRepository.createVersion)
        .mockResolvedValue(mockVersionDocument)
    })

    it('should create a new version', async () => {
      const result = await createFormVersion(formId, mockSession)

      expect(result).toEqual(mockVersionDocument)
      expect(formDefinitionRepository.get).toHaveBeenCalledWith(
        formId,
        FormStatus.Draft,
        expect.any(Object)
      )
      expect(formVersionsRepository.createVersion).toHaveBeenCalledWith(
        mockVersionDocument,
        expect.any(Object)
      )
      expect(mockSession.endSession).not.toHaveBeenCalled()
    })

    it('should handle errors', async () => {
      const error = new Error('Database error')
      jest.mocked(formDefinitionRepository.get).mockRejectedValue(error)

      await expect(createFormVersion(formId, mockSession)).rejects.toThrow(
        error
      )
      expect(mockSession.endSession).not.toHaveBeenCalled()
    })

    it('should calculate version number from existing versions', async () => {
      const existingVersions = [
        { versionNumber: 1, createdAt: new Date('2023-01-01') },
        { versionNumber: 3, createdAt: new Date('2023-01-03') },
        { versionNumber: 2, createdAt: new Date('2023-01-02') }
      ]
      jest
        .mocked(formMetadataRepository.getVersionMetadata)
        .mockResolvedValue(existingVersions)

      const expectedVersionDocument = {
        ...mockVersionDocument,
        versionNumber: 4
      }
      jest
        .mocked(formVersionsRepository.createVersion)
        .mockResolvedValue(expectedVersionDocument)

      const result = await createFormVersion(formId, mockSession)

      expect(result).toEqual(expectedVersionDocument)
    })
  })

  describe('getFormVersion', () => {
    const versionNumber = 1
    const mockVersion = {
      formId,
      versionNumber,
      formDefinition: mockFormDefinition,
      createdAt: now
    }

    it('should retrieve a specific version', async () => {
      jest
        .mocked(formVersionsRepository.getVersion)
        .mockResolvedValue(mockVersion)

      const result = await getFormVersion(formId, versionNumber)

      expect(result).toEqual(mockVersion)
      expect(formVersionsRepository.getVersion).toHaveBeenCalledWith(
        formId,
        versionNumber
      )
    })

    it('should handle errors when retrieving a version', async () => {
      const error = new Error('Version not found')
      jest.mocked(formVersionsRepository.getVersion).mockRejectedValue(error)

      await expect(getFormVersion(formId, versionNumber)).rejects.toThrow(error)
    })
  })

  describe('getFormVersions', () => {
    const mockVersions = [
      {
        formId,
        versionNumber: 1,
        formDefinition: mockFormDefinition,
        createdAt: new Date('2023-01-01')
      }
    ]

    it('should retrieve all versions for a form', async () => {
      jest.mocked(formVersionsRepository.getVersions).mockResolvedValue({
        versions: mockVersions,
        totalCount: 1
      })

      const result = await getFormVersions(formId)

      expect(result).toEqual(mockVersions)
      expect(formVersionsRepository.getVersions).toHaveBeenCalledWith(
        formId,
        undefined,
        formVersionsRepository.MAX_VERSIONS,
        0
      )
    })

    it('should handle errors when retrieving all versions', async () => {
      const error = new Error('Database connection failed')
      jest.mocked(formVersionsRepository.getVersions).mockRejectedValue(error)

      await expect(getFormVersions(formId)).rejects.toThrow(error)
    })
  })

  describe('getLatestFormVersion', () => {
    const mockLatestVersion = {
      formId,
      versionNumber: 5,
      formDefinition: mockFormDefinition,
      createdAt: now
    }

    it('should retrieve the latest version', async () => {
      jest
        .mocked(formVersionsRepository.getLatestVersion)
        .mockResolvedValue(mockLatestVersion)

      const result = await getLatestFormVersion(formId)

      expect(result).toEqual(mockLatestVersion)
      expect(formVersionsRepository.getLatestVersion).toHaveBeenCalledWith(
        formId
      )
    })

    it('should handle errors when retrieving latest version', async () => {
      const error = new Error('No versions found')
      jest
        .mocked(formVersionsRepository.getLatestVersion)
        .mockRejectedValue(error)

      await expect(getLatestFormVersion(formId)).rejects.toThrow(error)
    })
  })

  describe('removeFormVersions', () => {
    it('should remove all versions for a form and log success', async () => {
      jest
        .mocked(formVersionsRepository.removeVersionsForForm)
        .mockResolvedValue()

      await removeFormVersions(formId, mockSession)

      expect(formVersionsRepository.removeVersionsForForm).toHaveBeenCalledWith(
        formId,
        expect.any(Object)
      )
    })

    it('should handle errors when removing versions', async () => {
      const error = new Error('Failed to remove versions')
      jest
        .mocked(formVersionsRepository.removeVersionsForForm)
        .mockRejectedValue(error)

      await expect(removeFormVersions(formId, mockSession)).rejects.toThrow(
        error
      )
    })
  })
})

/**
 * @import { FormVersionDocument } from '~/src/api/types.js'
 */
