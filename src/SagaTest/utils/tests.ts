/**
 * Helpers that operate on the `it` object.
 * @module SagaTest/utils/tests
 */
import AssertionError from 'assertion-error'
import { IO } from '@redux-saga/symbols'
import { Effect } from '@redux-saga/types'
import { isIter } from './generator'
import {
  SagaTestI,
  SagaTestItBlock,
  ItBlockFunction,
  SagaTestItFunction,
  SagaTestIt,
  Ctor,
  It
} from '../../types'
import SagaTestRunner from '../Runner'

const isDoneOrIO = (effect: Effect, { done }): boolean =>
  done || (effect && effect[IO])

const runTestIterator = <Ctx>({ saga }: SagaTestI<Ctx>, gen: Iterator<any>) => {
  const runner = new SagaTestRunner(gen, [], saga.context, saga.value)
  const iter = SagaTestRunner.CoIterator(
    [runner, saga],
    saga.context,
    saga.value
  )

  iter.nextUntil((_, state) => state.done)

  if (!runner.done) {
    runner.next(
      new AssertionError(
        'Did not finish running test generator, saga finished first.',
        {
          sagaResult: saga.result,
          testResult: runner.result
        }
      )
    )
  }

  return iter.value
}

/**
 * Creates an async it block that runs a function with context from a
 * `SagaTestI` and handles `SagaTestIterable` ret values (generator, async).
 * @param it
 * @param testFn
 */
export const runTest = <Ctx>(
  it: SagaTestI<Ctx>,
  testFn: SagaTestItBlock<Ctx>
) => {
  async function runMyTest(...args) {
    it.saga.nextUntil(isDoneOrIO)
    const ret = testFn(it.value, it.state, ...args)
    if (isIter(ret)) return runTestIterator(it, ret)
    return ret
  }

  return async (...args) => {
    it.value = await runMyTest(...args)
  }
}

/**
 * Transforms an `ItBlockFunction` into a `SagaTestItFunction`.
 * @param it         An instance of SagaTest
 * @param actuallyIt Test runner's `it` function
 */
export const enhanceIt = <Ctx extends {}>(
  it: SagaTestI<Ctx>,
  actuallyIt: ItBlockFunction
): SagaTestItFunction<Ctx> => (desc, fn = () => undefined) => {
  actuallyIt(desc, runTest(it, fn))
}

const accessor = (obj: object, prop: string): PropertyDescriptor => ({
  enumerable: true,
  get() {
    return obj[prop]
  },
  set(value) {
    obj[prop] = value
  }
})

/**
 * Creates an factory that instantiates a `SagaTestI` class and builds
 * `SagaTestIt`.
 * @param Ctor  Implementation of `SagaTestI`
 * @param getIt Gets test environment's `It` object from arguments
 */
export const itFactory = <Ctx extends {}, Args extends any[]>(
  Ctor: Ctor<SagaTestI<Ctx>, Args>,
  getIt: (...args: Args) => It
) => (...args: Args): SagaTestIt<Ctx> => {
  const actuallyIt = getIt(...args)
  const instance = new Ctor(...args)
  const it = Object.assign(instance.__call__, {
    value: instance.value,
    state: instance.state,
    saga: instance.saga,
    do: instance.do.bind(instance),
    forks: instance.forks.bind(instance),
    clone: instance.clone.bind(instance),
    __call__: instance.__call__.bind(instance),
    skip: enhanceIt(instance, actuallyIt.skip),
    only: enhanceIt(instance, actuallyIt.only)
  })
  Object.defineProperties(it, {
    value: accessor(instance, 'value'),
    state: accessor(instance, 'state')
  })
  return it
}
