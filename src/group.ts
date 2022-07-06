import { useRef, useState } from 'react'
import isNil from 'lodash/isNil'

import { FormControl, FormControlProps } from './control'
import { isWhitespace } from './validation'
import {
  FormChangeReason,
  IAbstractFormControl,
  IFormControlValue,
  SupportedInputElement,
} from './base'

type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? RecursivePartial<U>[]
    : T[P] extends object
      ? RecursivePartial<T[P]>
      : T[P]
}

type RecursiveFormControls<V, O = never> = {
  [P in keyof V]-?: V[P] extends IFormControlValue
    ? FormControl<V[P]>
    : FormGroup<V[P]>
}

export type IFormGroupRef<V> = {
  [P in keyof V]: V[P] extends IFormControlValue
    ? SupportedInputElement | undefined
    : V[P] extends FormControl<infer U>
      ? SupportedInputElement | undefined
      : IFormGroupRef<V[P]>
}

export type IFormGroupElements<V> = {
  [P in keyof V]?: V[P] extends IFormControlValue
    ? NodeListOf<SupportedInputElement> | SupportedInputElement[] | SupportedInputElement
    : V[P] extends FormControl<infer U>
      ? NodeListOf<SupportedInputElement> | SupportedInputElement[] | SupportedInputElement
      : IFormGroupRef<V[P]>
}

export type IFormGroupValue<V extends {
  [k in keyof V]: IFormControlValue | object
}> = {
  [P in keyof V]: V[P] extends IFormControlValue
    ? V[P]
    : V[P] extends FormControl<infer U>
      ? U
      : V[P]
}

export type IFormGroupProps<V, E extends object = any> = {
  [P in keyof V]-?: V[P] extends IFormControlValue
    ? FormControlProps<V[P]>
    : V[P] extends FormControl<infer U>
      ? FormControlProps<U>
      : IFormGroupProps<V[P]>
} & {
  setFormGroup(group: FormGroup<V, E>, reason?: FormChangeReason): void

  __formGroup: FormGroup<V, E>
  __groupName: string
}

export type IsFormGroupValidFunc<V, E extends object> = (fs: FormGroup<V, E>) => boolean

export interface IFormGroupConfig<V, E extends object> {
  validate?: IFormGroupValidator<V, E>
  validateAsync?: IFormGroupValidatorAsync<V, E>
  isValid?: IsFormGroupValidFunc<V, E>

  mapValidatedControls?: (controls: RecursiveFormControls<V>) => RecursiveFormControls<V>
}

export interface IFormGroupValidator<V, E extends object> {
  (state: FormGroup<V, E>): Partial<E> | false | undefined
}

export interface IFormGroupValidatorAsync<V, E extends object> {
  (state: FormGroup<V, E>): Promise<Partial<E> | false | undefined>
}

export class FormGroup<V extends {
  readonly [k in keyof V]: V[k]
}, E extends object = any> implements IAbstractFormControl {
  private readonly _needsValidation: boolean
  public readonly validator?: IFormGroupValidator<V, E>
  public readonly validatorAsync?: IFormGroupValidatorAsync<V, E>
  private readonly _isValidFunc?: IsFormGroupValidFunc<V, E>
  private readonly mapValidatedControls?: IFormGroupConfig<V, E>['mapValidatedControls']

  constructor(
    public readonly controls: RecursiveFormControls<V>,
    validatorsOrConfig?: IFormGroupConfig<V, E>,
    needsValidation?: boolean,
    public readonly errors?: Partial<E>,
  ) {
    const config = validatorsOrConfig as (IFormGroupConfig<V, E> | undefined)
    this.validator = config?.validate
    this.validatorAsync = config?.validateAsync
    this._isValidFunc = config?.isValid
    this.mapValidatedControls = config?.mapValidatedControls

    this._needsValidation = needsValidation ?? (!isNil(this.validator) || !isNil(this.validatorAsync)) ?? false
  }

  private get config(): IFormGroupConfig<V, E> {
    return {
      validate: this.validator,
      validateAsync: this.validatorAsync,
      isValid: this._isValidFunc,
      mapValidatedControls: this.mapValidatedControls,
    }
  }

  private getControl(name: keyof V | keyof RecursiveFormControls<V>): FormControl | FormGroup<any> {
    return (this.controls as any)[name]
  }

  validate(skipValidationIfChildrenAreInvalid = true): FormGroup<V, E> {
    const names = this.controlNames

    // nothing needs to be validated
    if (!this._needsValidation && !names.some(name => this.getControl(name).needsValidation))
      return this

    const newState: any = {}

    for (const name of names) {
      newState[name] = this.getControl(name).validate()
    }

    const mapped = this.mapValidatedControls?.(newState) ?? newState

    if (skipValidationIfChildrenAreInvalid && names.some(name => !mapped[name].isValid)) {
      // This group is not validated until all children have been validated
      return new FormGroup(mapped, this.config, false)
    }

    const errors = this.validator?.(this)

    return new FormGroup<V, E>(mapped, this.config, false, errors || undefined)
  }

  querySelectorAll(
    root: HTMLElement,
    __namePrefix = '',
  ): IFormGroupElements<V> {
    const names = this.controlNames
    const controls: any = {}

    for (const name of names) {
      const control = this.getControl(name)

      const prefix = control instanceof FormGroup ? `${__namePrefix}${name}.` : __namePrefix + name

      controls[name] = control.querySelectorAll(root, prefix)
    }

    return controls
  }

  patchFromElement(
    tree: IFormGroupElements<V>,
    __prefix = '',
  ) {
    const names = this.controlNames
    const controls: any = {}

    for (const name of names) {
      const control = this.getControl(name)
      const element = (tree as any)[name]

      if (!isNil(element) && !isNil(control))
        controls[name] = control.patchFromElement(element!, `.${__prefix}.${name}`)
    }

    return new FormGroup<V, E>({
      ...this.controls,
      ...controls,
    }, this.config, true)
  }

  getInputProps(
    onChange: (group: FormGroup<V, E>, reason?: FormChangeReason) => void,
    uncontrolled?: boolean,
    __namePrefix = '',
  ): IFormGroupProps<V, E> {
    const names = this.controlNames
    const controls: any = {}

    for (const name of names) {
      const control = this.getControl(name)
      const onDelegateChange = (c: FormControl | FormGroup<any>, reason?: FormChangeReason) => {
        onChange(new FormGroup<V, E>({
          ...this.controls,
          [name]: c,
        }, this.config, true), reason)
      }
      if (control instanceof FormGroup) {
        controls[name] = control.getInputProps(
          onDelegateChange, uncontrolled, `${__namePrefix}${name}.`,
        )
      } else {
        controls[name] = control.getInputProps(
          onDelegateChange,
          uncontrolled,
          __namePrefix + name,
        )
      }

    }

    return {
      ...controls,
      setFormGroup: onChange,
      __groupName: __namePrefix,
      __formGroup: this,
    }
  }

  get isInvalid(): boolean {
    return !this.needsValidation && !this.isValid
  }

  private isAnyControl(test: (control: FormControl | FormGroup<any>) => any) {
    const names = this.controlNames
    for (const name of names) {
      if (test(this.getControl(name))) {
        return true
      }
    }

    return false
  }

  private areAllControls(test: (control: FormControl | FormGroup<any>) => any) {
    return !this.isAnyControl(control => !test(control))
  }

  get defaultIsValid() {
    return this.areAllControls(control => control.isValid)
  }

  get isValid(): boolean {
    return !this._needsValidation && isNil(this.errors) && (
      isNil(this._isValidFunc) ? this.defaultIsValid : this._isValidFunc!(this)
    )
  }

  get needsValidation(): boolean {
    return this._needsValidation || this.isAnyControl(control => control.needsValidation)
  }

  get dirty(): boolean {
    return this.isAnyControl(control => control.dirty)
  }

  get touched(): boolean {
    return this.isAnyControl(control => control.touched)
  }

  get controlNames() {
    return Object.getOwnPropertyNames(this.controls) as (keyof V)[]
  }

  patch(controls: Partial<RecursiveFormControls<V>>) {
    return new FormGroup<V, E>({
      ...this.controls,
      ...controls,
    }, this.config, true)
  }

  patchValue(value: RecursivePartial<V>) {
    const names = this.controlNames
    const controls: any = {}

    for (const name of names) {
      if (isNil(value[name]))
        continue

      const control = this.getControl(name)

      controls[name] = control.patchValue(value[name] as any)
    }

    return this.patch(controls)
  }

  get value(): V {
    const value: any = {}

    for (const name of this.controlNames) {
      value[name] = this.getControl(name).value
    }

    return value
  }

  getValueOrDefault(defaultValue?: any): V {
    return this.transformValue(v => {
      return isNil(v) ||
      typeof v === 'string' && isWhitespace(v) ||
      typeof v === 'number' && isNaN(v)
        ? defaultValue
        : v
    })
  }

  transformValue(t: (t: any) => any): V {
    const value: any = {}

    for (const name of this.controlNames) {
      value[name] = this.getControl(name).transformValue(t)
    }

    return value
  }

  setTouched(touched = true) {
    return this.map(c => c.setTouched(touched))
  }

  setDirty(dirty = true): FormGroup<V> {
    return this.map(c => c.setDirty(dirty))
  }

  map(mapper: <V extends IFormControlValue = IFormControlValue>(control: FormControl<V>) => FormControl<V>) {
    const names = this.controlNames
    const controls: any = {}

    for (const name of names) {
      const control = this.getControl(name)

      controls[name] = mapper(control as any)
    }

    return new FormGroup(controls, this.config, this._needsValidation)
  }

  createRefTree(): IFormGroupRef<V> {
    const names = this.controlNames
    const children: any = {}

    for (const name of names) {
      const control = this.getControl(name)

      if (control instanceof FormGroup) {
        children[name] = control.createRefTree()
      } else {
        children[name] = undefined
      }
    }

    return children as IFormGroupRef<V>
  }

  // TODO: Recursive error
  get errorsTree(): any {
    const tree: any = {}

    for (const name of this.controlNames) {
      tree[name] = this.getControl(name).errorsTree
    }

    return {
      ...tree,
      ...this.errors,
    }
  }
}
