export function localDateAsValue(date: Date) {
  return date.toISOString().substring(0, 10)
}
