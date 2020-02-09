import { Effect, SimpleEffect } from "@redux-saga/types"
import { CallEffectDescriptor } from "redux-saga/effects"
import { EffectMiddleware } from "redux-saga"
import { SagaIteratorClone } from "@redux-saga/testing-utils"

/**
 * Effects
 */

export type EffectMatcher<T = any, RT = any> = (effect: Effect) => effect is SimpleEffect<T, CallEffectDescriptor<RT>>
export type EffectExpectation<T = any, RT = any> = SimpleEffect<T, CallEffectDescriptor<RT>> | EffectMatcher<T, RT>

/**
 * Test environment
 */

export type Callback<T extends any[] = any[]> = (...any: T) => any
export type HookFunction<T extends any[] = any[]> = (fn: Callback<T>) => any
export interface BlockFunction<T extends any[] = any[]> {
  (desc: string, fn?: Callback<T>): any
}
export interface It<T extends any[] = any[]> extends BlockFunction<T> {
  skip: BlockFunction<T>
  only: BlockFunction<T>
}

export interface TestEnv {
  it: It
  describe: BlockFunction
  before: HookFunction
}

/**
 * SagaTest
 */

export type SagaGeneratorFunction<T extends any[], RT = any> = (...args: T) => Generator<RT>

export type SagaTestBlock<Ctx> = (state: SagaTestState<Ctx>, ...any: any[]) => any
export type SagaTestBlockParams<Ctx> = [SagaTestState<Ctx>, ...any[]]
export type SagaTestBlockFunction<Ctx> = BlockFunction<SagaTestBlockParams<Ctx>>

export interface SagaTestI<Ctx> {
  __call__: SagaTestBlockFunction<Ctx>
  setValue(value?): this
  replaceSaga(saga: SagaIteratorClone): this
  runSaga(): this
  clone(value?): SagaTestIt<Ctx>
  forks<RT>(desc: string, expectedEffect: EffectExpectation<RT>, fn?: SagaTestForkBlock<Ctx>): this
  forks<RT>(expectedEffect: EffectExpectation<RT>, fn?: SagaTestForkBlock<Ctx>): this
}

export type SagaTestIt<Ctx> = SagaTestI<Ctx> & It<SagaTestBlockParams<Ctx>>

export type SagaTestForkBlock<Ctx> = Callback<[SagaTestIt<Ctx>]>

export interface SagaTestOptions<Ctx extends {} = any> {
  middleware: EffectMiddleware[],
  context: Ctx,
  env: TestEnv
}

export interface SagaTestState<Ctx extends {} = any> {
  done: Boolean,
  value: Effect,
  context: Ctx
}
