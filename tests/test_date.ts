import { FormControl } from '../src'

describe('date control', () => {
  it('should update date on change', () => {
    let updated: FormControl<Date | null> | undefined = undefined

    const control = new FormControl<Date | null>(new Date(2022, 5 - 1, 22))
    const inputProps = control.getInputProps(c => {
      updated = c.validate()
    })
  })
})
