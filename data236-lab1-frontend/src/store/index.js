import { configureStore } from '@reduxjs/toolkit'
import {
  persistReducer,
  persistStore,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist'
import storage from 'redux-persist/lib/storage'
import rootReducer from './rootReducer'

const SENSITIVE_TYPES = new Set([
  'auth/login/pending', 'auth/login/fulfilled', 'auth/login/rejected',
  'auth/signup/pending', 'auth/signup/fulfilled', 'auth/signup/rejected',
])
const logger = () => (next) => (action) => {
  if (SENSITIVE_TYPES.has(action.type)) {
    const safeAction = {
      ...action,
      payload: action.payload ? { ...action.payload, password: '***' } : action.payload,
    }
    console.log('[redux action]', safeAction.type, safeAction)
  } else {
    console.log('[redux action]', action.type, action)
  }
  return next(action)
}

const persistConfig = { key: 'root', storage, whitelist: ['auth'] }
const persistedReducer = persistReducer(persistConfig, rootReducer)

export const store = configureStore({
  reducer: persistedReducer,
  devTools: process.env.NODE_ENV !== 'production',
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(logger),
})

export const persistor = persistStore(store)

if (process.env.NODE_ENV === 'development') {
  window.store = store
}
