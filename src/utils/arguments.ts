/**
 * Parsers for `SagaTestI`'s polymorphic functions.
 */
import { SagaTestIt, EffectExpectation, Callback } from '../types'
import { describeEffect } from './fork'

export function forksArgs<Ctx, T, RT, Fn = Callback<[SagaTestIt<Ctx>]>>(
  ...args
): [string, EffectExpectation<T, RT>, Fn] {
  if (typeof args[0] !== 'string') {
    const expectedEffect: EffectExpectation<T, RT> = args[0]
    let verb = 'fork'
    if (!args[1]) verb += 's'
    else if (typeof expectedEffect !== 'function')
      verb = (expectedEffect.type as any).toLowerCase()
    return [
      `${verb} ${describeEffect(expectedEffect)}`,
      expectedEffect,
      args[1]
    ]
  }
  return [args[0], args[1], args[2]]
}

export function cloneArgs<Ctx, Fn = Callback<[SagaTestIt<Ctx>]>>(
  ...args
): [string, any?, Fn?] {
  if (typeof args[0] === 'string' && typeof args[1] === 'function')
    return [args[0], undefined, args[2]]
  if (typeof args[0] === 'string' && typeof args[2] === 'function')
    return [args[0], args[1], args[2]]
  return ['', args[0]]
}

export function doArgs<Ctx, Fn = Callback<[SagaTestIt<Ctx>]>>(
  ...args
): [string?, Fn?] {
  if (typeof args[0] === 'function') return [undefined, args[0]]
  else return [args[0], args[1]]
}
