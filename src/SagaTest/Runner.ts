import { SagaIterator, EffectMiddleware } from 'redux-saga'
import { Effect } from '@redux-saga/types'
import { SagaTestRunnerI, SagaTestState } from '../types'

export default class SagaTestRunner<Ctx extends {}, T extends SagaIterator>
  implements SagaTestRunnerI<Ctx, T> {
  done = false

  constructor(
    public gen: T,
    protected middleware: EffectMiddleware[],
    public context: Ctx,
    public value?
  ) { }

  get state(): SagaTestState<Ctx> {
    return { done: this.done, context: this.context }
  }

  run() {
    const state =
      this.value instanceof Error && this.gen.throw
        ? this.gen.throw(this.value)
        : this.gen.next(this.value)
    this.value = this.applyMiddleware(state.value)
    this.done = Boolean(state.done)
    return this
  }

  runWhile(cond) {
    while (cond(this.value, this.state)) this.run()
    return this
  }

  runUntil(cond) {
    while (!cond(this.value, this.state)) this.run()
    return this
  }

  replace(gen, value?) {
    this.gen = gen
    this.done = false
    if (typeof value !== 'undefined') this.value = value
    return this
  }

  protected applyMiddleware(effect: Effect): Effect {
    return this.middleware.reduce((effect, fn) => {
      fn(value => {
        effect = value
      })(effect)
      return effect
    }, effect)
  }
}
