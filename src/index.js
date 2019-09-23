import { IO } from '@redux-saga/symbols'
import { cloneableGenerator } from '@redux-saga/testing-utils'

const runSaga = (middleware) => (gen, state) => {
  const nextState =
    state.value instanceof Error ?
    gen.throw(state.value) :
    gen.next(state.value)
  const value = middleware.reduce((effect, fn) => {
    fn((value) => {
      effect = value
    })(effect)
    return effect
  }, nextState.value)
  return Object.assign({}, state, nextState, {value})
}

export default (options = {}, {it, before} = global) => (saga, ...args) => {
  function sagaTestFactory(gen) {
    let state = {
      value: undefined,
      context: options.context ? {...options.context} : undefined
    }
    const middleware = [].concat(options.effectMiddlewares || [])
    if(state.context) middleware.push(contextMiddleware(state.context))
    const next = runSaga(middleware)

    const itFactory = (it) => (title, fn) => {
      it(title, function () {
        while (!state.done && (!state.value || !state.value[IO])) {
          state = next(gen, state)
        }
        if(fn) state.value = fn(state, ...arguments)
      })
    }

    return Object.assign(itFactory(it), {
      only: itFactory(it.only),
      skip: itFactory(it.skip),
      setValue: (value) => { state.value = value },
      replaceSaga: (nextGen) => { gen = nextGen },
      clone: (value) => {
        const itFn = sagaTestFactory(gen)
        if (typeof value !== 'undefined') itFn.setValue(value)

        before(() => {
          itFn.replaceSaga(gen.clone())
        })

        return itFn
      }
    })
  }
  return sagaTestFactory(cloneableGenerator(saga)(...args))
}

export const contextMiddleware = (context = {}) => (next) => (effect) => {
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
