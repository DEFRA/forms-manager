import { buildMetaData } from '@defra/forms-model/stubs'

import { createV1MessageBase } from '~/src/messaging/mappers/base.js'

describe('base', () => {
  describe('createV1MessageBase', () => {
    it('should handle missing updatedAt and updatedBy in the updatedForm object', () => {
      const metadata = buildMetaData({
        createdAt: new Date('2025-07-25')
      })
      const updatedForm = {
        title: 'New title'
      }
      const messageBase = createV1MessageBase(metadata, updatedForm)
      expect(messageBase).toMatchObject({
        createdAt: new Date('2025-07-25'),
        createdBy: metadata.createdBy
      })
    })
  })
})
