import eq from 'deep-equal'
import { CallEffectDescriptor } from 'redux-saga/effects'
import { Effect } from '@redux-saga/types'

export type EffectMatcher = (action: Effect) => Boolean
export type EffectExpectation<RT = any> = CallEffectDescriptor<RT> | EffectMatcher

export const describeEffect = (expectedEffect: EffectExpectation): string => {
  if (typeof expectedEffect === 'function') return 'expected effect'
  return JSON.stringify(expectedEffect)
}

export const getForkedAction = <RT>(expectedEffect: EffectExpectation<RT>) => (effect: Effect): CallEffectDescriptor<RT> | undefined => {
  let testEffect = typeof expectedEffect == 'function' ? expectedEffect : (e: Effect): Boolean => eq(e, expectedEffect)

  switch (effect.type) {
    case 'FORK':
      return testEffect(effect.payload) ? effect.payload : undefined
    case 'ALL': {
      const allEffects: Effect<any, CallEffectDescriptor<RT>>[] = effect.payload
      const match = allEffects.find(testEffect)
      return match ? match.payload : undefined
    }
    default:
      return undefined
  }
}