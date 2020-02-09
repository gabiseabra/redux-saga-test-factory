import { cloneableGenerator } from '@redux-saga/testing-utils'
import SagaTest from './SagaTest'
import contextMiddleware from './middleware/contextMiddleware'
import { SagaTestOptions, SagaTestIt, GeneratorFn } from './types'

const defaultDefaults = (options: Partial<SagaTestOptions>): SagaTestOptions => {
  const middleware = options.middleware || []
  if (options.context) middleware.push(contextMiddleware(middleware))
  return {
    env: {
      it: global.it,
      describe: global.describe,
      before: global.before
    },
    ...options
  }
}

export default function sagaTestFactory<Ctx extends {}>(options: Partial<SagaTestOptions<Ctx>> = {}) {
  return function creaateSagaTest<T extends any[] = any[]>(saga: GeneratorFn<T>, ...args: T): SagaTestIt<Ctx> {
    return SagaTest.new(defaultDefaults(options), cloneableGenerator(saga)(...args))
  }
}

export { contextMiddleware }