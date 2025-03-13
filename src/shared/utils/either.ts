
export class Either<L, R> {
  private left: L;
  private right: R;

  constructor(left: L, right: R) {
    this.left = left;
    this.right = right;
  }

  get(): R {
    return this.right as R;
  }

  getLeft(): L {
    return this.left as L;
  }

  isLeft(): boolean {
    return this.left !== undefined
  }

  isRight(): boolean {
    return this.right !== undefined
  }
}

export function makeLeft<L>(value: L) {
  return new Either(value, undefined as any);
}

export function makeRight<R>(value: R) {
  return new Either(undefined as any, value);
}

