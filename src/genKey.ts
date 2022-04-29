export class KeyGenerator {
  generatedKeys: {
    [key: string]: boolean;
  } = {}

  genKey(): string {
    let key: string | undefined
    while (key === undefined) {
      // 36^5
      key = Math.floor(Math.random() * 60500000).toString(36)
    }
    this.generatedKeys[key] = true
    return key
  }
}

const generator = new KeyGenerator()

export function genKey(): string {
  return generator.genKey()
}

export default genKey
