import { all, call, cps, put, fork, takeEvery } from 'redux-saga/effects'
import { Action } from 'redux'
import sagaTestFactory from '../../src'

const ACTION_A = 'ACTION_A'
const RESPONSE = 'ACTION_RESPONSE'

const response = value => ({ type: RESPONSE, value })

function* aSaga(_: Action) {
  yield put(response('A'))
}

function* bSaga() {
  yield put(response('B'))
}

const syncFunction = () => 'syncFunction'
const asyncFunction = () => Promise.resolve('asyncFunction')

function* mainSaga() {
  yield all([
    cps(syncFunction),
    call(asyncFunction),
    takeEvery(ACTION_A, aSaga),
    fork(bSaga)
  ])
}

describe('forking', () => {
  const sagaTest = sagaTestFactory()

  describe('mainSaga', () => {
    const it = sagaTest(mainSaga)

    it.forks(takeEvery(ACTION_A, aSaga), it => {
      it('takes an ACTION_A', () => ({ type: ACTION_A }))

      it.forks(fork(aSaga, { type: ACTION_A }))

      it('yields a response of A', ({ payload }) => {
        payload.action.should.deep.equal(response('A'))
      })
    })

    it.forks(fork(bSaga), it => {
      it('yields a response of B', ({ payload }) => {
        payload.action.should.deep.equal(response('B'))
      })
    })

    it.forks(cps(syncFunction), it => {
      it('calls syncFunction', (value, { done }) => {
        done.should.equal(true)
        value.should.equal('syncFunction')
      })
    })

    it.forks(call(asyncFunction), it => {
      it('calls asyncFunction', async (promise, { done }) => {
        promise.should.be.instanceOf(Promise)
        const value = await promise
        done.should.equal(true)
        value.should.equal('asyncFunction')
      })
    })
  })
})
