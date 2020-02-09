import { EffectMiddleware } from 'redux-saga'

export default (context = {}): EffectMiddleware => (next) => (effect) => {
  switch (effect && effect.type) {
    case 'GET_CONTEXT':
      return next(context[effect.payload])
    case 'SET_CONTEXT':
      Object.assign(context, effect.payload)
      return next(undefined)
    default:
      next(effect)
  }
}