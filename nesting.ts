type NodeValue = Date | string | number | null | undefined

type GroupValue<V> = {
  [k in keyof V]: V[k] extends NodeValue
    ? V[k]
    : V[k] extends GroupValue<V[k]>
      ? V[k]
      : never
}

class MyNode<V extends NodeValue, E = any> {
  constructor(
    public readonly id: V,
    public readonly errors?: E,
  ) {
  }
}

type GroupChild<V, E = any> = V extends NodeValue
  ? MyNode<V, E>
  : V extends object
    ? MyGroup<V, E>
    : never

type GroupChildren<V extends object, E = any> = {
  [k in keyof V]: GroupChild<V[k]>
}

class MyGroup<V extends object, E = any> {
  constructor(
    public readonly children: GroupChildren<V>,
    public readonly errors?: E,
  ) {
  }
}

// sample

interface IRootValue {
  comment: {
    text: string
    when: Date | string
  }
  post: {
    title: string
    description: string
    timesRead: number
  }
  creditCard: {
    num: string
    expires: string
  }
}

const group = new MyGroup<IRootValue>({
  comment: new MyGroup({
    text: new MyNode(''),
    when: new MyNode(new Date()),
  }),
  post: new MyGroup({
    description: new MyNode(''),
    timesRead: new MyNode(0),
    title: new MyNode(''),
  }),
  creditCard: new MyGroup({
    num: new MyNode(''),
    expires: new MyNode(''),
  }),
})

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
  e: ArtworkType
  f: {
    e: ArtworkType
  }
}

const group2 = new MyGroup<INestedGroupValue>({
  a: new MyGroup({
    b: new MyGroup({
      w: new MyNode(''),
    }),
    c: new MyNode(''),
  }),
  d: new MyNode(0),
  e: new MyNode(ArtworkType.None),
  f: new MyGroup({
    e: new MyNode(ArtworkType.Artwork),
  }),
})

export {
  group,
  group2,
}
