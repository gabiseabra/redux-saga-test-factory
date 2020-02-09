import { call, getContext } from 'redux-saga/effects'
import sagaTestFactory from '../../src'

function* mySaga(url) {
  const apiClient = yield getContext('apiClient')
  yield call(apiClient.fetch, url)
}

describe('context', () => {
  const apiClient = {
    fetch() { return null }
  }

  const sagaTest = sagaTestFactory({
    context: { apiClient }
  })

  describe('mySaga', () => {
    const it = sagaTest(mySaga, 'https://example.com')

    // GET_CONTEXT is intercepted by contextEffectMiddleware
    // it('gets apiClient from context')

    it('calls apiClient.fetch', ({ context, value: { payload } }) => {
      payload.fn.should.equal(context.apiClient.fetch)
    })
  })
})