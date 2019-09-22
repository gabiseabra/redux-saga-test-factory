import sagaTestFactory from "../src"
import saga, {ApiClient, successAction, errorAction} from "./saga"


describe('sagaTestFactory', () => {
  const apiClient = new ApiClient()
  const sagaTest = sagaTestFactory({
    context: {apiClient}
  })
  const mySagaTest = sagaTest(saga)
  const it = mySagaTest

  // GET_CONTEXT is intercepted by contextEffectMiddleware
  it('skips intercepted effects', ({value: {type, payload}}) => {
    type.should.equal('CALL')
    payload.fn.should.equal(apiClient.login)
  })

  describe('clone#1 - clones saga', () => {
    for(let i = 0; i < 2; i++) {
      const it = mySagaTest.clone()

      it('continues cloned saga', ({value: {payload}}) => {
        payload.action.should.deep.equal(successAction())
      })

      it('finishes', ({done}) => {
        done.should.equal(true)
      })
    }
  })

  describe('clone#2 - overrides result', () => {
    const response = 'test response'
    const user = {name: 'test'}
    const it = mySagaTest.clone(response)

    it('receives new result', ({value: {payload}}) => {
      payload.fn.should.equal(apiClient.verify)
      payload.args[0].should.equal(response)
      return user
    })

    it('receives result from previous test', ({value: {payload}}) => {
      payload.action.should.deep.equal(successAction(user))
    })
  })

  describe('clone#3 - throws resulting error', () => {
    const response = new Error()
    const it = mySagaTest.clone(response)

    it('catches an error', ({value: {payload}}) => {
      payload.action.should.deep.equal(errorAction(response))
    })
  })
})