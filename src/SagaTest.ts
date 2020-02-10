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
import Runner from './SagaTest/Runner'

export default class SagaTest<Ctx extends {}> implements SagaTestI<Ctx> {
  protected env: TestEnv
  saga: Runner<Ctx, SagaIteratorClone & { name?: string }>

  __call__: SagaTestItFunction<Ctx>

  static new = itFactory(SagaTest, options => options.env.it)

  constructor(
    options: SagaTestOptions<Ctx>,
    saga: SagaIteratorClone & { name?: string },
    value?
  ) {
    // SagaTest context
    this.env = options.env
    this.__call__ = enhanceIt(this, this.env.it)
    // SagaRunner context
    const middleware = options.middleware || []
    if (options.context && !options.middleware)
      middleware.push(contextMiddleware(options.context))

    this.saga = new Runner(saga, middleware, options.context, value)
  }

  get value() {
    return this.saga.value
  }

  set value(value) {
    this.saga.value = value
  }

  get state(): SagaTestState<Ctx> {
    return { done: this.saga.done, context: this.saga.context }
  }

  do(...args) {
    const [desc, fn] = doArgs(...args)
    return this.clone(desc || this.saga.gen.name || '', undefined, fn)
  }

  forks<T, RT>(...args) {
    const [desc, expectedEffect, fn] = forksArgs<Ctx, T, RT>(...args)
    const matchMyCallEffect = matchCallEffect(expectedEffect)
    const testBlock = <ST extends SagaTestI<Ctx>>(desc_, it: ST) => {
      it.__call__(desc_, effect => {
        const forkedAction = matchMyCallEffect(effect)
        if (!forkedAction) throw new Error("Action wasn't forked")
        it.saga.replace(effectToIterator(forkedAction))
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

    if (!fn) this.env.before(() => it.saga.replace(this.saga.gen.clone()))
    else
      this.env.describe(desc, () => {
        this.env.before(() => it.saga.replace(this.saga.gen.clone()))
        fn(it)
      })

    return it
  }
}
