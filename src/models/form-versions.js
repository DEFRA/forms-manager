import {
  FormStatus,
  formDefinitionSchema,
  formDefinitionV2Schema,
  formMetadataInputSchema,
  idSchema,
  slugSchema
} from '@defra/forms-model'
import Joi from 'joi'

import { ALL_VERSION_CHANGE_TYPES } from '~/src/api/forms/constants/version-change-types.js'

export const formVersionDocumentSchema = Joi.object({
  _id: Joi.object().optional(),
  formId: idSchema.required(),
  versionNumber: Joi.number().integer().min(1).required(),
  formDefinition: Joi.alternatives()
    .try(formDefinitionSchema, formDefinitionV2Schema)
    .required(),
  metadata: Joi.object({
    title: formMetadataInputSchema.extract('title').required(),
    slug: slugSchema.required(),
    organisation: formMetadataInputSchema.extract('organisation').required(),
    teamName: formMetadataInputSchema.extract('teamName').required(),
    teamEmail: formMetadataInputSchema.extract('teamEmail').required()
  }).required(),
  status: Joi.string()
    .valid(...Object.values(FormStatus))
    .required(),
  createdAt: Joi.date().required(),
  createdBy: Joi.object({
    id: Joi.string().required(),
    displayName: Joi.string().required()
  }).required(),
  changeType: Joi.string()
    .valid(...ALL_VERSION_CHANGE_TYPES)
    .required(),
  changeDescription: Joi.string().optional()
}).required()

export const formVersionQuerySchema = Joi.object({
  formId: idSchema.required(),
  limit: Joi.number().integer().min(1).max(100).default(10),
  offset: Joi.number().integer().min(0).default(0)
}).required()

export const formVersionByIdSchema = Joi.object({
  id: idSchema.required(),
  versionNumber: Joi.string().required()
}).required()

export const publicFormDefinitionSchema = Joi.object({
  id: idSchema.required()
}).required()
