# redux-saga-test-factory

A redux saga test helper with support for cloning, forking and mocks using effect middlewares. Inspired by [redux-saga-testing](https://github.com/antoinejaussoin/redux-saga-testing) and [@redux-saga/testing-utils](https://github.com/redux-saga/redux-saga/tree/master/packages/testing-utils)' `cloneableGenerator`.

## Usage

Initialize the default export from this package to configure a `sagaTestFactory`.

The `sagaTest` is an `it` object which runs one test per iteration on a given saga generator.

```js
import {call, put} from 'redux-saga/effects'
import sagaTestFactory from 'redux-saga-test-factory'

const successAction = (response) => ({type: 'SUCCESS', response})

function* mySaga(url) {
  const response = yield call(fetch, url)
}

sagaTest = sagaTestFactory()

describe('mySaga', () => {
  const it = sagaTest(mySaga, 'https://example.com')

  it('calls an effect', ({value: effect, done}) => {
    effect.type.should.equal('CALL')
    effect.payload.fn.should.equal(fetch)
    effect.payload.args[0].should.equal('https://example.com')

    return 'response'
  })

  it('puts successAction', ({value: {payload}}) => {
    payload.action.should.deep.equal(successAction('response'))
  })
})
```
[See full example](test/examples/01.usage.spec.ts)

## Cloning

`sagaTest.clone` branches the `sagaTest` into another instance of itself with the same sate, which runs without affecting the state of the original one.

It may take a value to override the value resolved from the previous test before resuming.

```ts
clone(value?): SagaTestIt<Ctx>
```

`clone` can be used as a block function by passing a description and callback. The first parameter of the callback is the cloned saga test.

```js
clone(desc: string, fn: SagaTestForkBlock<Ctx>): SagaTestIt<Ctx>
clone(desc: string, value: any, fn: SagaTestForkBlock<Ctx>): SagaTestIt<Ctx>
```

Example usage:

```js
// ...

function* mySaga(url) {
  try {
    const response = yield call(fetch, url)
    yield put(successAction(response))
  } catch(error) {
    yield put(errorAction(error))
  }
}

const sagaTest = sagaTestFactory()
  
describe('mySaga', () => {
  const mySagaTest = sagaTest(mySaga, 'https://example.com')
  const it = mySagaTest

  it('calls fetch')

  describe('successful response', () => {
    const it = mySagaTest.clone('some result')

    it('puts successAction', ({value: {payload}}) => {
      payload.action.should.deep.equal(successAction('some result'))
    })
  })

  describe('error response', () => {
    const error = new Error()
    const it = mySagaTest.clone(error)

    it('puts errorAction', ({value: {payload}}) => {
      payload.action.should.deep.equal(errorAction(error))
    })
  })
})
```
[See full example](test/examples/02.cloning.spec.ts)

## Forking

Callable effects can be tested and branched with `sagaTest.forks`.

It tests that an effect is called by checking the current effect against a matcher, and then replaces the `sagaTest` instance's iterator with a new iterator of the forked function, so the test resumes with values yielded from it.

A test matcher may be an effect object or a function of signature type `(e: Effect) => boolean`.

When a callback is provided the `sagaTest` first is cloned and branches into a describe block, so the state of the original saga test is preserved.

```ts
  forks<T, RT>(
    desc: string,
    expectedEffect: EffectExpectation<T, RT>,
    fn?: SagaTestForkBlock<Ctx>
  ): this
  forks<T, RT>(
    expectedEffect: EffectExpectation<T, RT>,
    fn?: SagaTestForkBlock<Ctx>
  ): this
```

Example usage:

```js
// ...

const ACTION_A = 'ACTION_A'
const RESPONSE = 'ACTION_RESPONSE'

const response = value => ({ type: RESPONSE, value })

function* aSaga(_: Action) {
  yield put(response('A'))
}

function* mainSaga() {
  yield all([
    takeEvery(ACTION_A, aSaga),
    // other forks ...
  ])
}

describe('context', () => {
  const sagaTest = sagaTestFactory()

  describe('mainSaga', () => {
    const it = sagaTest(mainSaga)

    it.forks(takeEvery(ACTION_A, aSaga), it => {
      it('takes an ACTION_A', () => ({ type: ACTION_A }))

      it.forks(fork(aSaga, { type: ACTION_A }))

      it('yields a response of A', ({ value: { payload } }) => {
        payload.action.should.deep.equal(response('A'))
      })
    })
  })
})
```
[See full example](test/examples/05.forking.spec.ts)

## Options

### context

If present, `getContext` & `setContext` effects get resolved with values from the context object.

```js
// ...

function* mySaga(url) {
  const apiClient = yield getContext('apiClient')
  yield call(apiClient.fetch, url)
}

const apiClient = {
  fetch() { return null }
}

const sagaTest = sagaTestFactory({
  context: {apiClient}
})

describe('mySaga', () => {
  const it = sagaTest(mySaga, 'https://example.com')

  // GET_CONTEXT is intercepted by contextEffectMiddleware
  // it('gets apiClient from context')

  it('calls apiClient.fetch', ({context, value: {payload}}) => {
    payload.fn.should.equal(context.apiClient.fetch)
  })
})
```
[See full example](test/examples/03.context.spec.ts)

### middleware

Effect middlewares are called once for each iteration of a saga generator before running a test.

Effects can be intercepted by resolving to a value. When an effect is resolved, the result is yielded back and the saga generator, which resumes to the next iteration.

Middlewares have the same signature as a redux-saga `EffectMiddleware`, and must run synchronously.

This can be used to mock effects such as selecting a value from the store:

### env

Object with hooks from test runner's environment, falls back to get values from `global`.
Required properties are `{ it, describe, before }`

```js
// Resolves select effect with values from a state object
const mockStoreMiddleware = (state) => (next) => (effect) => {
  if (effect && effect[IO] && effect.type == 'SELECT') {
    const {selector, args} = effect.payload
    next(selector(state, ...args))
  }
  else next(effect)
}

const sagaTest = sagaTestFactory({
  middleware: [
    mockStoreMiddleware({ /* ... redux state */ })
  ]
})
```
[See full example](test/examples/04.middleware.spec.ts)