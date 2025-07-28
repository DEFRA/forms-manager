import { buildMetaData } from '@defra/forms-model/stubs'

import {
  formOrganisationUpdatedMapper,
  formTeamNameUpdatedMapper
} from '~/src/messaging/mappers/form-events.js'

describe('form-events', () => {
  describe('formOrganisationUpdatedMapper', () => {
    it('should fail if organisation is missing', () => {
      expect(() => formOrganisationUpdatedMapper(buildMetaData(), {})).toThrow()
    })
  })

  describe('formTeamNameUpdatedMapper', () => {
    it('should fail if teamName is missing', () => {
      expect(() => formTeamNameUpdatedMapper(buildMetaData(), {})).toThrow()
    })
  })
})
