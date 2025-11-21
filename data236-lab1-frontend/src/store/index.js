import { configureStore } from '@reduxjs/toolkit'
import { persistReducer, persistStore,
  FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist'
import storage from 'redux-persist/lib/storage'
import rootReducer from './rootReducer'

const logger = (storeAPI) => (next) => (action) => {
  console.log('[redux action]', action.type, action);
  return next(action);
};

const persistConfig = { key: 'root', storage, whitelist: ['auth'] }
const persistedReducer = persistReducer(persistConfig, rootReducer)

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: { ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER] },
    }).concat(logger),
});

if (process.env.NODE_ENV === 'development') {
  window.store = store;
}


export const persistor = persistStore(store)
