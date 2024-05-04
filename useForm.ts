import React, { useState } from 'react'
import { IFormControlValue } from '@/react-form-group/base'

import { localDateAsValue } from '@/react-form-group/localDateAsValue'
import { getChangeValue } from '@/react-form-group/control'

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

export type GetInputProps<V> = <K extends keyof V>(
  key: K,
  radioValue?: string | string[] | number | typeof NotRadio,
) => React.InputHTMLAttributes<HTMLInputElement>

export interface IUseForm<V extends IUseFormValue<V>> {
  fieldNames: (keyof V)[]

  value: V
  setValue: <K extends keyof V>(key: K, value: V[K]) => void
  dirty: { [K in keyof V]: boolean }
  touched: { [K in keyof V]: boolean }

  touch: <K extends keyof V>(key: K, value?: boolean) => void
  setDirty: <K extends keyof V>(key: K, value?: boolean) => void

  watch: <K extends keyof V>(key: K) => V[K]

  register: GetInputProps<V>
  getInputProps: GetInputProps<V>
}

export function useForm<V extends IUseFormValue<V>>(options: {
  initialValue: V
}): IUseForm<V> {
  const [ fieldNames ] = useState(() => Object.keys(options.initialValue))
  const [ valueMap, setValueMap ] = useState<V>(options.initialValue)

  const [ touchedMap, setTouchedMap ] = useState<{
    [k: string]: boolean
  }>({})
  const [ dirtyMap, setDirtyMap ] = useState<{
    [k: string]: boolean
  }>({})

  const touch = (key: keyof V, value: boolean = true) => {
    setTouchedMap({
      ...touchedMap,
      [key]: value,
    })
  }

  const setDirty = (key: keyof V, value: boolean = true) => {
    setDirtyMap({
      ...dirtyMap,
      [key]: value,
    })
  }

  function watch<K extends keyof V>(key: K): V[K] {
    return valueMap[key]
  }

  function setValue<K extends keyof V>(key: K, value: V[K]) {
    setValueMap({
      ...valueMap,
      [key]: value,
    })
  }

  function getInputProps<K extends keyof V>(
    key: K,
    radioValue: string | string[] | number | typeof NotRadio = NotRadio,
  ): React.InputHTMLAttributes<HTMLInputElement> {
    const v = valueMap[key] as unknown as IFormControlValue

    return {
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

        setValueMap({
          ...valueMap,
          [key]: value,
        })

        setDirty(key)
      },
      onBlur: () => {
        touch(key)
      },
    }
  }

  return {
    fieldNames: fieldNames as (keyof V)[],

    value: valueMap,
    setValue,
    dirty: dirtyMap as { [K in keyof V]: boolean },
    touched: touchedMap as { [K in keyof V]: boolean },
    touch,
    setDirty,

    getInputProps,
    watch,
    register: getInputProps,
  }
}

