
import { IO } from '@redux-saga/symbols'
import { EffectMiddleware } from "redux-saga"
import { SagaIteratorClone } from '@redux-saga/testing-utils'
import { It, BlockFunction, CallbackFunction } from './BlockClass'
import contextMiddleware from './middleware/contextMiddleware'

export type SagaTestBlock<Ctx, It extends any[] = any[]> = (state: SagaTestState<Ctx>, ...any: It[]) => any
export type SagaTestBlockParams<Ctx, It extends any[] = any[]> = [SagaTestState<Ctx>, ...It[]]
export type SagaTestBlockFunction<Ctx, It extends any[] = any[]> = BlockFunction<SagaTestBlockParams<Ctx, It>>
export interface SagaTestIt<Ctx, ItParams extends any[] = any[]> extends It<SagaTestBlockParams<Ctx, ItParams>> {
  setValue(value?): SagaTestIt<Ctx, ItParams>
  replaceSaga(saga: SagaIteratorClone): SagaTestIt<Ctx, ItParams>
  runSaga(): SagaTestIt<Ctx, ItParams>
  clone(value?): SagaTestIt<Ctx, ItParams>
}

export interface TestEnv<ItParams extends any[] = any[]> {
  it: It<ItParams>
  describe: BlockFunction
  before: CallbackFunction
}

export interface SagaTestOptions<Ctx extends {}, ItParams extends any[] = any[]> {
  context?: Ctx
  middleware?: EffectMiddleware[],
  env: TestEnv<ItParams>
}

export interface SagaTestState<Ctx extends {}> {
  done: Boolean,
  value: any,
  context: Ctx
}

export default class SagaTest<Ctx extends {}, ItParams extends any[] = any[]> {
  protected middleware: EffectMiddleware[]
  protected env: TestEnv<ItParams>
  protected saga: SagaIteratorClone

  done: Boolean = false
  value: any
  context: Ctx

  it: SagaTestBlockFunction<Ctx, ItParams>
  only: SagaTestBlockFunction<Ctx, ItParams>
  skip: SagaTestBlockFunction<Ctx, ItParams>

  static new<Ctx extends {}, ItParams extends any[] = any[]>(
    options: SagaTestOptions<Ctx, ItParams>,
    saga: SagaIteratorClone,
    value?
  ): SagaTestIt<Ctx, ItParams> {
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

  constructor(options: SagaTestOptions<Ctx, ItParams>, saga: SagaIteratorClone, value?) {
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

  protected enhanceIt(it: BlockFunction<ItParams>): SagaTestBlockFunction<Ctx, ItParams> {
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

  clone(value?): SagaTestIt<Ctx, ItParams> {
    const sagaTest = SagaTest.new({
      context: this.context,
      middleware: this.middleware,
      env: this.env
    }, this.saga, value || this.value)

    this.env.before(() => sagaTest.replaceSaga(this.saga.clone()))

    return sagaTest
  }
}
