import { call, put } from 'redux-saga/effects'
import { expect } from 'chai'
import sagaTestFactory from '../../src'

const fetch = (_: string) => null

const successAction = response => ({ type: 'SUCCESS', response })

function* mySaga(url: string) {
  const response = yield call(fetch, url)
  yield put(successAction(response))
}

describe('generator', () => {
  const sagaTest = sagaTestFactory()

  sagaTest(mySaga, 'https://example.com').do(it => {
    it('yields values back and forth between test and saga', function* _(effect) {
      expect(effect).to.equal(call(fetch, 'https://example.com'))
      expect(yield 'response').to.equal(put(successAction('response')))
      expect(yield).to.equal(put(successAction('response')))
    })
  })
})
