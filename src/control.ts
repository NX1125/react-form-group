import React, { HTMLInputTypeAttribute } from 'react'

import isNil from 'lodash/isNil'

import {
  FormControlAttributedValidator,
  IDefaultErrors,
  IExtendedDefaultErrors,
  IFormControlValidator,
} from './validation'
import {
  IAbstractFormControl,
  IFormControlProps,
  IFormControlValue,
  INativeValidationAttributes,
  IRadioFormControlProps,
  SupportedInputElement,
} from './base'

function getChangeValue(target: SupportedInputElement, radioValue: any): IFormControlValue {
  if (target instanceof HTMLInputElement) {
    switch (target.type as HTMLInputTypeAttribute) {
      case 'number':
        return target.valueAsNumber
      case 'radio':
        return radioValue
      // FIXME: when valueAsDate can be null?
      case 'date':
        return target.valueAsDate!
      case 'checkbox':
        return target.checked
      case 'file':
        return target.files!
      default:
        return target.value
    }
  } else {
    // textarea
    return target.value
  }
}

function padZero(value: number, padding = '00') {
  return `${padding}${value}`.slice(-padding.length)
}

export function localDateAsValue(date: Date) {
  return `${padZero(date.getFullYear(), '0000')}-${padZero(date.getMonth() + 1)}-${padZero(date.getDate())}`
}

// TODO: Add opaque object form control

export class FormControl<V extends IFormControlValue = any, E extends IDefaultErrors = IExtendedDefaultErrors> implements IAbstractFormControl {
  constructor(
    public readonly value: V,
    public readonly validators?: IFormControlValidator<E>[],
    public readonly needsValidation = true,
    public readonly errors?: Partial<E> | undefined,
    public readonly dirty?: boolean,
    public readonly touched?: boolean,
  ) {
  }

  validate(): FormControl<V, E> {
    if (!this.needsValidation)
      return this

    const {
      validators,
      value,
    } = this

    if (validators) {
      const errors = this.getErrors()

      if (this.hasErrorsIn(errors))
        return new FormControl<V, E>(
          value,
          validators,
          false,
          errors,
          this.dirty,
          this.touched,
        )
    }

    return new FormControl<V, E>(
      value,
      validators,
      false,
      undefined,
      this.dirty,
      this.touched,
    )
  }

  get isValid() {
    return !this.needsValidation && !this.hasErrorsIn(this.errors)
  }

  get isInvalid() {
    return !this.needsValidation && !isNil(this.errors)
  }

  private hasErrorsIn(errors?: Partial<E>) {
    if (isNil(errors))
      return false

    return Object.getOwnPropertyNames(errors).length > 0
  }

  private getErrors(): Partial<E> | undefined {
    const { validators } = this

    if (isNil(validators))
      return undefined

    let errors: Partial<E> = {}
    for (const validator of (validators ?? [])) {
      const validation = this.validateWith(validator)

      errors = {
        ...errors,
        ...validation,
      }
    }
    if (Object.getOwnPropertyNames(errors).length <= 0)
      return undefined

    return errors
  }

  private validateWith(validator: IFormControlValidator<E>) {
    if (validator instanceof FormControlAttributedValidator) {
      return validator.validate(this.value)
    } else {
      return validator(this.value)
    }
  }

  get required() {
    return this.validators?.some(
      v => v instanceof FormControlAttributedValidator && v.attributes.required,
    ) ?? false
  }

  get numberRange(): {
    min?: number
    max?: number
  } | undefined {
    const validator = this.validators?.find(v => v instanceof FormControlAttributedValidator && (
      !isNil(v.attributes.max) || !isNil(v.attributes.min)
    )) as (FormControlAttributedValidator<any> | undefined)

    return validator?.attributes
  }

  get inputAttrs(): INativeValidationAttributes {
    let attrs: INativeValidationAttributes = {}

    for (const validator of (this.validators ?? [])) {
      if (validator instanceof FormControlAttributedValidator)
        attrs = {
          ...attrs,
          ...validator.attributes,
        }
    }

    return attrs
  }

  getInputProps(
    onChange: (control: FormControl<V, E>) => void,
    name?: string,
  ): IFormControlProps<V> {


    const onChangeValue = (value: any) => {
      onChange(new FormControl<V, E>(
        value,
        this.validators,
        true,
        undefined,
        true,
        true,
      ))
    }

    return {
      ...this.inputAttrs,
      // Fix: An invalid form control with name='...' is not focusable.
      required: undefined,
      name,
      value: this.value instanceof Date
        ? localDateAsValue(this.value)
        : isNil(this.value) ||
        typeof this.value === 'number' && isNaN(this.value) ||
        // FIXME: FileList ReferenceError
        // this.value instanceof FileList // files
        this.value.constructor.name === 'FileList'
          // Fix warning:
          //  Received NaN for the `value` attribute. If this is expected,
          //  cast the value to a string.
          ? ''
          : this.value,
      checked: this.value === true, // checkboxes
      onChange: (event: React.ChangeEvent<SupportedInputElement> | V) => {
        if (Array.isArray(event) || event instanceof Date) {
          onChangeValue(event)
          return
        }
        switch (typeof event) {
          case 'boolean':
          case 'number':
          case 'string':
            onChangeValue(event)
            return
        }

        const newValue = getChangeValue((event as React.ChangeEvent<SupportedInputElement>).target, this.value)
        onChangeValue(newValue)
      },
      onBlur: () => {
        onChange(new FormControl<V, E>(
          this.value,
          this.validators,
          this.needsValidation,
          this.errors,
          this.dirty,
          true,
        ))
      },
      onFocus: event => {
        const target = event.target ?? event.currentTarget
        if (!(
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLSelectElement
        ))
          return

        // autofill
        const newValue = getChangeValue(target, this.value)
        if (newValue !== this.value)
          onChangeValue(newValue)
      },
    }
  }

  patchValue(value: any): FormControl<V> {
    return new FormControl<V, E>(
      value,
      this.validators,
      true,
      undefined,
      this.dirty,
      this.touched,
    )
  }

  setDirty(dirty = true) {
    return new FormControl(
      this.value,
      this.validators,
      this.needsValidation,
      this.errors,
      dirty,
      this.touched,
    )
  }

  patchWithElement(source: SupportedInputElement) {
    if (source instanceof HTMLSelectElement) {
      return this.patchValue(source.value)
    } else if (source instanceof HTMLTextAreaElement) {
      return this.patchValue(source.value)
    } else {
      const value = getChangeValue(source, source.value)
      return this.patchValue(value)
    }
  }

  /**
   * Tries to update this control value with the first checked radio in the
   * array. If none is selected, then {@code undefined} is returned.
   */
  patchWithRadioElements(sources: HTMLInputElement[]) {
    for (const source of sources) {
      if (source.checked)
        return this.patchValue(source.value)
    }

    return undefined
  }

  setValidators(validators?: IFormControlValidator[]) {
    return new FormControl(
      this.value,
      validators,
      true,
      undefined,
      this.dirty,
      this.touched,
    )
  }

  /**
   * @deprecated
   */
  static toRadio<V extends IFormControlValue>(
    props: IFormControlProps<V>,
    value: V,
  ): IRadioFormControlProps<V> {
    return FormControlPropsUtil.toRadio(props, value)
  }

}

export class FormControlPropsUtil {
  static withTransform<V extends IFormControlValue>(
    props: IFormControlProps<V>,
    parseValue: (v: V) => V,
    transformValue: (v: V) => IFormControlValue,
  ): IFormControlProps<V> {
    return {
      ...props,
      value: transformValue(props.value),
      onChange(event: React.ChangeEvent<SupportedInputElement> | V) {
        let value: any
        if (Array.isArray(event) || event instanceof Date) {
          value = event
        } else {
          switch (typeof event) {
            case 'boolean':
            case 'number':
            case 'string':
              value = event
              break
            default:
              value = getChangeValue((event as React.ChangeEvent<SupportedInputElement>).target, props.value)
              break
          }
        }

        props.onChange(parseValue(value))
      },
    }
  }

  static toRadio<V extends IFormControlValue>(
    props: IFormControlProps<V>,
    value: V,
  ): IRadioFormControlProps<V> {
    return {
      ...props,
      value,
      checked: props.value === value,
      type: "radio",
      onChange() {
        props.onChange(value)
      },
    }
  }

}
