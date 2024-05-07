import React, { useMemo } from 'react'

import { DefaultValidators, IExtendedDefaultErrors } from '@/react-form-group/validation'
import { IFormControlValue } from '@/react-form-group/base'
import { IUseForm, IUseFormValue } from '@/react-form-group/useForm'

export interface IValidationResult {
  errors?: IExtendedDefaultErrors
  attrs?: React.InputHTMLAttributes<HTMLInputElement>
  success: boolean
  validation: IValidationOptions
}

export interface IValidationOptions {
  required?: boolean

  min?: number
  max?: number

  minLength?: number
  maxLength?: number

  pattern?: RegExp | string

  email?: boolean
  phone?: boolean
  creditCard?: boolean
}

function useValueValidation(value: IFormControlValue, checks: IValidationOptions & { none?: true }) {
  return useMemo<IValidationResult | undefined>(() => {
    if (checks.none)
      return undefined

    const attrs: React.InputHTMLAttributes<HTMLInputElement> = {}
    const errors: IExtendedDefaultErrors = {}
    let success = true
    let isNilOrWhitespace = DefaultValidators.required.validate(value)?.required

    if (checks.required) {
      attrs.required = true

      if (isNilOrWhitespace) {
        errors.required = true
        success = false
      }
    }

    let hasRange = false

    if (typeof checks.min === 'number') {
      hasRange = true
      attrs.min = checks.min
    }

    if (typeof checks.max === 'number') {
      hasRange = true
      attrs.max = checks.max
    }

    if (hasRange) {
      const r = DefaultValidators.numberRange(checks.min, checks.max).validate(value)
      if (r) {
        if (r.min) {
          errors.min = true
          success = false
        }
        if (r.max) {
          errors.max = true
          success = false
        }
      }
    }

    hasRange = false

    if (typeof checks.minLength === 'number') {
      hasRange = true
      attrs.minLength = checks.minLength
    }

    if (typeof checks.maxLength === 'number') {
      hasRange = true
      attrs.maxLength = checks.maxLength
    }

    if (hasRange) {
      const r = DefaultValidators.lengthRange(checks.minLength, checks.maxLength).validate(value)
      if (r) {
        if (r.minLength) {
          errors.minLength = true
          success = false
        }
        if (r.maxLength) {
          errors.maxLength = true
          success = false
        }
      }
    }

    if (typeof checks.pattern === 'string' || checks.pattern instanceof RegExp) {
      const r = DefaultValidators.pattern(checks.pattern).validate(value)
      if (r) {
        if (r.pattern) {
          errors.pattern = true
          success = false
        }
      }
    }

    if (checks.email) {
      const r = DefaultValidators.email(value)
      if (r) {
        if (r.email) {
          errors.email = true
          success = false
        }
      }
    }

    if (checks.phone) {
      const r = DefaultValidators.phone(value)
      if (r) {
        if (r.phone) {
          errors.phone = true
          success = false
        }
      }
    }

    if (checks.creditCard) {
      const r = DefaultValidators.creditCard(value)
      if (r) {
        if (r.creditCard) {
          errors.creditCard = true
          success = false
        }
      }
    }

    return {
      errors: success ? undefined : errors,
      attrs,
      success,
      validation: {
        required: checks.required,
        min: checks.min,
        max: checks.max,
        minLength: checks.minLength,
        maxLength: checks.maxLength,
        pattern: checks.pattern,
        email: checks.email,
        phone: checks.phone,
        creditCard: checks.creditCard,
      },
    }
  }, [
    value,
    checks.none,
    checks.required,
    checks.min,
    checks.max,
    checks.minLength,
    checks.maxLength,
    checks.pattern,
    checks.email,
    checks.phone,
    checks.creditCard,
  ])
}

export function useValidation<V extends IUseFormValue<V>, C extends {
  [key in keyof V]?: IValidationOptions
}>(form: IUseForm<V>, checks: C): IUseValidation<V, C> {
  const validation = {} as {
    [key in keyof C]: IValidationResult
  }
  let isValid = true

  for (const key of form.fieldNames) {
    const options = checks[key as keyof V]

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const result = useValueValidation(form.watch(key as keyof V), options || { none: true })!
    validation[key as keyof V] = result
    isValid = isValid && (result === undefined || result.success)
  }

  return {
    value: validation,
    isValid,
  }
}

export type IUseValidationResult<V extends IUseFormValue<V>, C extends {
  [key in keyof V]?: IValidationOptions
} = {
  [key in keyof V]?: IValidationOptions
}> = ReturnType<typeof useValidation<V, C>>

export interface IUseValidation<V extends IUseFormValue<V>, C extends {
  [key in keyof V]?: IValidationOptions
} = {
  [key in keyof V]?: IValidationOptions
}> {
  value: {
    [key in keyof C]: IValidationResult
  }
  isValid: boolean
}
