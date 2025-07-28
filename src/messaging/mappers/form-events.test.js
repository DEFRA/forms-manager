import { buildMetaData } from '@defra/forms-model/stubs'

import {
  formOrganisationUpdatedMapper,
  formTeamEmailUpdatedMapper,
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

  describe('formTeamEmailUpdatedMapper', () => {
    it('should fail if teamEmail is missing', () => {
      expect(() => formTeamEmailUpdatedMapper(buildMetaData(), {})).toThrow()
    })
  })
})
