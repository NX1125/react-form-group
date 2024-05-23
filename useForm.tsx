import React, { useCallback, useState } from 'react'
import { IFormControlValue } from '@/react-form-group/base'

import { localDateAsValue } from '@/react-form-group/localDateAsValue'
import { getChangeValue } from '@/react-form-group/control'
import { IUseValidation, IValidationResult } from '@/react-form-group/useValidation'

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

export interface GetInputPropsReturn {
  attrs: React.InputHTMLAttributes<HTMLInputElement>
  validation?: IValidationResult
}

export type GetInputProps<V extends IUseFormValue<V>, C extends IUseValidation<V> = IUseValidation<V>> = <K extends keyof V>(
  key: K,
  radioValue?: string | string[] | number | typeof NotRadio,
  validation?: C,
) => GetInputPropsReturn

export interface IUseForm<V extends IUseFormValue<V>, C extends IUseValidation<V> = IUseValidation<V>> {
  fieldNames: (keyof V)[]

  value: V
  setValue: <K extends keyof V>(key: K, value: V[K]) => void
  dirty: { [K in keyof V]: boolean }
  touched: { [K in keyof V]: boolean }

  touch: <K extends keyof V>(key: K, value?: boolean) => void
  setDirty: <K extends keyof V>(key: K, value?: boolean) => void

  watch: <K extends keyof V>(key: K) => V[K]

  register: GetInputProps<V, C>
  getInputProps: GetInputProps<V, C>
}

interface SetValue<V> {
  <K extends keyof V>(key: K, value: V[K]): void
}

export interface IUseFormOptions<V> {
  initialValue: V
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

  function getInputProps<K extends keyof TValue, TValidation extends IUseValidation<TValue>>(
    key: K,
    radioValue: string | string[] | number | typeof NotRadio = NotRadio,
    validation?: TValidation,
  ): GetInputPropsReturn {
    const v = valueMap[key] as unknown as IFormControlValue

    return {
      validation: validation?.value[key],
      attrs: {
        name: key as string,
        value: radioValue === NotRadio
          ? (v instanceof Date
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
        onChange: e => {
          const value = getChangeValue(e.target, radioValue)

          setValue(key, value as TValue[K])
          setDirty(key)
        },
        onBlur: () => {
          touch(key)
        },
      },
    }
  }

  return {
    fieldNames: fieldNames as (keyof TValue)[],

    value: valueMap,
    setValue,
    dirty: dirtyMap as { [K in keyof TValue]: boolean },
    touched: touchedMap as { [K in keyof TValue]: boolean },
    touch,
    setDirty,

    getInputProps,
    watch,
    register: getInputProps,
  }
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
