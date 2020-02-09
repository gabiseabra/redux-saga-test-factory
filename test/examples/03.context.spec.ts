import { call, getContext, setContext } from 'redux-saga/effects'
import sagaTestFactory from '../../src'

function* mySaga(url) {
  const apiClient = yield getContext('apiClient')
  const result = yield call(apiClient.fetch, url)
  yield setContext({ result })
}

describe('context', () => {
  const apiClient = {
    fetch() { return null }
  }

  const sagaTest = sagaTestFactory({
    context: {
      result: '',
      apiClient
    }
  })

  describe('mySaga', () => {
    const it = sagaTest(mySaga, 'https://example.com')

    // GET_CONTEXT is intercepted by contextEffectMiddleware
    // it('gets apiClient from context')

    it('calls apiClient.fetch', ({ context, value: { payload } }) => {
      payload.fn.should.equal(context.apiClient.fetch)
      return 'test'
    })

    // SET_CONTEXT is intercepted by contextEffectMiddleware
    // it('sets result to context')

    it('updates context and is done', ({ context, done }) => {
      done.should.equal(true)
      context.result.should.equal('test')
    })
  })
})