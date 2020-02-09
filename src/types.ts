import { Effect } from "@redux-saga/types"
import { CallEffectDescriptor } from "redux-saga/effects"
import { EffectMiddleware } from "redux-saga"
import { SagaIteratorClone } from "@redux-saga/testing-utils"

export type GeneratorFn<T extends any[], RT = any> = (...args: T) => Generator<RT>

// 

export type EffectMatcher = (action: Effect) => Boolean
export type EffectExpectation<RT = any> = CallEffectDescriptor<RT> | EffectMatcher

// 

export type Callback<T extends any[] = any[]> = (...any: T) => any
export type HookFunction<T extends any[] = any[]> = (fn: Callback<T>) => any
export interface BlockFunction<T extends any[] = any[]> {
  (desc: string, fn?: Callback<T>): any
}
export interface It<T extends any[] = any> extends BlockFunction<T> {
  skip: BlockFunction<T>
  only: BlockFunction<T>
}
export interface TestEnv {
  it: It
  describe: BlockFunction
  before: HookFunction
}

//

export type SagaTestBlock<Ctx> = (state: SagaTestState<Ctx>, ...any: any[]) => any
export type SagaTestBlockParams<Ctx> = [SagaTestState<Ctx>, ...any[]]
export type SagaTestBlockFunction<Ctx> = BlockFunction<SagaTestBlockParams<Ctx>>

export interface SagaTestIt<Ctx> extends It<SagaTestBlockParams<Ctx>> {
  setValue(value?): SagaTestIt<Ctx>
  replaceSaga(saga: SagaIteratorClone): SagaTestIt<Ctx>
  runSaga(): SagaTestIt<Ctx>
  clone(value?): SagaTestIt<Ctx>
}

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