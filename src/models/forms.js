import {
  idSchema,
  slugSchema,
  formMetadataAuthorSchema,
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

// Retrieve form by slug schema
export const formBySlugSchema = Joi.object()
  .keys({
    slug: slugSchema
  })
  .required()

// Create form schema
export const createFormSchema = Joi.object()
  .keys({
    metadata: formMetadataInputSchema,
    author: formMetadataAuthorSchema
  })
  .required()

// Create state schema (draft from live, live from draft)
export const createStateSchema = formMetadataAuthorSchema

// Update form definition schema
export const updateFormDefinitionSchema = Joi.object()
  .keys({
    definition: formDefinitionSchema,
    author: formMetadataAuthorSchema
  })
  .required()
