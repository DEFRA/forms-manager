import {
  idSchema,
  slugSchema,
  formMetadataAuthorSchema,
  formMetadataInputSchema
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

// Promote form schema
export const promoteFormSchema = formMetadataAuthorSchema
