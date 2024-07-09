import {
  idSchema,
  slugSchema,
  formMetadataInputSchema,
  formDefinitionSchema
} from '@defra/forms-model'
import Joi from 'joi'

const forceRemoveDefault = false

// Retrieve form by ID schema
export const formByIdSchema = Joi.object()
  .keys({
    id: idSchema
  })
  .required()

// Remove form payload schema
export const removeFormPayloadSchema = Joi.object()
  .keys({ force: Joi.boolean().default(forceRemoveDefault) }) // handle object payloads
  .default({ force: forceRemoveDefault }) // handle null payloads
  .empty(null)

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
