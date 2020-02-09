import { EffectMiddleware } from 'redux-saga'
import { Effect } from '@redux-saga/types'
import { SagaIteratorClone } from '@redux-saga/testing-utils'
import contextMiddleware from './middleware/contextMiddleware'
import {
  TestEnv,
  SagaTestItFunction,
  SagaTestOptions,
  SagaTestState,
  SagaTestI
} from './types'
import { itFactory, enhanceIt } from './utils/tests'
import { matchCallEffect, effectToIterator } from './utils/fork'
import { forksArgs, cloneArgs, doArgs } from './utils/arguments'

export default class SagaTest<Ctx extends {}> implements SagaTestI<Ctx> {
  protected middleware: EffectMiddleware[]
  protected env: TestEnv
  protected saga: SagaIteratorClone & { name?: string }

  value
  done = false
  context: Ctx

  __call__: SagaTestItFunction<Ctx>

  static new = itFactory(SagaTest, options => options.env.it)

  constructor(
    options: SagaTestOptions<Ctx>,
    saga: SagaIteratorClone & { name?: string },
    value?
  ) {
    this.value = value
    this.context = options.context || ({} as Ctx)
    this.middleware = options.middleware || []
    this.saga = saga
    this.env = options.env

    if (this.context && !options.middleware)
      this.middleware.push(contextMiddleware(this.context))

    this.__call__ = enhanceIt(this, this.env.it)
  }

  get state(): SagaTestState<Ctx> {
    return { done: this.done, context: this.context }
  }

  protected applyMiddleware(effect: Effect): Effect {
    return this.middleware.reduce((effect, fn) => {
      fn(value => {
        effect = value
      })(effect)
      return effect
    }, effect)
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

  replaceSaga(saga: SagaIteratorClone & { name?: string }) {
    if (typeof saga.name === 'undefined') saga.name = this.saga.name
    this.saga = saga
    return this
  }

  do(...args) {
    const [desc, fn] = doArgs(...args)
    return this.clone(desc || this.saga.name || '', undefined, fn)
  }

  forks<T, RT>(...args) {
    const [desc, expectedEffect, fn] = forksArgs<Ctx, T, RT>(...args)
    const matchMyCallEffect = matchCallEffect(expectedEffect)
    const testBlock = <ST extends SagaTestI<Ctx>>(desc_, it: ST) => {
      it.__call__(desc_, effect => {
        const forkedAction = matchMyCallEffect(effect)
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
    const it = SagaTest.new(this, this.saga, value || this.value)

    if (!fn) this.env.before(() => it.replaceSaga(this.saga.clone()))
    else
      this.env.describe(desc, () => {
        this.env.before(() => it.replaceSaga(this.saga.clone()))
        fn(it)
      })

    return it
  }
}
