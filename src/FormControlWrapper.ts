import React, { useEffect, useState } from 'react'

import { FormControlProps } from './control'
import { IFormControlValue } from './base'

function FormControlWrapper<V extends IFormControlValue, E>(props: {
  inputProps: FormControlProps<V, E>

  renderInput(params: {
    inputProps: FormControlProps<V, E>
  }): React.ReactElement<any, any> | null
}) {
  const [control, setControl] = useState(() => props.inputProps.control.validate())

  useEffect(() => {
    setControl(props.inputProps.control.validate())
  }, [props.inputProps.control])

  const inputProps = control.getInputProps(fs => {
    setControl(fs.validate())
  }, undefined, props.inputProps.props.name)

  return props.renderInput({
    ...props,
    inputProps: new FormControlProps<V, E>({
      ...inputProps.props,
      onBlur(event: React.FocusEvent<HTMLElement>) {
        props.inputProps.props.onChange(event)
      },
    }, control),
  })
}

export default FormControlWrapper
