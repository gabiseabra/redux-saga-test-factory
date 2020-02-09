import { cloneableGenerator } from '@redux-saga/testing-utils'
import SagaTest, { TestEnv, SagaTestOptions, SagaTestIt } from './SagaTest'
export { default as contextMiddleware } from './middleware/contextMiddleware'

type GeneratorFn<T extends any[], RT = any> = (...args: T) => Generator<RT>

export default <Ctx extends {}, It extends any[] = any[]>(options: Partial<SagaTestOptions<Ctx, It>> = {}) => <T extends any[] = any[]>(saga: GeneratorFn<T>, ...args: T): SagaTestIt<Ctx, It> => {
  return SagaTest.new({
    env: global as TestEnv<It>,
    ...options
  }, cloneableGenerator(saga)(...args))
}

