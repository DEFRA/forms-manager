import { buildMetaData } from '@defra/forms-model/stubs'

import { formOrganisationUpdatedMapper } from '~/src/messaging/mappers/form-events.js'

describe('form-events', () => {
  describe('formOrganisationUpdatedMapper', () => {
    it('should fail if organisation is missing', () => {
      expect(() => formOrganisationUpdatedMapper(buildMetaData(), {})).toThrow()
    })
  })
})
