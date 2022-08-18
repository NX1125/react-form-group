export function isCreditCardValid(src: string) {
  src = src.replace(/[^0-9]+/g, '')
  if (src.length < 7)
    return false

  // https://github.com/microsoft/referencesource/blob/master/System.ComponentModel.DataAnnotations/DataAnnotations/CreditCardAttribute.cs
  let checksum = 0
  let evenDigit = false

  // reverse
  for (let i = src.length - 1; i >= 0; i--) {
    const digit = src[i]
    const parsedDigit = +digit

    if (isNaN(parsedDigit))
      return false

    let digitValue = parsedDigit * (evenDigit ? 2 : 1)
    evenDigit = !evenDigit

    while (digitValue > 0) {
      checksum += digitValue % 10
      digitValue = Math.floor(digitValue / 10)
    }
  }

  return (checksum % 10) == 0
}
