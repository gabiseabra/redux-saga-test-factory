import { call, put } from 'redux-saga/effects'
import sagaTestFactory from '../../src'

const fetch = (_: string) => null

const successAction = response => ({ type: 'SUCCESS', response })
const errorAction = error => ({ type: 'ERROR', error })

function* mySaga(url) {
  try {
    const response = yield call(fetch, url)
    yield put(successAction(response))
  } catch (error) {
    yield put(errorAction(error))
  }
}

describe('cloning', () => {
  const sagaTest = sagaTestFactory()

  sagaTest(mySaga, 'https://example.com').do(it => {
    it('calls fetch')

    it.clone('successful response', 'some result', it => {
      it('puts successAction', ({ value: { payload } }) => {
        payload.action.should.deep.equal(successAction('some result'))
      })
    })

    const error = new Error()
    it.clone('error response', error, it => {
      it('puts errorAction', ({ value: { payload } }) => {
        payload.action.should.deep.equal(errorAction(error))
      })
    })
  })
})
