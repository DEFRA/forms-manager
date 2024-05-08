import { idSchema, slugSchema } from '@defra/forms-model'
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
