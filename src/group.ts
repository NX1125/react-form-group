import isNil from 'lodash/isNil'

import { List } from 'immutable'

import { FormControl } from './control'
import { IAbstractFormControl, IFormControlProps, IFormControlValue, SupportedInputElement } from './base'

type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? RecursivePartial<U>[]
    : T[P] extends object
      ? RecursivePartial<T[P]>
      : T[P]
}

type RecursiveFormControls<V, O = never> = {
  [P in keyof V]: V[P] extends IFormControlValue
    ? FormControl<V[P]>
    : FormGroup<V[P]>
}
// type RecursiveFormControls<V extends {
//   [k in keyof V]: IFormControlValue | object
// }, O = never> = {
//   [P in keyof V]: V[P] extends IFormControlValue
//     ? FormControl<V[P]>
//     : V[P] extends FormControl<infer U>
//       ? FormControl<U>
//       : V[P] extends (infer U)[]
//         ? FormArray<U>
//         : FormGroup<V[P]>
// }

export type IFormGroupValue<V extends {
  [k in keyof V]: IFormControlValue | object
}> = {
  [P in keyof V]: V[P] extends IFormControlValue
    ? V[P]
    : V[P] extends FormControl<infer U>
      ? U
      : V[P]
}

export type IFormGroupProps<V> = {
  [P in keyof V]: V[P] extends IFormControlValue
    ? IFormControlProps<V[P]>
    : V[P] extends FormControl<infer U>
      ? IFormControlProps<U>
      : IFormGroupProps<V[P]>
}

export type IsFormGroupValidFunc<V, E extends object> = (fs: FormGroup<V, E>) => boolean

export interface IFormGroupConfig<V, E extends object> {
  validators?: ReadonlyArray<IFormGroupValidator<V, E>>
  isValid?: IsFormGroupValidFunc<V, E>
}

export interface IFormGroupValidator<V, E extends object> {
  (state: FormGroup<V, E>): Partial<E> | false | undefined
}

export class FormGroup<V extends {
  readonly [k in keyof V]: V[k]
}, E extends object = any> implements IAbstractFormControl {
  private readonly _needsValidation: boolean
  public readonly validators: ReadonlyArray<IFormGroupValidator<V, E>>
  private readonly _isValidFunc?: IsFormGroupValidFunc<V, E>

  constructor(
    public readonly controls: RecursiveFormControls<V>,
    validatorsOrConfig?: ReadonlyArray<IFormGroupValidator<V, E>> | IFormGroupConfig<V, E>,
    needsValidation?: boolean,
    public readonly errors?: E,
  ) {
    if (Array.isArray(validatorsOrConfig)) {
      this.validators = validatorsOrConfig
    } else {
      const config = validatorsOrConfig as (IFormGroupConfig<V, E> | undefined)
      this.validators = config?.validators ?? []
      this._isValidFunc = config?.isValid
    }

    this._needsValidation = needsValidation ?? (this.validators.length > 0) ?? false
  }

  private get config(): IFormGroupConfig<V, E> {
    return {
      validators: this.validators,
      isValid: this._isValidFunc,
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

    if (skipValidationIfChildrenAreInvalid && names.some(name => !newState[name].isValid)) {
      // This group is not validated until all children have been validated
      return new FormGroup(newState, this.config, false)
    }

    let errors: any = undefined

    for (const validator of this.validators) {
      const validation = validator(this)
      if (validation) {
        errors = {
          ...errors,
          ...validation,
        }
      }
    }

    return new FormGroup<V, E>(newState, this.config, false, errors)
  }

  getInputProps(
    onChange: (group: FormGroup<V, E>) => void,
    __namePrefix = '',
  ): IFormGroupProps<V> {
    const names = this.controlNames
    const controls: any = {}

    for (const name of names) {
      const control = this.getControl(name)
      const onDelegateChange = (c: FormControl | FormGroup<any>) => {
        onChange(new FormGroup<V, E>({
          ...this.controls,
          [name]: c,
        }, this.config, true))
      }
      if (control instanceof FormGroup) {
        controls[name] = control.getInputProps(onDelegateChange, `${__namePrefix}${name}.`)
      } else {
        controls[name] = control.getInputProps(onDelegateChange, __namePrefix + name)
      }

    }

    return controls
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

  get isValid(): boolean {
    return !this._needsValidation && isNil(this.errors) && (
      isNil(this._isValidFunc) ? this.areAllControls(control => control.isValid) : this._isValidFunc!(this)
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

  private get controlNames() {
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

  setDirty(dirty = true): FormGroup<V> {
    const names = this.controlNames
    const controls: any = {}

    for (const name of names) {
      const control = this.getControl(name)

      controls[name] = control.setDirty(dirty)
    }

    return new FormGroup(controls, this.config, this._needsValidation)
  }
}
