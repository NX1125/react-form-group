import React, { useCallback, useState } from 'react'
import { IFormControlValue } from '@/react-form-group/base'

import { localDateAsValue } from '@/react-form-group/localDateAsValue'
import { getChangeValue } from '@/react-form-group/control'
import {
  IUseValidation,
  IUseValidationOptionsGroup,
  IValidationOptions,
  IValidationResult,
  useValidation,
} from '@/react-form-group/useValidation'

export interface IUseFormControl<V extends IFormControlValue> {
  value: V

  touched: boolean
  dirty: boolean

  setValue: (value: V) => void
}

const NotRadio = Symbol('NotRadio')

// A form group is one where it can have its own properties, but all values must be contained in IFormControlValue
export type IUseFormValue<V> = {
  [K in keyof V]: V[K]
}

export interface GetInputPropsReturn<V extends IFormControlValue = IFormControlValue> {
  attrs: React.InputHTMLAttributes<HTMLInputElement> | React.TextareaHTMLAttributes<HTMLTextAreaElement> | any
  validation?: {
    result: IValidationResult
    options: IValidationOptions
  } | undefined

  value: V
  touched: boolean
  name: string
}

export type GetInputProps<V extends IUseFormValue<V>, C extends IUseValidation<V> = IUseValidation<V>> = <K extends keyof V>(
  key: K,
  validation?: C,
  radioValue?: string | string[] | number | typeof NotRadio,
  format?: (value: V[K]) => string,
) => GetInputPropsReturn

export interface IUseForm<V extends IUseFormValue<V>, C extends IUseValidationOptionsGroup<V> = IUseValidationOptionsGroup<V>> {
  fieldNames: (keyof V)[]

  value: V
  setValue: <K extends keyof V>(key: K, value: V[K]) => void
  dirty: { [K in keyof V]: boolean }
  touched: { [K in keyof V]: boolean }

  anyDirty: boolean
  anyTouched: boolean

  touch: <K extends keyof V>(key: K, value?: boolean) => void
  setDirty: <K extends keyof V>(key: K, value?: boolean) => void

  watch: <K extends keyof V>(key: K) => V[K]

  register: GetInputProps<V, IUseValidation<V, C>>
  getInputProps: GetInputProps<V, IUseValidation<V, C>>

  validation: IUseValidation<V, C>

  useValidation<C extends IUseValidationOptionsGroup<V>>(checks: C): IUseValidation<V, C>

  clearDirty(): void

  patchValue(value: Partial<V>): void
}

interface SetValue<V> {
  <K extends keyof V>(key: K, value: V[K]): void
}

interface PatchValue<V> {
  (value: Partial<V>): void
}

export interface IUseFormOptions<V, C extends IUseValidationOptionsGroup<V> = IUseValidationOptionsGroup<V>> {
  initialValue: V
  validation?: C
}

export function useForm<TValue extends IUseFormValue<TValue>>(options: IUseFormOptions<TValue>): IUseForm<TValue> {
  const [ fieldNames ] = useState(() => Object.keys(options.initialValue))
  const [ valueMap, setValueMap ] = useState<TValue>(options.initialValue)

  const [ touchedMap, setTouchedMap ] = useState<{
    [k: string]: boolean
  }>({})
  const [ dirtyMap, setDirtyMap ] = useState<{
    [k: string]: boolean
  }>({})

  const touch = (key?: keyof TValue, value: boolean = true) => {
    setTouchedMap(key ? {
      ...touchedMap,
      [key]: value,
    } : fieldNames.reduce((acc, k) => ({
      ...acc,
      [k]: value,
    }), {}))
  }

  const setDirty = (key: keyof TValue, value: boolean = true) => {
    setDirtyMap({
      ...dirtyMap,
      [key]: value,
    })
  }

  function watch<K extends keyof TValue>(key: K): TValue[K] {
    return valueMap[key]
  }

  const setValue = useCallback<SetValue<TValue>>((key, value) => {
    setValueMap(vs => ({
      ...vs,
      [key]: value,
    }))
  }, [])

  const patchValue = useCallback<PatchValue<TValue>>(value => {
    setValueMap(vs => ({
      ...vs,
      ...value,
    }))
  }, [])

  function getInputProps<K extends keyof TValue, TValidation extends IUseValidation<TValue>>(
    key: K,
    validation?: TValidation,
    radioValue: string | string[] | number | typeof NotRadio = NotRadio,
    format?: (value: TValue[K]) => string,
  ): GetInputPropsReturn {
    validation = validation || form.validation as TValidation
    const v = valueMap[key] as unknown as IFormControlValue

    return {
      name: key as string,
      validation: validation?.checks[key] ? {
        result: validation.value[key]!,
        options: validation.checks[key]!,
      } : undefined,
      attrs: {
        name: key as string,
        value: radioValue === NotRadio
          ? typeof format === 'function'
            ? format(v as TValue[K])
            : (v instanceof Date
              ? localDateAsValue(v)
              : typeof v === 'boolean'
                ? v ? 'true' : 'false'
                : v === undefined || v === null
                || typeof v === 'number' && isNaN(v)
                || typeof v === 'object' && v.constructor.name === 'FileList'
                || typeof v === 'object' && v.constructor.name === 'File'
                  // Fix warning:
                  //  Received NaN for the `value` attribute. If this is expected,
                  //  cast the value to a string.
                  ? ''
                  : v as string)
          : radioValue,
        checked: radioValue !== NotRadio && v === radioValue || v === true,
        onChange: (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => {
          const value = getChangeValue(e.target, radioValue)

          setValue(key, value as TValue[K])
          setDirty(key)
        },
        onBlur: () => {
          touch(key)
        },
      },
      value: valueMap[key],
      touched: touchedMap[key],
    }
  }

  const clearDirty = useCallback(() => {
    setDirtyMap({})
  }, [])

  const form: IUseForm<TValue> = {
    fieldNames: fieldNames as (keyof TValue)[],

    value: valueMap,
    setValue,
    dirty: dirtyMap as { [K in keyof TValue]: boolean },
    touched: touchedMap as { [K in keyof TValue]: boolean },

    anyDirty: Object.values(dirtyMap).some(x => x),
    anyTouched: Object.values(touchedMap).some(x => x),

    touch,
    setDirty,

    getInputProps,
    watch,
    register: getInputProps,

    useValidation<C extends IUseValidationOptionsGroup<TValue>>(checks: C): IUseValidation<TValue, C> {
      return useValidation(this, checks)
    },

    clearDirty,

    validation: undefined!,
    patchValue,
  }

  form.validation = useValidation(form, options.validation || {} as IUseValidationOptionsGroup<TValue>)

  return form
}

export const UseFormContext = React.createContext<IUseForm<any>>(undefined!)

export function useFormContext<V>(): IUseForm<V> {
  return React.useContext(UseFormContext) as IUseForm<V>
}

export function Form<V>({ form, ...props }: React.PropsWithChildren<{
  form: IUseForm<V>
}>) {
  return (
    <UseFormContext.Provider value={form}>
      <form
        {...props}
      >
        {props.children}
      </form>
    </UseFormContext.Provider>
  )
}
