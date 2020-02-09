import { IO } from '@redux-saga/symbols'
import { EffectMiddleware } from 'redux-saga'
import { Effect } from '@redux-saga/types'
import { SagaIteratorClone } from '@redux-saga/testing-utils'
import contextMiddleware from './middleware/contextMiddleware'
import {
  TestEnv,
  ItBlockFunction,
  SagaTestItFunction,
  SagaTestOptions,
  SagaTestState,
  SagaTestIt,
  SagaTestI,
  EffectExpectation,
  Callback
} from './types'
import { describeEffect, getForkedEffect, effectToIterator } from './utils/fork'

const forksArgs = <Ctx, T, RT, Fn = Callback<[SagaTestIt<Ctx>]>>(
  ...args
): [string, EffectExpectation<T, RT>, Fn] => {
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

const cloneArgs = <Ctx, Fn = Callback<[SagaTestIt<Ctx>]>>(
  ...args
): [string, any?, Fn?] => {
  if (typeof args[0] === 'string' && typeof args[1] === 'function')
    return [args[0], undefined, args[2]]
  if (typeof args[0] === 'string' && typeof args[2] === 'function')
    return [args[0], args[1], args[2]]
  return ['', args[0]]
}

export default class SagaTest<Ctx extends {}> implements SagaTestI<Ctx> {
  protected middleware: EffectMiddleware[]
  protected env: TestEnv
  protected saga: SagaIteratorClone

  value
  done = false
  context: Ctx

  __call__: SagaTestItFunction<Ctx>
  only: SagaTestItFunction<Ctx>
  skip: SagaTestItFunction<Ctx>

  static new<Ctx extends {}>(
    options: SagaTestOptions<Ctx>,
    saga: SagaIteratorClone,
    value?
  ): SagaTestIt<Ctx> {
    const instance = new SagaTest(options, saga, value)
    return Object.assign(instance.__call__, {
      __call__: instance.__call__.bind(instance),
      skip: instance.skip.bind(instance),
      only: instance.only.bind(instance),
      forks: instance.forks.bind(instance),
      clone: instance.clone.bind(instance),
      setValue: instance.setValue.bind(instance),
      runSaga: instance.runSaga.bind(instance),
      replaceSaga: instance.replaceSaga.bind(instance)
    })
  }

  constructor(options: SagaTestOptions<Ctx>, saga: SagaIteratorClone, value?) {
    this.value = value
    this.context = options.context || ({} as Ctx)
    this.middleware = options.middleware || []
    this.saga = saga
    this.env = options.env

    if (this.context && !options.middleware)
      this.middleware.push(contextMiddleware(this.context))

    this.__call__ = this.enhanceIt(this.env.it)
    this.only = this.enhanceIt(this.env.it.only)
    this.skip = this.enhanceIt(this.env.it.skip)
  }

  get state(): SagaTestState<Ctx> {
    return { done: this.done, value: this.value, context: this.context }
  }

  protected applyMiddleware(effect: Effect): Effect {
    return this.middleware.reduce((effect, fn) => {
      fn(value => {
        effect = value
      })(effect)
      return effect
    }, effect)
  }

  protected enhanceIt(it: ItBlockFunction): SagaTestItFunction<Ctx> {
    return (desc, fn?) => {
      const runSaga = this.runSaga.bind(this)
      const getState = () => this.state
      it(desc, (...args) => {
        while (!this.done && (!this.value || !this.value[IO])) runSaga()
        if (fn) this.value = fn(getState(), ...args)
      })
    }
  }

  runSaga() {
    const state =
      this.value instanceof Error && this.saga.throw
        ? this.saga.throw(this.value)
        : this.saga.next(this.value)
    this.value = this.applyMiddleware(state.value)
    this.done = Boolean(state.done)
    return this
  }

  setValue(value?) {
    this.value = value
    return this
  }

  replaceSaga(saga: SagaIteratorClone) {
    this.saga = saga
    return this
  }

  forks<T, RT>(...args) {
    const [desc, expectedEffect, fn] = forksArgs<Ctx, T, RT>(...args)
    const getMyForkedAction = getForkedEffect(expectedEffect)
    const testBlock = <ST extends SagaTestI<Ctx>>(desc_, it: ST) => {
      it.__call__(desc_, ({ value }) => {
        const forkedAction = getMyForkedAction(value)
        if (!forkedAction) throw new Error("Action wasn't forked")
        it.replaceSaga(effectToIterator(forkedAction))
      })
    }
    if (fn) {
      this.env.describe(desc, () => {
        const it = this.clone()
        testBlock('forks the expected effect', it)
        fn(it)
      })
    } else {
      testBlock(desc, this)
    }
    return this
  }

  clone(...args) {
    const [desc, value, fn] = cloneArgs<Ctx>(...args)
    const it = SagaTest.new(
      {
        context: this.context,
        middleware: this.middleware,
        env: this.env
      },
      this.saga,
      value || this.value
    )

    if (!fn) this.env.before(() => it.replaceSaga(this.saga.clone()))
    else {
      this.env.describe(desc, () => {
        this.env.before(() => it.replaceSaga(this.saga.clone()))

        fn(it)
      })
    }

    return it
  }
}
