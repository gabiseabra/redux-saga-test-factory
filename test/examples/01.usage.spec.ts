import { call, put } from 'redux-saga/effects'
import sagaTestFactory from '../../src'

const fetch = (_: string) => null

const successAction = response => ({ type: 'SUCCESS', response })

function* mySaga(url: string) {
  const response = yield call(fetch, url)
  yield put(successAction(response))
}

describe('usage', () => {
  const sagaTest = sagaTestFactory()

  sagaTest(mySaga, 'https://example.com').do(it => {
    it('calls an effect', effect => {
      effect.should.deep.equal(call(fetch, 'https://example.com'))

      return 'response'
    })

    it('puts successAction', effect => {
      effect.should.deep.equal(put(successAction('response')))
    })
  })
})
