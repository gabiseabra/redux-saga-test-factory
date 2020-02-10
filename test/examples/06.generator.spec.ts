import AssertionError = require('assertion-error')
import { call, put } from 'redux-saga/effects'
import { expect } from 'chai'
import sagaTestFactory from '../../src'

const fetch = (_: string) => null
const format = (_: string) => null

const successAction = response => ({ type: 'SUCCESS', response })

function* mySaga(url: string) {
  const response = yield call(fetch, url)
  const nextResponse = yield call(format, response)
  yield put(successAction(nextResponse))
}

describe('generator', () => {
  const sagaTest = sagaTestFactory()

  sagaTest(mySaga, 'https://example.com').do(it => {
    it('yields values between test and saga', function* _(effect) {
      expect(effect).to.deep.equal(call(fetch, 'https://example.com'))
      expect(yield 'response').to.deep.equal(call(format, 'response'))
      return 'RESPONSE'
    })

    it.clone('resuming test', it => {
      it('resumes saga', effect => {
        expect(effect).to.deep.equal(put(successAction('RESPONSE')))
      })

      it('is dones', (_, { done }) => {
        expect(done).to.equal(true)
      })
    })

    it.clone('failing test', it => {
      it('fails when the saga finishes before the test', function* _(effect) {
        let error
        expect(effect).to.deep.equal(put(successAction('RESPONSE')))
        try {
          yield
        } catch (e) {
          error = e
        }
        expect(error).to.be.instanceOf(AssertionError)
      })
    })
  })
})
