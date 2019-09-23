import {call, put} from 'redux-saga/effects'
import sagaTestFactory from '../../src'

const fetch = () => null

const successAction = (response) => ({type: 'SUCCESS', response})
const errorAction = (error) => ({type: 'ERROR', error})

function* mySaga(url) {
  try {
    const response = yield call(fetch, url)
    yield put(successAction(response))
  } catch(error) {
    yield put(errorAction(error))
  }
}

describe('cloning', () => {
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
})