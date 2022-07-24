import { FormControl, FormGroup } from '../src'

enum ArtworkType {
  Artwork = 'Artwork',
  Text = 'Text',
  None = 'None',
}

interface INestedGroupValue {
  a: {
    b: {
      w: string
    }
    c: string
  }
  d: number
  e?: ArtworkType
  f: {
    e: ArtworkType
  }
}

describe('definitely typed', () => {
  it('should type it', () => {
    const group = new FormGroup<INestedGroupValue>({
      a: new FormGroup({
        b: new FormGroup({
          w: new FormControl<string, any>(''),
        }),
        c: new FormControl<string>(''),
      }),
      d: new FormControl(0),
      e: new FormControl(ArtworkType.Artwork),
      f: new FormGroup({
        e: new FormControl(ArtworkType.Artwork),
      }),
    })
    // group.controls.d.nativeValidationAttributes.required
  })
})
