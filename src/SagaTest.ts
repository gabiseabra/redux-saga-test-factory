
import { IO } from '@redux-saga/symbols'
import { EffectMiddleware } from "redux-saga"
import { SagaIteratorClone } from '@redux-saga/testing-utils'
import contextMiddleware from './middleware/contextMiddleware'
import { TestEnv, BlockFunction, SagaTestBlockFunction, SagaTestOptions, SagaTestState, SagaTestIt } from './types'

export default class SagaTest<Ctx extends {}> {
  protected middleware: EffectMiddleware[]
  protected env: TestEnv
  protected saga: SagaIteratorClone

  done: Boolean = false
  value: any
  context: Ctx

  it: SagaTestBlockFunction<Ctx>
  only: SagaTestBlockFunction<Ctx>
  skip: SagaTestBlockFunction<Ctx>

  static new<Ctx extends {}>(
    options: SagaTestOptions<Ctx>,
    saga: SagaIteratorClone,
    value?
  ): SagaTestIt<Ctx> {
    const instance = new SagaTest(options, saga, value)
    return Object.assign(instance.it, {
      skip: instance.skip.bind(instance),
      only: instance.only.bind(instance),
      clone: instance.clone.bind(instance),
      setValue: instance.setValue.bind(instance),
      runSaga: instance.runSaga.bind(instance),
      replaceSaga: instance.replaceSaga.bind(instance)
    })
  }

  constructor(options: SagaTestOptions<Ctx>, saga: SagaIteratorClone, value?) {
    this.value = value
    this.context = options.context || {} as Ctx
    this.middleware = options.middleware || []
    this.saga = saga
    this.env = options.env

    if (this.context && !options.middleware)
      this.middleware.push(contextMiddleware(this.context))

    this.it = this.enhanceIt(this.env.it)
    this.only = this.enhanceIt(this.env.it.only)
    this.skip = this.enhanceIt(this.env.it.skip)
  }

  get state(): SagaTestState<Ctx> {
    return { done: this.done, value: this.value, context: this.context }
  }

  protected applyMiddleware(effect) {
    return this.middleware.reduce((effect, fn) => {
      fn((value) => {
        effect = value
      })(effect)
      return effect
    }, effect)
  }

  protected runSaga() {
    const state =
      this.value instanceof Error && this.saga.throw ?
        this.saga.throw(this.value) :
        this.saga.next(this.value)
    this.value = this.applyMiddleware(state.value)
    this.done = Boolean(state.done)
    return this
  }

  protected enhanceIt(it: BlockFunction): SagaTestBlockFunction<Ctx> {
    return (desc, fn?) => {
      const runSaga = this.runSaga.bind(this)
      const getState = () => this.state
      it(desc, (...args) => {
        while (!this.done && (!this.value || !this.value[IO]))
          runSaga()
        if (fn) this.value = fn(getState(), ...args)
      })
    }
  }

  setValue(value?) {
    this.value = value
    return this
  }

  replaceSaga(saga: SagaIteratorClone) {
    this.saga = saga
    return this
  }

  /*
  forks<RT = any>(effect: Action, block?) {
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
      this.env.describe(`fork ${JSON.stringify(action.payload.args)}`, () => {
        const __it = _it.clone(state.value)
        testBlock(__it)
        block(__it)
      })
    } else {
      testBlock(_it)
    }
  }
  */

  clone(value?): SagaTestIt<Ctx> {
    const sagaTest = SagaTest.new({
      context: this.context,
      middleware: this.middleware,
      env: this.env
    }, this.saga, value || this.value)

    this.env.before(() => sagaTest.replaceSaga(this.saga.clone()))

    return sagaTest
  }
}
