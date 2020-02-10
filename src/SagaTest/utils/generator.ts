import { SagaIterator } from 'redux-saga'

export interface Iter {
  [Symbol.iterator]()
}

export const isIter = <RT>(obj: any): obj is SagaIterator<RT> & Iter =>
  typeof obj === 'object' &&
  'next' in obj &&
  'throw' in obj &&
  typeof obj.next === 'function' &&
  typeof obj.throw === 'function'
