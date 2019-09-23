import { IO } from '@redux-saga/symbols'
import {call, select} from 'redux-saga/effects'
import sagaTestFactory from '../../src'

const fetch = () => null

const getUserId = (state) => state.user.id

function* mySaga() {
  const userId = yield select(getUserId)
  yield call(fetch, `/users/${userId}`)
}

const mockStoreMiddleware = (state) => (next) => (effect) => {
  if (effect && effect[IO] && effect.type == 'SELECT') {
    const {selector, args} = effect.payload
    next(selector(state, ...args))
  }
  else next(effect)
}

describe('effectMiddleware', () => {
  const sagaTest = sagaTestFactory({
    effectMiddlewares: [
      mockStoreMiddleware({
        user: {id: 1}
      })
    ]
  })
  
  describe('mySaga', () => {
    const it = sagaTest(mySaga)
  
    it('calls fetch with user id from store', ({value: {payload}}) => {
      payload.fn.should.equal(fetch)
      payload.args[0].should.equal('/users/1')
    })
  })
})