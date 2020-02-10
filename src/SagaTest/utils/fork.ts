/**
 * Helpers for `SagaTestI`'s fork method that handle redux saga effects.
 * @module utils/arguments
 */
import eq from 'deep-equal'
import { CallEffectDescriptor } from 'redux-saga/effects'
import { Effect } from '@redux-saga/types'
import {
  SagaIteratorClone,
  cloneableGenerator
} from '@redux-saga/testing-utils'
import { EffectExpectation, EffectMatcher } from '../../types'
import { isIter } from './generator'

const takeFns = ['takeEvery', 'takeLatest', 'takeLeading', 'takeMaybe']

const fname = fn => `${fn.constructor.name}: ${fn.name || 'Anonymous'}`

/**
 * Generates a descriptive name for a given `EffectExpectation`.
 * @param expectedEffect
 */
export const describeEffect = (expectedEffect: EffectExpectation): string => {
  if (typeof expectedEffect === 'function') return 'expected effect'
  const { fn, args } = expectedEffect.payload
  if (takeFns.includes(fn.name)) {
    return `${fname(args[1])} for ${args[0]}`
  } else return fname(fn)
}

/**
 *
 * @param expectedEffect
 */
export const matchCallEffect = <T, RT>(
  expectedEffect: EffectExpectation<T, RT>
) => (effect: Effect): CallEffectDescriptor<RT> | undefined => {
  const testEffect =
    typeof expectedEffect == 'function'
      ? expectedEffect
      : ((e => eq(e, expectedEffect)) as EffectMatcher<T, RT>)

  switch (effect.type) {
    case 'ALL': {
      const allEffects: Effect<any, CallEffectDescriptor<RT>>[] = effect.payload
      const match = allEffects.find(testEffect)
      return match ? match.payload : undefined
    }
    case 'CPS':
    case 'CALL':
    case 'FORK':
      return testEffect(effect) ? effect.payload : undefined
    default:
      return undefined
  }
}

export const effectToIterator = <RT>(
  effect: CallEffectDescriptor<RT>
): SagaIteratorClone & { name?: string } => {
  function* gen(): Iterator<RT> {
    const ret = effect.fn(...effect.args)
    if (isIter<RT>(ret)) yield* ret
    else return ret as RT
  }
  return Object.assign(cloneableGenerator(gen)(), { name: effect.fn.name })
}
