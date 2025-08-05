import { FormDefinitionRequestType } from '@defra/forms-model'
import {
  buildDefinition,
  buildMetaData,
  buildQuestionPage
} from '@defra/forms-model/stubs'

import {
  _id,
  buildMetadataDocument,
  fakeUpdatedAt,
  metadataId
} from '~/src/api/forms/__stubs__/metadata.js'
import { updateAudit } from '~/src/api/forms/repositories/form-metadata-repository.js'
import author from '~/src/api/forms/service/__stubs__/author.js'
import { updateAuditAndPublish } from '~/src/api/forms/service/audit.js'
import { publishFormUpdatedEvent } from '~/src/messaging/publish.js'

jest.mock('~/src/api/forms/repositories/form-metadata-repository.js')
jest.mock('~/src/messaging/publish.js')

/**
 * @type {any}
 */
const mockSession = author

describe('audit', () => {
  const metadataDocument = buildMetadataDocument({
    _id,
    title: 'Form name before',
    slug: 'form-name-before'
  })
  const newPage = buildQuestionPage({})
  const before = buildDefinition()
  const after = buildDefinition({
    ...before,
    pages: [newPage]
  })

  const expectedMeta = buildMetaData({
    id: metadataId,
    title: 'Form name before',
    slug: 'form-name-before'
  })
  beforeEach(() => {
    jest.mocked(updateAudit).mockResolvedValue(metadataDocument)
  })
  describe('updateAuditAndPublish', () => {
    it('should update audit and publish', async () => {
      await updateAuditAndPublish(
        metadataId,
        FormDefinitionRequestType.CREATE_PAGE,
        {
          page: newPage
        },
        author,
        mockSession,
        { before, after },
        fakeUpdatedAt
      )

      expect(updateAudit).toHaveBeenCalledWith(
        metadataId,
        author,
        mockSession,
        fakeUpdatedAt
      )
      expect(publishFormUpdatedEvent).toHaveBeenCalledWith(
        expectedMeta,
        FormDefinitionRequestType.CREATE_PAGE,
        {
          page: newPage
        },
        author,
        fakeUpdatedAt,
        before,
        after
      )
    })

    it('should handle auditDiff = true', async () => {
      await updateAuditAndPublish(
        metadataId,
        FormDefinitionRequestType.CREATE_PAGE,
        {
          page: newPage
        },
        author,
        mockSession,
        { before, after },
        fakeUpdatedAt,
        false
      )

      expect(updateAudit).toHaveBeenCalledWith(
        metadataId,
        author,
        mockSession,
        fakeUpdatedAt
      )
      expect(publishFormUpdatedEvent).not.toHaveBeenCalled()
    })
  })
})
