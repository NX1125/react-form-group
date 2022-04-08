import { List } from 'immutable'
import { IAbstractFormControl } from './base'
import { FormGroup, IFormGroupProps } from './group'
import isNil from 'lodash/isNil'

type RecursiveFormControls<V> = List<FormGroup<V>>

export interface IFormArrayValidator<V, E extends object> {
  (state: FormGroupArray<V, E>): Partial<E> | false | undefined
}

export type IFormArrayProps<V> = List<IFormGroupProps<V>>

export class FormGroupArray<V, E extends object = any>
  implements IAbstractFormControl {

  private readonly _needsValidation: boolean
  public readonly validators: IFormArrayValidator<V, E>[]

  constructor(
    public readonly controls: RecursiveFormControls<V>,
    validators?: IFormArrayValidator<V, E>[],
    needsValidation?: boolean,
    public readonly errors?: E,
  ) {
    this._needsValidation = needsValidation ?? (validators && validators.length > 0) ?? false
    this.validators = validators ?? []
  }

  get isValid() {
    return !this.needsValidation && isNil(this.errors)
  }

  get isInvalid() {
    return !this.needsValidation && !isNil(this.errors)
  }

  get dirty(): boolean {
    return this.controls.some(c => c.dirty)
  }

  get touched(): boolean {
    return this.controls.some(c => c.touched)
  }

  get value(): List<V> {
    return this.controls.map(c => c.value)
  }

  get needsValidation(): boolean {
    return this._needsValidation || this.controls.some(c => c.needsValidation)
  }

  validate(skipValidationIfChildrenAreInvalid = true): FormGroupArray<V, E> {
    if (!this._needsValidation && !this.controls.some(control => control.needsValidation))
      return this

    const newState = this.controls.map(c => c.validate())

    if (skipValidationIfChildrenAreInvalid && this.controls.some(control => !control.isValid)) {
      // This group is not validated until all children have been validated
      return new FormGroupArray<V, E>(newState, this.validators, false)
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

    return new FormGroupArray<V, E>(newState, this.validators, false, errors)
  }

  getInputProps(
    onChange: (group: FormGroupArray<V>) => void,
    __namePrefix = '',
  ): IFormArrayProps<V> {
    return this.controls.map((c, key) => c.getInputProps(
      group => onChange(new FormGroupArray(this.controls.set(key, group), this.validators, true)),
      `${__namePrefix}[${key}]`,
    ))
  }

  patch(controls: RecursiveFormControls<V>) {
    return new FormGroupArray(
      this.controls.map((c, key) => controls.get(key, c)),
      this.validators,
      true,
    )
  }

  patchValue(value: List<V>): FormGroupArray<V> {
    return new FormGroupArray(this.controls.map((c, key) => {
      const patch = value.get(key)
      return isNil(patch) ? c : c.patchValue(patch)
    }), this.validators, true)
  }

  setDirty(dirty = true): FormGroupArray<V> {
    return new FormGroupArray(this.controls.map(c => c.setDirty(dirty)), this.validators, this._needsValidation)
  }
}
