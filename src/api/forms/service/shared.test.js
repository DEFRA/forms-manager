import { ObjectId } from 'mongodb'

import author from '~/src/api/forms/service/__stubs__/author.js'
import { mapForm } from '~/src/api/forms/service/shared.js'

const baseDocument = {
  _id: new ObjectId('661e4ca5039739ef2902b214'),
  slug: 'test-form',
  title: 'Test form',
  organisation: 'Defra',
  teamName: 'Defra Forms',
  teamEmail: 'defraforms@defra.gov.uk',
  draft: {
    createdAt: new Date('2020-01-01'),
    createdBy: author,
    updatedAt: new Date('2020-01-01'),
    updatedBy: author
  },
  createdAt: new Date('2020-01-01'),
  createdBy: author,
  updatedAt: new Date('2020-01-01'),
  updatedBy: author
}

describe('mapForm', () => {
  it('should return versions from document when present', () => {
    const versions = [
      { versionNumber: 2, createdAt: new Date('2025-10-01') },
      { versionNumber: 1, createdAt: new Date('2025-09-01') }
    ]
    const result = mapForm({ ...baseDocument, versions })

    expect(result.versions).toEqual(versions)
  })

  it('should return undefined for versions when document has no versions field', () => {
    const result = mapForm(baseDocument)

    expect(result.versions).toBeUndefined()
  })

  it('should return empty array for versions when document has empty versions array', () => {
    const result = mapForm({ ...baseDocument, versions: [] })

    expect(result.versions).toEqual([])
  })
})
