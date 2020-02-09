import eq from 'deep-equal'
import { CallEffectDescriptor } from 'redux-saga/effects'
import { Effect, SagaIterator } from '@redux-saga/types'
import { EffectExpectation, EffectMatcher } from '../types'
import { SagaIteratorClone, cloneableGenerator } from '@redux-saga/testing-utils'

const takeFns = ['takeEvery', 'takeLatest', 'takeLeading', 'takeMaybe']

const fname = (fn) => `${fn.constructor.name}: ${fn.name || 'Anonymous'}`

export const describeEffect = (expectedEffect: EffectExpectation): string => {
  if (typeof expectedEffect === 'function') return 'expected effect'
  const { fn, args } = expectedEffect.payload
  if (takeFns.includes(fn.name)) {
    return `${fname(args[1])} for ${args[0]}`
  } else return fname(fn)
}

export const getForkedEffect = <T, RT>(expectedEffect: EffectExpectation<T, RT>) => (effect: Effect): CallEffectDescriptor<RT> | undefined => {
  let testEffect = typeof expectedEffect == 'function' ? expectedEffect : ((e) => eq(e, expectedEffect)) as EffectMatcher<T, RT>

  switch (effect.type) {
    case 'FORK':
      return testEffect(effect) ? effect.payload : undefined
    case 'ALL': {
      const allEffects: Effect<any, CallEffectDescriptor<RT>>[] = effect.payload
      const match = allEffects.find(testEffect)
      return match ? match.payload : undefined
    }
    default:
      return undefined
  }
}

interface Iter { [Symbol.iterator]() }
const isIter = <RT>(obj: any): obj is SagaIterator<RT> & Iter => (typeof obj === 'object' && typeof obj.next === 'function' && typeof obj.throw === 'function')

export const effectToIterator = <RT>(effect: CallEffectDescriptor<RT>): SagaIteratorClone => {
  function* gen(): Iterator<RT> {
    const ret = effect.fn(...effect.args)
    if (isIter<RT>(ret)) yield* ret
    else return ret as RT
  }
  return cloneableGenerator(gen)()
}