/* eslint-env jest */
import { ObjectId } from 'mongodb'

/**
 * Mock form version document
 * @satisfies {FormVersionDocument}
 */
export const mockFormVersionDocument = {
  _id: new ObjectId(),
  formId: '661e4ca5039739ef2902b214',
  versionNumber: 1,
  createdAt: new Date('2020-01-01'),
  formDefinition: {
    name: 'Test form',
    pages: [],
    lists: [],
    conditions: [],
    sections: []
  }
}

/**
 * Creates a mock for the versioning service module
 * @returns {object} Mocked versioning service functions
 */
export function createVersioningServiceMock() {
  return {
    createFormVersion: jest.fn().mockResolvedValue(mockFormVersionDocument),
    getFormVersion: jest.fn().mockResolvedValue(mockFormVersionDocument),
    getLatestFormVersion: jest.fn().mockResolvedValue(mockFormVersionDocument),
    getFormVersions: jest.fn().mockResolvedValue([mockFormVersionDocument]),
    removeFormVersions: jest.fn().mockResolvedValue(undefined)
  }
}

/**
 * @import { FormVersionDocument } from '~/src/api/types.js'
 */
