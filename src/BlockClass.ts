export type Callback<T extends any[] = any[]> = (...any: T) => any
export type CallbackFunction<T extends any[] = any[]> = (fn: Callback<T>) => any
export interface BlockFunction<T extends any[] = any[]> {
  (desc: string, fn?: Callback<T>): any
}
export interface It<T extends any[] = any> extends BlockFunction<T> {
  skip: BlockFunction<T>
  only: BlockFunction<T>
}

export interface Callable<I extends any[], O = void> {
  (...args: I): O
  __call__(...args: I): O
}

// Ignore no match for (...args: I): O from Callable interface
// @ts-ignore-next-line
export default abstract class BlockClass<T extends BlockFunction<any[]>>
  extends Function
  implements Callable<Parameters<T>, void> {
  constructor() {
    super('...args', 'this.__call__(...args)')
  }

  abstract __call__: T
}