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
  it('should return document', () => {
    const result = mapForm(baseDocument)

    expect(result.draft).toBeDefined()
    expect(result.id).toBe(baseDocument._id.toString())
  })

  it('should throw if invalid', () => {
    expect(() =>
      mapForm({
        ...baseDocument,
        title: undefined
      })
    ).toThrow('Form is malformed in the database. Expected fields are missing.')
  })
})
