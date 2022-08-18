import React, { useEffect, useState } from 'react'

import { IFormGroupProps } from "./group"
import { FormChangeReason } from './base'

export function FormGroupWrapper<V>(props: {
  inputProps: IFormGroupProps<V>
  renderGroup(params: {
    inputProps: IFormGroupProps<V>
  }): React.ReactElement<any, any> | null
}) {
  const [formState, setFormState] = useState(props.inputProps.__formGroup)
  const inputProps = formState.getInputProps((fs, reason) => {
    if (reason === FormChangeReason.blur) {
      // Delegate
      props.inputProps.setFormGroup(fs, reason)
    } else {
      setFormState(fs.validate())
    }
  }, undefined, props.inputProps.__groupName)

  useEffect(() => {
    setFormState(props.inputProps.__formGroup)
  }, [props.inputProps.__formGroup])

  return props.renderGroup({
    inputProps,
  })
}

export default FormGroupWrapper
