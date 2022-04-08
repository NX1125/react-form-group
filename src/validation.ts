import isNil from 'lodash/isNil'

import { IFormControlValue, INativeValidationAttributes } from './base'
import { isCreditCardValid } from './isCreditCardValid'

export function isNilOrWhitespace(value?: string | null): value is undefined | null {
  return isWhitespace(value ?? '')
}

export function isWhitespace(value: string): boolean {
  return /^\s*$/.test(value)
}

export function isValidEmail(value?: string | null) {
  return /^[a-zA-Z.\-_0-9]+@[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)+$/.test(value ?? '')
}

export function isValidPhoneNumber(value?: string | null) {
  return /^\d{10,11}|\d?\(\d{3}\)\d{3}-\d{4}|(\d-)?\d{3}-\d{3}-\d{4}$/.test(value ?? '')
}

export type IDefaultErrors = {
  [k in keyof INativeValidationAttributes]?: boolean
}

export interface IExtendedDefaultErrors extends IDefaultErrors {
  email?: boolean
  phone?: boolean
  creditCard?: boolean
}

export type IFormControlValidatorFunc<E extends IDefaultErrors> = (
  value: IFormControlValue | undefined,
) => Partial<E> | false | undefined

type IFormControlDefaultValidatorFunc<E extends IDefaultErrors> = (
  value: IFormControlValue | undefined,
) => Partial<E> | undefined

export class FormControlAttributedValidator<E extends IDefaultErrors> {
  constructor(
    public readonly attributes: Readonly<INativeValidationAttributes>,
    public readonly validate: IFormControlDefaultValidatorFunc<E>,
  ) {
  }
}

export type IFormControlValidator<E extends IDefaultErrors = IDefaultErrors> =
  | IFormControlValidatorFunc<E>
  | FormControlAttributedValidator<E>

export class DefaultValidators {
  // noinspection JSUnusedLocalSymbols
  private constructor() {
  }

  static readonly required = new FormControlAttributedValidator<IDefaultErrors>({
    required: true,
  }, value => {
    return (isNil(value)
      || value instanceof Date && isNaN(value.getTime())
      || typeof value === 'number' && isNaN(value)
      || Array.isArray(value) && value.length <= 0
      || typeof value === 'string' && isWhitespace(value)) ? {
      required: true,
    } : undefined
  })

  static numberRange(min?: number, max?: number) {
    return new FormControlAttributedValidator<IDefaultErrors>({
      min,
      max,
    }, value => {
      if (isNil(value))
        return undefined

      const valueAsNumber = +value

      if (!isFinite(valueAsNumber))
        return undefined

      const errors: Partial<IDefaultErrors> = {}

      if (!isNil(min) && valueAsNumber < min)
        errors.min = true

      if (!isNil(max) && valueAsNumber > max)
        errors.max = true

      return errors
    })
  }

  static lengthRange(minLength?: number, maxLength?: number): IFormControlValidator {
    return new FormControlAttributedValidator<IDefaultErrors>({
      minLength,
      maxLength,
    }, value => {
      if (typeof value !== "string")
        return undefined

      const length = value.length

      const errors: Partial<IDefaultErrors> = {}

      if (!isNil(minLength) && length < minLength)
        errors.minLength = true

      if (!isNil(maxLength) && length > maxLength)
        errors.maxLength = true

      return errors
    })
  }

  static pattern(pattern: string | RegExp) {
    return new FormControlAttributedValidator<IDefaultErrors>({
      pattern: typeof pattern === 'string' ? pattern : pattern.source,
    }, value => {
      if (isNil(value))
        return undefined

      const valueAsString = String(value)
      const regex = new RegExp(pattern)

      if (regex.test(valueAsString))
        return undefined

      return {
        pattern: true,
      }
    })
  }

  private static createStringToBoolValidator(
    validator: (value: string) => boolean,
    error: IExtendedDefaultErrors,
  ): IFormControlDefaultValidatorFunc<IExtendedDefaultErrors> {
    return value => {
      if (isNil(value) || typeof value !== 'string')
        return undefined

      const valueAsString = String(value)

      if (validator(valueAsString))
        return undefined

      return error
    }
  }

  static readonly email: IFormControlValidatorFunc<IExtendedDefaultErrors> = DefaultValidators.createStringToBoolValidator(isValidEmail, {
    email: true,
  })

  static readonly phone: IFormControlValidatorFunc<IExtendedDefaultErrors> = DefaultValidators.createStringToBoolValidator(isValidPhoneNumber, {
    phone: true,
  })

  static readonly creditCard = DefaultValidators.createStringToBoolValidator(isCreditCardValid, {
    creditCard: true,
  })
}
