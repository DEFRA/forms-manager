import {
  AuditEventMessageCategory,
  AuditEventMessageSchemaVersion,
  AuditEventMessageType
} from '@defra/forms-model'

import {
  createFormMessageDataBase,
  createV1MessageBase
} from '~/src/messaging/mappers/base.js'

/**
 * @param {FormMetadata} metadata
 * @returns {FormCreatedMessage}
 */
export function formCreatedEventMapper(metadata) {
  /** @type {FormCreatedMessageData} */
  const data = {
    formId: metadata.id,
    slug: metadata.slug,
    title: metadata.title,
    organisation: metadata.organisation,
    teamName: metadata.teamName,
    teamEmail: metadata.teamEmail
  }
  return {
    schemaVersion: AuditEventMessageSchemaVersion.V1,
    category: AuditEventMessageCategory.FORM,
    type: AuditEventMessageType.FORM_CREATED,
    entityId: metadata.id,
    createdAt: metadata.createdAt,
    createdBy: {
      id: metadata.createdBy.id,
      displayName: metadata.createdBy.displayName
    },
    data,
    messageCreatedAt: new Date()
  }
}

/**
 * @param {FormMetadata} metadata
 * @param {FormMetadata} oldMetadata
 * @returns {FormTitleUpdatedMessage}
 */
export function formTitleUpdatedMapper(metadata, oldMetadata) {
  const { title } = metadata
  const { title: oldTitle } = oldMetadata

  const baseData = createFormMessageDataBase(metadata)

  /**
   * @type {FormTitleUpdatedMessageData}
   */
  const data = {
    ...baseData,
    changes: {
      previous: {
        title: oldTitle
      },
      new: {
        title
      }
    }
  }
  const auditMessageBase = createV1MessageBase(oldMetadata, metadata)

  return {
    ...auditMessageBase,
    data,
    category: AuditEventMessageCategory.FORM,
    type: AuditEventMessageType.FORM_TITLE_UPDATED
  }
}

/**
 * @param {FormMetadata} metadata
 * @param {PartialFormMetadataDocument} updatedForm
 * @returns {FormOrganisationUpdatedMessage}
 */
export function formOrganisationUpdatedMapper(metadata, updatedForm) {
  const { organisation: oldOrganisation } = metadata
  const { organisation } = updatedForm

  if (!organisation) {
    throw new Error('Unexpected missing organisation')
  }

  const baseData = createFormMessageDataBase(metadata)

  /**
   * @type {FormOrganisationUpdatedMessageData}
   */
  const data = {
    ...baseData,
    changes: {
      previous: {
        organisation: oldOrganisation
      },
      new: {
        organisation
      }
    }
  }
  const auditMessageBase = createV1MessageBase(metadata, updatedForm)

  return {
    ...auditMessageBase,
    data,
    category: AuditEventMessageCategory.FORM,
    type: AuditEventMessageType.FORM_ORGANISATION_UPDATED
  }
}

/**
 * @param {FormMetadata} metadata
 * @param {PartialFormMetadataDocument} updatedForm
 * @returns {FormTeamNameUpdatedMessage}
 */
export function formTeamNameUpdatedMapper(metadata, updatedForm) {
  const { teamName: oldTeamName } = metadata
  const { teamName } = updatedForm

  if (!teamName) {
    throw new Error('Unexpected missing teamName')
  }

  const baseData = createFormMessageDataBase(metadata)

  /**
   * @type {FormTeamNameUpdatedMessageData}
   */
  const data = {
    ...baseData,
    changes: {
      previous: {
        teamName: oldTeamName
      },
      new: {
        teamName
      }
    }
  }
  const auditMessageBase = createV1MessageBase(metadata, updatedForm)

  return {
    ...auditMessageBase,
    data,
    category: AuditEventMessageCategory.FORM,
    type: AuditEventMessageType.FORM_TEAM_NAME_UPDATED
  }
}

/**
 * @param {FormMetadata} metadata
 * @param {PartialFormMetadataDocument} updatedForm
 * @returns {FormTeamEmailUpdatedMessage}
 */
export function formTeamEmailUpdatedMapper(metadata, updatedForm) {
  const { teamEmail: oldTeamEmail } = metadata
  const { teamEmail } = updatedForm

  if (!teamEmail) {
    throw new Error('Unexpected missing teamEmail')
  }

  const baseData = createFormMessageDataBase(metadata)

  /**
   * @type {FormTeamEmailUpdatedMessageData}
   */
  const data = {
    ...baseData,
    changes: {
      previous: {
        teamEmail: oldTeamEmail
      },
      new: {
        teamEmail
      }
    }
  }
  const auditMessageBase = createV1MessageBase(metadata, updatedForm)

  return {
    ...auditMessageBase,
    data,
    category: AuditEventMessageCategory.FORM,
    type: AuditEventMessageType.FORM_TEAM_EMAIL_UPDATED
  }
}

/**
 * @import { FormTitleUpdatedMessageData, FormOrganisationUpdatedMessage, FormOrganisationUpdatedMessageData, FormMetadata, FormCreatedMessage, FormCreatedMessageData, FormTitleUpdatedMessage, FormTeamNameUpdatedMessage, FormTeamNameUpdatedMessageData, FormTeamEmailUpdatedMessage, FormTeamEmailUpdatedMessageData } from '@defra/forms-model'
 * @import { PartialFormMetadataDocument } from '~/src/api/types.js'
 */
