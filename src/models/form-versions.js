import { idSchema } from '@defra/forms-model'
import Joi from 'joi'

import { ALL_VERSION_CHANGE_TYPES } from '~/src/api/forms/constants/version-change-types.js'

/**
 * Schema for form version document
 */
export const formVersionDocumentSchema = Joi.object({
  _id: Joi.object().optional(), // MongoDB ObjectId
  formId: idSchema.required(),
  versionNumber: Joi.number().integer().min(1).required(),
  formDefinition: Joi.object().required(), // The complete form definition
  metadata: Joi.object({
    title: Joi.string().required(),
    slug: Joi.string().required(),
    organisation: Joi.string().required(),
    teamName: Joi.string().required(),
    teamEmail: Joi.string().email().required()
  }).required(),
  status: Joi.string().valid('draft', 'live').required(),
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

/**
 * Schema for querying form versions
 */
export const formVersionQuerySchema = Joi.object({
  formId: idSchema.required(),
  limit: Joi.number().integer().min(1).max(100).default(10),
  offset: Joi.number().integer().min(0).default(0)
}).required()

/**
 * Schema for retrieving a specific version
 */
export const formVersionByIdSchema = Joi.object({
  id: idSchema.required(),
  versionNumber: Joi.string().required()
}).required()

/**
 * Schema for public form definition retrieval
 */
export const publicFormDefinitionSchema = Joi.object({
  id: idSchema.required()
}).required()
