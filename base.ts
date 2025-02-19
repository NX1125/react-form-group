/* eslint-disable @typescript-eslint/no-empty-object-type */
import type React from 'react'
import { FormControl } from './control'
import { FormGroup } from './group'

export type SupportedInputElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

export interface INativeValidationAttributes {
  required?: boolean
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  pattern?: string
}

export type INotNilFormControlValue = FileList | File | Date | string | number | boolean
export type IFormControlValue = INotNilFormControlValue | null | undefined
export type IFormGroupValue<V> = {
  [k in keyof V]: V[k] extends IFormControlValue
    ? V[k]
    : V[k] extends IFormGroupValue<V[k]>
      ? V[k]
      : never
}

/**
 * @deprecated
 */
export type IValueToFormControl<V> =
  V extends IFormControlValue
    ? FormControl<V>
    : FormGroup<V>

interface IFormControlPropsBase<V extends IFormControlValue = any> extends INativeValidationAttributes {
  value: V
  defaultValue?: V
  name?: string
  checked?: boolean

  onChange(event: React.ChangeEvent<SupportedInputElement> | V | FormControl<V>): void

  onFocus: React.FocusEventHandler<HTMLElement>
  onBlur: React.FocusEventHandler<HTMLElement>

  'data-react-form-group-key'?: string

  // ref?: React.RefCallback<SupportedInputElement>
}

export interface IFormControlProps<V extends IFormControlValue = any> extends IFormControlPropsBase {
}

export interface IRadioFormControlProps<V extends IFormControlValue = any> extends IFormControlPropsBase<V> {
  checked: boolean
  type: 'radio'
}

export interface IAbstractFormControl {
  readonly dirty?: boolean | undefined
  readonly touched?: boolean | undefined
  readonly needsValidation?: boolean

  readonly isValid: boolean
  readonly isInvalid: boolean

  validate(): IAbstractFormControl

  readonly errors?: any
  readonly validators?: any
  readonly value: any

  getInputProps(
    onChange: (group: IAbstractFormControl, reason?: FormChangeReason) => void,
    uncontrolled?: boolean,
    __namePrefix?: string,
  ): any

  patchValue(v: any): IAbstractFormControl
}

export enum FormChangeReason {
  change = 'change',
  blur = 'blur',
  focus = 'focus',
}
