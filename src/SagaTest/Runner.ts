import { SagaIterator, EffectMiddleware } from 'redux-saga'
import { Effect } from '@redux-saga/types'
import { SagaTestRunnerI, SagaTestState } from '../types'

export default class SagaTestRunner<
  Ctx extends {},
  Iter extends Iterator<Effect> = SagaIterator
  > implements SagaTestRunnerI<Ctx, Iter> {
  done = false
  iterations = 0

  constructor(
    public gen: Iter,
    protected middleware: EffectMiddleware[],
    public context: Ctx,
    public value?
  ) { }

  /**
   * Creates a `SagaTestRunner` that yields values through a list of generators,
   * cascading each return value to the next generator, and returns as soon as
   * one is done.
   * @param runners
   * @param context
   * @param initialValue
   */
  static CoIterator<Ctx extends {}>(
    runners: SagaTestRunnerI<Ctx, any>[],
    context: Ctx,
    initialValue?
  ): SagaTestRunner<Ctx> {
    function* gen() {
      let value = initialValue || runners[0].value
      while (1) {
        for (const r of runners) {
          r.next(value)
          if (r.done) return r.value
          value = yield r.value
        }
      }
    }
    return new SagaTestRunner(gen(), [], context)
  }

  [Symbol.iterator]() {
    return this
  }

  get state(): SagaTestState<Ctx> {
    return { done: this.done, context: this.context }
  }

  get result(): IteratorResult<any> {
    return { done: this.done, value: this.value }
  }

  next(value?) {
    if (typeof value !== 'undefined') this.value = value
    const state =
      this.value instanceof Error && this.gen.throw
        ? this.gen.throw(this.value)
        : this.gen.next(this.value)
    this.value = this.applyMiddleware(state.value)
    this.done = Boolean(state.done)
    this.iterations++
    return this.result
  }

  throw = this.next

  nextWhile(cond) {
    while (cond(this.value, this.state)) this.next()
    return this
  }

  nextUntil(cond) {
    while (!cond(this.value, this.state)) this.next()
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
