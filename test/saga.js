import { call, put, getContext } from 'redux-saga/effects'

export class ApiClient {
  login() {
    return null
  }
  verify() {
    return null
  }
}

export const successAction = user => ({ type: 'SUCCESS', response: user })
export const errorAction = error => ({ type: 'ERROR', error })

export default function* testSaga() {
  const apiClient = yield getContext('apiClient')
  try {
    const response = yield call([apiClient, apiClient.login])
    const user = response
      ? yield call([apiClient, apiClient.verify], response)
      : undefined
    yield put(successAction(user))
  } catch (error) {
    yield put(errorAction(error))
  }
}
