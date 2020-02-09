import { cloneableGenerator } from '@redux-saga/testing-utils'
import SagaTest from './SagaTest'
import contextMiddleware from './middleware/contextMiddleware'
import { SagaTestOptions, SagaTestIt, SagaGeneratorFunction } from './types'

const def = (options: Partial<SagaTestOptions>): SagaTestOptions => {
  const middleware = options.middleware || []
  if (options.context) middleware.push(contextMiddleware(options.context))
  return {
    middleware,
    context: {},
    env: {
      it: global.it,
      describe: global.describe,
      before: global.before
    },
    ...options
  }
}

export default function sagaTestFactory<Ctx extends {}>(
  options: Partial<SagaTestOptions<Ctx>> = {}
) {
  return function createSagaTest<RT = any, Args extends any[] = any[]>(
    saga: SagaGeneratorFunction<RT, Args>,
    ...args: Args
  ): SagaTestIt<Ctx> {
    return SagaTest.new(def(options), cloneableGenerator(saga)(...args))
  }
}

export { contextMiddleware }
