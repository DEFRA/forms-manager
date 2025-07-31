import { buildDefinition, buildMetaData } from '@defra/forms-model/stubs'

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
  const formId = '85261320-2358-4bba-a77e-def3633efe3d'
  const auditDate = new Date('2025-07-30')
  const metadata = buildMetaData({
    id: formId,
    title: 'Form name before',
    slug: 'form-name-before'
  })
  beforeEach(() => {
    updateAudit.mockResolvedValue(metadata)
  })
  describe('updateAuditAndPublish', () => {
    it('should update audit and publish', async () => {
      const before = buildDefinition({
        id: formId,
        name: 'Form name before'
      })
      const after = buildDefinition({
        ...before,
        name: 'Form name after'
      })

      await updateAuditAndPublish(
        formId,
        author,
        mockSession,
        { before, after },
        auditDate
      )

      expect(updateAudit).toHaveBeenCalledWith(
        formId,
        author,
        mockSession,
        auditDate
      )
      expect(publishFormUpdatedEvent).toHaveBeenCalledWith(
        metadata,
        author,
        auditDate,
        before,
        after
      )
    })

    it('should handle auditDiff = true', async () => {
      const before = buildDefinition({
        id: formId,
        name: 'Form name before'
      })
      const after = buildDefinition({
        ...before,
        name: 'Form name after'
      })

      await updateAuditAndPublish(
        formId,
        author,
        mockSession,
        { before, after },
        auditDate,
        false
      )

      expect(updateAudit).toHaveBeenCalledWith(
        formId,
        author,
        mockSession,
        auditDate
      )
      expect(publishFormUpdatedEvent).not.toHaveBeenCalled()
    })
  })
})
