import { IO } from '@redux-saga/symbols'
import { SagaIteratorClone } from '@redux-saga/testing-utils'
import { isIter } from './generator'
import {
  SagaTestI,
  SagaTestItBlock,
  ItBlockFunction,
  SagaTestItFunction,
  SagaTestIt,
  It
} from '../types'

export const runTest = <Ctx>(
  it: SagaTestI<Ctx>,
  testFn: SagaTestItBlock<Ctx>
) =>
  async function runMyTest(...args) {
    const ret = testFn(it.value, it.state, ...args)
    if (!isIter(ret)) return ret
  }

export const enhanceIt = <Ctx extends {}>(
  it: SagaTestI<Ctx>,
  actuallyIt: ItBlockFunction
): SagaTestItFunction<Ctx> => (desc, fn?) => {
  actuallyIt(desc, async (...args) => {
    while (!it.state.done && (!it.value || !it.value[IO])) it.runSaga()
    if (fn) it.value = await runTest(it, fn)(...args)
  })
}

export interface Ctor<RT, Args extends any[]> {
  new(...args: Args): RT
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

export const itFactory = <Ctx extends {}, Args extends any[]>(
  Ctor: Ctor<SagaTestI<Ctx>, Args>,
  getIt: (...args: Args) => It
) => (...args: Args): SagaTestIt<Ctx> => {
  const actuallyIt = getIt(...args)
  const instance = new Ctor(...args)
  const it = Object.assign(instance.__call__, {
    value: instance.value,
    state: instance.state,
    __call__: instance.__call__.bind(instance),
    skip: enhanceIt(instance, actuallyIt.skip),
    only: enhanceIt(instance, actuallyIt.only),
    do: instance.do.bind(instance),
    forks: instance.forks.bind(instance),
    clone: instance.clone.bind(instance),
    setValue: instance.setValue.bind(instance),
    runSaga: instance.runSaga.bind(instance),
    replaceSaga: instance.replaceSaga.bind(instance)
  })
  Object.defineProperties(it, {
    value: accessor(instance, 'value'),
    state: accessor(instance, 'state')
  })
  return it
}
