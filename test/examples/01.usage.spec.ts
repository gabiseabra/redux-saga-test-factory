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

  describe('mySaga', () => {
    const it = sagaTest(mySaga, 'https://example.com')

    it('calls an effect', ({ value: effect }) => {
      effect.type.should.equal('CALL')
      effect.payload.fn.should.equal(fetch)
      effect.payload.args[0].should.equal('https://example.com')

      return 'response'
    })

    it('puts successAction', ({ value: { payload } }) => {
      payload.action.should.deep.equal(successAction('response'))
    })
  })
})
