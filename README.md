# redux-saga-test-factory

A redux saga test helper with support for cloning and mocks using effect middlewares. Inspired by [redux-saga-testing](https://github.com/antoinejaussoin/redux-saga-testing) and [@redux-saga/testing-utils](https://github.com/redux-saga/redux-saga/tree/master/packages/testing-utils)' `cloneableGenerator`.

## Usage

Initialize the default export from this package to configure a `sagaTestFactory`.

The `sagaTest` is an `it` function which runs one test per iteration on a given saga generator.

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
[See full example](test/examples/01.usage.spec.js)


## Cloning

`sagaTest.clone` branches the state of the generator into another `sagaTest` function, which runs without affecting the state of the original one.

The first argument takes a value to override the value resolved from the previous test before resuming.

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
[See full example](test/examples/02.cloning.spec.js)


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
[See full example](test/examples/03.context.spec.js)

### effectMiddlewares

Effect middlewares are called once for each iteration of a saga generator before running a test.

Effects can be intercepted by resolving to a value. When an effect is resolved, the result is yielded back and the saga generator, which resumes to the next iteration.

Middlewares have the same signature as a redux-saga `EffectMiddleware`, and must run synchronously.

This can be used to mock effects such as selecting a value from the store:

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
  effectMiddlewares: [
    mockStoreMiddleware({ /* ... redux state */ })
  ]
})
```
[See full example](test/examples/04.effectMiddleware.spec.js)