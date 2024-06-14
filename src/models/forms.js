import {
  idSchema,
  slugSchema,
  formMetadataInputSchema,
  formDefinitionSchema
} from '@defra/forms-model'
import Joi from 'joi'

// Retrieve form by ID schema
export const formByIdSchema = Joi.object()
  .keys({
    id: idSchema
  })
  .required()

export const deleteFormPayloadSchema = Joi.object({
  force: Joi.boolean().default(false)
}).allow(null) // while we only have all optional properties, we don't need to require an empty payload {}

// Retrieve form by slug schema
export const formBySlugSchema = Joi.object()
  .keys({
    slug: slugSchema
  })
  .required()

// Create form schema
export const createFormSchema = formMetadataInputSchema

// Update form definition schema
export const updateFormDefinitionSchema = formDefinitionSchema
