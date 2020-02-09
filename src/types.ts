import { Effect, SimpleEffect, SagaIterator } from '@redux-saga/types'
import { CallEffectDescriptor } from 'redux-saga/effects'
import { EffectMiddleware } from 'redux-saga'
import { SagaIteratorClone } from '@redux-saga/testing-utils'

/*
 * ## Effects
 * -------------------------------------------------------------------------- */

/** */
export type EffectMatcher<T = any, RT = any> = (
  effect: Effect
) => effect is SimpleEffect<T, CallEffectDescriptor<RT>>

/**
 * An effect expectation may be a simple effect of some type which matches
 * the current effect exactly, or an EffectMatcher function that determines
 * whether a given saga effect is of the desired type.
 */
export type EffectExpectation<T = any, RT = any> =
  | SimpleEffect<T, CallEffectDescriptor<RT>>
  | EffectMatcher<T, RT>

/*
 * ## Test environment
 * -------------------------------------------------------------------------- */

/** */
export type Callback<Args extends any[] = any[]> = (...any: Args) => any

/**
 * A function that gets called during the test case's life cycle.
 */
export type HookFunction<Args extends any[] = any[]> = (
  fn: Callback<Args>
) => any

/**
 * A function that runs an `it` with a given description and passes
 * some arbitrary parameters to its block.
 */
export interface ItBlockFunction<Args extends any[] = any[]> {
  (desc: string, fn?: Callback<Args>): any
}

export interface It<Args extends any[] = any[]> extends ItBlockFunction<Args> {
  skip: ItBlockFunction<Args>
  only: ItBlockFunction<Args>
}

/**
 * Some global functions from the test runner's environment.
 */
export interface TestEnv {
  it: It
  describe: ItBlockFunction
  /** Function that runs a callback before all tests */
  before: HookFunction
}

/*
 * ## SagaTest
 * -------------------------------------------------------------------------- */

/** */
export type SagaGeneratorFunction<RT = any, Args extends any[] = any[]> = (
  ...args: Args
) => SagaIterator<RT>

/**
 * A callback for a contextual block function. It takes a SagaTestState plus
 * whatever other arguments `it()` provides.
 */
export type SagaTestItBlock<Ctx> = (
  state: SagaTestState<Ctx>,
  ...any: any[]
) => any

export type SagaTestItBlockParams<Ctx> = Parameters<SagaTestItBlock<Ctx>>

/**
 * Block function that provides state from an instance of SagaTestI.
 */
export type SagaTestItFunction<Ctx> = ItBlockFunction<
  SagaTestItBlockParams<Ctx>
>

/**
 * Block function that provides a new instance of SagaTestIt with it's iterator
 * replaced by a forked saga.
 */
export type SagaTestForkBlock<Ctx> = Callback<[SagaTestIt<Ctx>]>

export type SagaTestIt<Ctx> = SagaTestI<Ctx> & It<SagaTestItBlockParams<Ctx>>

export interface SagaTestOptions<Ctx extends {} = any> {
  middleware: EffectMiddleware[]
  context: Ctx
  env: TestEnv
}

export interface SagaTestState<Ctx extends {} = any> {
  done: boolean
  value: Effect
  context: Ctx
}

/**
 * Saga test runner which holds state from a saga's generator.
 */
export interface SagaTestI<Ctx> {
  __call__: SagaTestItFunction<Ctx>
  /**
   * ## Mutating methods
   * These methods mutate the state of the current saga test. They should run
   * inside of an `ItBlockFunction` or `HookFunction` to ensure it respects the
   * test's life cycle.
   * Using it from a "describe" block causes the state to mutate before the
   * tests start running.
   * ------------------------------------------------------------------------ */
  /**
   * Replaces the value that will be yielded back to the next iteration.
   * @param value
   */
  setValue(value?): this
  /**
   * Runs the generator through one iteration and updates it's state.
   */
  runSaga(): this
  /**
   * Replaces the generator on the test saga. Tests will resume with values
   * yielded from that generator.
   * @param saga Cloneable SagaIterator that replaces the current one
   */
  replaceSaga(saga: SagaIteratorClone & { name?: string }): this
  /**
   * ## Branching methods
   * These methods act as `it` and `describe` for running a block of code with
   * a new instance of `SagaTestIt` with state cloned from the originating
   * `SagaTestIt`.
   * ------------------------------------------------------------------------ */
  /**
   * Runs the code in a describe block with a new instance of `SagaTestIt`. This
   * is a slightly modified alias for `clone` that serves as sugar for
   * instantiating a saga test in a describe block.
   * ```js
   * describe('mySaga', () => {
   *   const it = sagaTest(mySaga, ...args)
   *   // ...
   * })
   * ```
   * becomes
   * ```js
   * sagaTest('mySaga', ...args).do((it) => {
   *   // ...
   * })
   * ```
   * @param desc Block's description
   * @param fn   Block that runs with `SagaTestIt`
   */
  do(desc: string, fn: SagaTestForkBlock<Ctx>): SagaTestIt<Ctx>
  /**
   * A description is generated from the saga's function name if none i
   * provided.
   * @param fn Block that runs with `SagaTestIt`
   */
  do(fn: SagaTestForkBlock<Ctx>): SagaTestIt<Ctx>
  /**
   * `sagaTest.clone` branches the `sagaTest` into another instance of itself
   * with the same sate, which runs without affecting the state of the original
   * one. It may take a value to override the value resolved from the previous
   * test before resuming.
   * @param value Value to yield back to the next iteration
   */
  clone(value?): SagaTestIt<Ctx>
  /**
   * `clone` can be used as a block function by passing a description and
   * callback. The first parameter of the callback is the cloned saga test.
   * @param desc Block's description
   * @param fn   Block that runs with a branched `SagaTestIt`
   */
  clone(desc: string, fn: SagaTestForkBlock<Ctx>): SagaTestIt<Ctx>
  /**
   * Pass a value to `clone` and `setValue` to the next SagaTestIt in one go.
   * @param desc  Block's description
   * @param value Next value
   * @param fn    Block that runs with a branched `SagaTestIt`
   */
  clone(desc: string, value: any, fn: SagaTestForkBlock<Ctx>): SagaTestIt<Ctx>
  /**
   * Tests that an effect is called by checking the current state against a
   * matcher, and then replaces the `SagaTestI` instance's iterator with a new
   * iterator of the forked function.
   * When a callback is provided, the `SagaTestI` first is cloned and then it
   * branches into a describe block, so the state of the original `SagaTestI`
   * is preserved.
   * It actually mutates the current saga test if there is no block to run.
   * @param desc           Block's description
   * @param expectedEffect Matcher for the effect that should be forked
   * @param fn             Block that runs with a branched `SagaTestIt`
   */
  forks<T, RT>(
    desc: string,
    expectedEffect: EffectExpectation<T, RT>,
    fn?: SagaTestForkBlock<Ctx>
  ): this
  /**
   * A description is generated from `expectedEffect` if none is provided.
   * @param expectedEffect Matcher for the effect that should be forked
   * @param fn             Block that runs with a branched `SagaTestIt`
   */
  forks<T, RT>(
    expectedEffect: EffectExpectation<T, RT>,
    fn?: SagaTestForkBlock<Ctx>
  ): this
}
