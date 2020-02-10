import AssertionError from 'assertion-error'
import { SagaIteratorClone } from '@redux-saga/testing-utils'
import {
  TestEnv,
  SagaTestItFunction,
  SagaTestOptions,
  SagaTestState,
  SagaTestI,
  SagaTestIt
} from '../types'
import { itFactory, enhanceIt } from './utils/tests'
import { matchCallEffect, effectToIterator } from './utils/fork'
import { forksArgs, cloneArgs, doArgs } from './utils/arguments'
import Runner from './Runner'

export default class SagaTest<Ctx extends {}> implements SagaTestI<Ctx> {
  protected env: TestEnv
  saga: Runner<Ctx, SagaIteratorClone & { name?: string }>

  __call__: SagaTestItFunction<Ctx>

  static new: <Ctx>(
    options: SagaTestOptions<Ctx>,
    saga: SagaIteratorClone & { name?: string },
    value?: any
  ) => SagaTestIt<Ctx> = itFactory(SagaTest, options => options.env.it)

  constructor(
    protected options: SagaTestOptions<Ctx>,
    saga: SagaIteratorClone & { name?: string },
    value?: any
  ) {
    this.env = options.env
    this.__call__ = enhanceIt(this, this.env.it)
    this.saga =
      saga instanceof Runner
        ? saga
        : new Runner(saga, options.middleware, options.context, value)
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
        if (!forkedAction)
          throw new AssertionError("Action wasn't forked", {
            expectedEffect,
            effect
          })
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
    const it = SagaTest.new(this.options, this.saga.gen, value || this.value)
    const beforeHook = () => it.saga.replace(this.saga.gen.clone(), this.value)
    if (!fn) this.env.before(beforeHook)
    else
      this.env.describe(desc, () => {
        this.env.before(beforeHook)
        fn(it)
      })

    return it
  }
}
