import { all, call, put, fork, takeEvery } from 'redux-saga/effects'
import { Action } from 'redux'
import sagaTestFactory from '../../src'

const ACTION_A = 'ACTION_A'
const ACTION_B = 'ACTION_B'
const RESPONSE = 'ACTION_RESPONSE'

const response = value => ({ type: RESPONSE, value })

function* aSaga(_: Action) {
  yield put(response('A'))
}

function* bSaga(_: Action) {
  yield put(response('B'))
}

const syncFunction = () => 'syncFunction'
const asyncFunction = () => Promise.resolve('asyncFunction')

function* mainSaga() {
  yield all([
    takeEvery(ACTION_A, aSaga),
    takeEvery(ACTION_B, bSaga),
    call(syncFunction),
    call(asyncFunction)
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

    it.forks(takeEvery(ACTION_B, bSaga), it => {
      it('takes an ACTION_B', () => ({ type: ACTION_B }))

      it.forks(fork(bSaga, { type: ACTION_B }))

      it('yields a response of B', ({ value: { payload } }) => {
        payload.action.should.deep.equal(response('B'))
      })
    })

    it.forks(call(syncFunction), it => {
      it('calls syncFunction', ({ value, done }) => {
        done.should.equal(true)
        value.should.equal('syncFunction')
      })
    })

    it.forks(call(asyncFunction), it => {
      it('calls asyncFunction', async ({ value: promise, done }) => {
        promise.should.be.instanceOf(Promise)
        const value = await promise
        done.should.equal(true)
        value.should.equal('asyncFunction')
      })
    })
  })
})
