import eq from 'deep-equal'
import { EffectMiddleware } from 'redux-saga'
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
  return Object.assign({}, state, nextState, { value })
}

const getForkedAction = (action) => ({ value }) => {
  const testAction = typeof action == 'function' ? action : (a) => eq(a, action)
  switch (value.type) {
    case 'FORK':
      return testAction(value) ? value : undefined
    case 'ALL':
      return value.payload.find(testAction)
    default:
      return false
  }
}

interface SagaTestFactoryOptions {
  context?: object
  effectMiddlewares?: EffectMiddleware[]
}

interface SagaTestState {
  done: Boolean
  value: any
  context?: object
}

export default (options: SagaTestFactoryOptions = {}, { it, before, describe } = global) => (saga, ...args) => {
  function sagaTestFactory(gen) {
    let state: SagaTestState = {
      done: false,
      value: undefined,
      context: options.context ? { ...options.context } : undefined
    }
    const middleware = options.effectMiddlewares || []
    if (state.context) middleware.push(contextMiddleware(state.context))
    const next = runSaga(middleware)

    const itFactory = (it) => (title, fn?) => {
      it(title, function () {
        while (!state.done && (!state.value || !state.value[IO])) {
          state = next(gen, state)
        }
        if (fn) state.value = fn(state, ...arguments)
      })
    }

    const _it = Object.assign(itFactory(it), {
      only: itFactory(it.only),
      skip: itFactory(it.skip),
      setValue: (value) => { state.value = value },
      replaceSaga: (nextGen) => { gen = nextGen },
      forks: (action, block) => {
        const getMyForkedAction = getForkedAction(action)
        const testBlock = (it) => {
          it('forks my action', (data) => {
            const forkedAction = getMyForkedAction(data)
            if (!forkedAction) throw new Error('Action wasn\'t forked')
            const { fn, args } = forkedAction.payload
            it.replaceSaga(fn(...args))
          })
        }
        if (block) {
          describe(`fork ${JSON.stringify(action.payload.args)}`, () => {
            const __it = _it.clone(state.value)
            testBlock(__it)
            block(__it)
          })
        } else {
          testBlock(_it)
        }
      },
      clone: (value) => {
        const itFn = sagaTestFactory(gen)
        if (typeof value !== 'undefined') itFn.setValue(value)

        before(() => {
          itFn.replaceSaga(gen.clone())
        })

        return itFn
      }
    })

    return _it
  }
  return sagaTestFactory(cloneableGenerator(saga)(...args))
}

export const contextMiddleware = (context = {}): EffectMiddleware => (next) => (effect) => {
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
