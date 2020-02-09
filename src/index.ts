import { cloneableGenerator } from '@redux-saga/testing-utils'
import SagaTest from './SagaTest'
import contextMiddleware from './middleware/contextMiddleware'
import { SagaTestOptions, SagaTestIt, SagaGeneratorFunction } from './types'

const def = (options: Partial<SagaTestOptions>): SagaTestOptions => {
  const g = global as any
  const middleware = options.middleware || []
  if (options.context) middleware.push(contextMiddleware(options.context))
  return {
    middleware,
    context: {},
    env: {
      it: g.it || g.test,
      describe: g.describe,
      before: g.before || g.beforeAll
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
    const iter = cloneableGenerator(saga)(...args)
    return SagaTest.new(def(options), Object.assign(iter, { name: saga.name }))
  }
}

export { contextMiddleware }
