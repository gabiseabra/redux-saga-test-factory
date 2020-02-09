import { SagaIterator } from 'redux-saga'

export interface Iter {
  [Symbol.iterator]()
}

export const isIter = <RT>(obj: any): obj is SagaIterator<RT> & Iter =>
  typeof obj === 'object' &&
  typeof obj.next === 'function' &&
  typeof obj.throw === 'function'
