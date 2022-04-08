import type React from 'react'
import { FormControl } from './control'
import { List } from 'immutable'
import { FormGroup } from './group'
import { FormGroupArray } from './array'

export type SupportedInputElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

export interface INativeValidationAttributes {
  required?: boolean
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  pattern?: string
}

export type INotNilFormControlValue = FileList | Date | string | number | boolean
export type IFormControlValue = INotNilFormControlValue | null | undefined

export type IValueToFormControl<V> =
  V extends (infer U)[] | List<infer U>
    ? FormGroupArray<U>
    : V extends IFormControlValue
      ? FormControl<V>
      : FormGroup<V>

interface IFormControlPropsBase<V extends IFormControlValue = any> extends INativeValidationAttributes {
  value: V
  name?: string
  checked: boolean

  onChange(event: React.ChangeEvent<SupportedInputElement> | V): void

  onFocus: React.FocusEventHandler<HTMLElement>
  onBlur: React.FocusEventHandler<HTMLElement>
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
    onChange: (group: IAbstractFormControl) => void,
    __namePrefix?: string,
  ): any

  patchValue(v: any): IAbstractFormControl
}
