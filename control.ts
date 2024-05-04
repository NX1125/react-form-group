import React, { HTMLInputTypeAttribute } from 'react'

import isNil from 'lodash/isNil'

import {
  FormControlAttributedValidator,
  IDefaultErrors,
  IExtendedDefaultErrors,
  IFormControlValidator,
} from './validation'
import {
  FormChangeReason,
  IAbstractFormControl,
  IFormControlProps,
  IFormControlValue,
  INativeValidationAttributes,
  IRadioFormControlProps,
  SupportedInputElement,
} from './base'
import { localDateAsValue } from '@/react-form-group/localDateAsValue'

export function getChangeValue(target: SupportedInputElement, radioValue: any): IFormControlValue {
  if (target instanceof HTMLInputElement) {
    switch (target.type as HTMLInputTypeAttribute) {
      case 'number':
        if (target.value === '')
          return NaN
        return target.valueAsNumber
      case 'radio':
        return radioValue
      case 'date':
        // Date is nil when is not valid
        return target.valueAsDate
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

// TODO: Add opaque object form control

export interface IFormControlConfig<V extends IFormControlValue, E extends IDefaultErrors> {
  // TODO: Add data key
  readonly validators?: IFormControlValidator<E>[]
  readonly needsValidation?: boolean
  readonly errors?: Partial<E>
  readonly dirty?: boolean
  readonly touched?: boolean
}

export class FormControl<V extends IFormControlValue = any, E extends IDefaultErrors = IExtendedDefaultErrors>
  implements IAbstractFormControl, IFormControlConfig<V, E> {
  readonly validators: IFormControlValidator<E>[] | undefined
  readonly needsValidation: boolean
  readonly errors: Partial<E> | undefined
  readonly dirty: boolean
  readonly touched: boolean

  constructor(
    public readonly value: V,
    config?: IFormControlValidator<E>[] | IFormControlConfig<V, E>,
  ) {
    if (Array.isArray(config) || isNil(config)) {
      this.validators = config
      this.needsValidation = true
      this.dirty = false
      this.touched = false
      this.errors = undefined
    } else {
      this.validators = config!.validators
      this.needsValidation = config!.needsValidation ?? false
      this.dirty = config!.dirty ?? false
      this.touched = config!.touched ?? false
      this.errors = config!.errors
    }
  }

  transformValue(t: (t: any) => any): V {
    return t(this.value)
  }

  validate(): FormControl<V, E> {
    if (!this.needsValidation)
      return this

    const {
      validators,
      value,
      dirty,
      touched,
    } = this

    if (validators) {
      const errors = this.getErrors()

      if (this.hasErrorsIn(errors))
        return new FormControl<V, E>(
          value,
          {
            validators,
            errors,
            dirty,
            touched,
          },
        )
    }

    return new FormControl<V, E>(
      value,
      {
        validators,
        dirty,
        touched,
      },
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

  private getAttributedValidator(predicate: (v: FormControlAttributedValidator<E>) => boolean) {
    const v = this.validators?.find(v => v instanceof FormControlAttributedValidator && predicate(v))
    return v as (FormControlAttributedValidator<E> | undefined)
  }

  get numberRange(): {
    min?: number
    max?: number
  } | undefined {
    const validator = this.getAttributedValidator(v => !isNil(v.attributes.max) || !isNil(v.attributes.min))

    return validator?.attributes
  }

  get lengthRange(): {
    minLength?: number
    maxLength?: number
  } | undefined {
    const validator = this.getAttributedValidator(
      ({ attributes }) => !isNil(attributes.maxLength) || !isNil(attributes.minLength),
    )

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
    onChange: (control: FormControl<V, E>, reason?: FormChangeReason) => void,
    uncontrolled?: boolean,
    name?: string,
  ) {
    return new FormControlProps<V, E>(
      this._getInputProps(onChange, uncontrolled, name),
      this,
      onChange,
    )
  }

  private _getInputProps(
    onChange: (control: FormControl<V, E>, reason?: FormChangeReason) => void,
    uncontrolled?: boolean,
    name?: string,
  ): IFormControlProps<V> {
    const onChangeValue = (value: any, reason: FormChangeReason) => {
      onChange(new FormControl<V, E>(
        value,
        {
          validators: this.validators,
          needsValidation: true,
          dirty: true,
          touched: true,
        },
      ), reason)
    }

    const solvedValue = uncontrolled
      ? undefined
      : this.value instanceof Date
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
          : this.value

    const props: IFormControlProps = {
      ...this.inputAttrs,
      // Fix: An invalid form control with name='...' is not focusable.
      required: undefined,
      name,
      value: solvedValue,
      defaultValue: uncontrolled ? solvedValue : undefined,
      checked: uncontrolled ? undefined : this.value === true, // checkboxes
      onChange: (event: React.ChangeEvent<SupportedInputElement> | V | FormControl<V, E>) => {
        if (event instanceof FormControl) {
          onChange(event, FormChangeReason.change)
          return
        }

        if (Array.isArray(event) || event instanceof Date || isNil(event) || event instanceof FileList) {
          onChangeValue(event, FormChangeReason.change)
          return
        }
        switch (typeof event) {
          case 'boolean':
          case 'number':
          case 'string':
            onChangeValue(event, FormChangeReason.change)
            return
        }

        if (uncontrolled)
          return

        const changeEvent = event as React.ChangeEvent<SupportedInputElement>
        // if (changeEvent.target.type === 'date') {
        //   return // leave to blur
        // }

        const newValue = getChangeValue(changeEvent.target, this.value)
        onChangeValue(newValue, FormChangeReason.change)
      },
      onBlur: event => {
        const target = event.target
        if (
          target instanceof HTMLInputElement &&
          ((target.type === 'radio' || target.type === 'checkbox') &&
            !target.checked)
        ) {
          return
        }

        if (!(
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLSelectElement
        ))
          return

        const newValue = getChangeValue(target, this.value)

        onChange(new FormControl<V, E>(
          this.value,
          {
            ...this,
            dirty: newValue !== this.value || this.dirty,
            touched: true,
          },
        ), FormChangeReason.blur)
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
          onChangeValue(newValue, FormChangeReason.blur)
      },
      // ref,
    }

    if (uncontrolled) {
      delete props.value
      if (props.defaultValue === undefined)
        delete props.defaultValue
      if (props.checked === undefined)
        delete props.checked
    }

    return props
  }

  patchValue(value: any): FormControl<V> {
    return new FormControl<V, E>(
      value,
      {
        ...this,
        needsValidation: true,
        errors: undefined,
      },
    )
  }

  setTouched(touched = true) {
    return new FormControl(
      this.value,
      {
        ...this,
        touched,
      },
    )
  }

  setDirty(dirty = true) {
    return new FormControl(
      this.value,
      {
        ...this,
        dirty,
      },
    )
  }

  patchFromElement(
    elements: NodeListOf<SupportedInputElement> | SupportedInputElement[],
    __name = '',
  ): FormControl<V> {
    switch (elements.length) {
      case 0:
        return this
      case 1:
        const element = elements[0]

        return this.patchValue(getChangeValue(element, undefined))
      default:
        // Only radio is allowed
        for (let i = 0; i < elements.length; i++) {
          const radio = elements[i]
          if (!(radio instanceof HTMLInputElement) || radio.type !== 'radio')
            throw new Error(`invalid element: ${radio.name}`)

          if (radio.checked) {
            return this.patchValue(getChangeValue(radio, radio.value))
          }
        }

        return this.patchValue('')
    }
  }

  querySelectorAll(
    root: HTMLElement,
    name: string,
  ): NodeListOf<SupportedInputElement> {
    const selector = [ 'input', 'select', 'textarea' ].map(elem => `${elem}[name="${name}"]`).join(', ')
    return root.querySelectorAll<SupportedInputElement>(selector)
  }

  /**
   * Tries to update this control value with the first checked radio in the
   * array. If none is selected, then {@code undefined} is returned.
   */
  patchFromRadio(sources: HTMLInputElement[]) {
    for (const source of sources) {
      if (source.checked)
        return this.patchValue(source.value)
    }

    return undefined
  }

  setValidators(validators?: IFormControlValidator[]) {
    return new FormControl(
      this.value,
      {
        ...this,
        validators,
        needsValidation: true,
        errors: undefined,
      },
    )
  }

  get errorsTree() {
    return this.errors
  }
}

export class FormControlProps<V extends IFormControlValue = any, E extends IDefaultErrors = IExtendedDefaultErrors> {
  constructor(
    public readonly props: IFormControlProps<V>,
    public readonly control: FormControl<V, E>,
    public readonly _onChange: (control: FormControl<V, E>, reason?: FormChangeReason) => void,
  ) {
  }

  withTransform<T extends IFormControlValue = any>(
    parseValue: (v: T) => V,
    transformValue: (v: V) => T,
    reasons: {
      change?: boolean
      focus?: boolean
      blur?: boolean
    } = {
      change: true,
      focus: true,
      blur: true,
    },
  ): FormControlProps<T> {
    return new FormControlProps<T>(
      this._withTransform<T>(parseValue, transformValue, reasons),
      this.control as any,
      this._onChange as any,
    )
  }

  private _withTransform<T = any>(
    parseValue: (v: T) => V,
    transformValue: (v: V) => T,
    reasons: {
      change?: boolean
      focus?: boolean
      blur?: boolean
    },
    attrs?: any,
  ): IFormControlProps {
    const { control } = this
    return {
      ...this.props,
      ...attrs,
      value: transformValue(control.value),
      onChange: (event: React.ChangeEvent<SupportedInputElement> | V) => {
        let value: any
        if (isNil(event)) {
          value = ''
        } else if (Array.isArray(event) || event instanceof Date) {
          value = event
        } else {
          switch (typeof event) {
            case 'boolean':
            case 'number':
            case 'string':
              value = event
              break
            default:
              if (typeof event === 'object' && 'target' in (event as object)) {
                const changeEvent = event as React.ChangeEvent<SupportedInputElement>
                if (!(changeEvent.target instanceof HTMLElement)) {
                  value = event
                  break
                }

                if (!reasons.change)
                  return

                value = getChangeValue(changeEvent.target, this.props.value)
              } else {
                value = event
              }

              break
          }
        }

        this._onChange(new FormControl<V, E>(
          parseValue(value),
          {
            validators: control.validators,
            needsValidation: true,
            dirty: true,
            touched: true,
          },
        ), FormChangeReason.change)
      },
      onBlur: event => {
        const target = event.target
        if (
          target instanceof HTMLInputElement &&
          ((target.type === 'radio' || target.type === 'checkbox') &&
            !target.checked)
        ) {
          return
        }

        if (!(
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLSelectElement
        ))
          return

        if (!reasons.blur) {
          this._onChange(new FormControl<V, E>(
            control.value,
            {
              ...this.control,
              touched: true,
            },
          ), FormChangeReason.focus)
          return
        }

        const newValue: any = parseValue(getChangeValue(target, this.props.value) as any)

        this._onChange(new FormControl<V, E>(
          reasons.blur ? newValue : control.value,
          {
            ...this.control,
            dirty: newValue !== control.value || control.dirty,
            touched: true,
          },
        ), FormChangeReason.focus)
      },
      onFocus: event => {
        if (!reasons.focus) {
          return
        }

        const target = event.target ?? event.currentTarget
        if (!(
          target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLSelectElement
        ))
          return

        // autofill
        const newValue: any = parseValue(getChangeValue(target, control.value) as any)
        if (newValue !== control.value)
          this._onChange(new FormControl<V, E>(newValue, this.control), FormChangeReason.blur)
      },
    }
  }

  getNativeValidationAttributes(requiredEnabled = true): INativeValidationAttributes {
    return {
      required: requiredEnabled && this.props.required,
      min: this.props.min,
      max: this.props.max,
      minLength: this.props.minLength,
      maxLength: this.props.maxLength,
      pattern: this.props.pattern,
    }
  }

  toRadio<R extends IFormControlValue>(value: R): FormControlProps<R> {
    return new FormControlProps(this._toRadio(value), this.control, this._onChange) as any
  }

  private _toRadio<R extends IFormControlValue>(value: R): IRadioFormControlProps<R> {
    return {
      ...this.props,
      value,
      checked: this.props.value === value,
      type: 'radio',
      onChange: () => {
        this.props.onChange(value)
      },
    }
  }

}
