import { combineReducers } from '@reduxjs/toolkit'
import { persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage'

import authReducer from '../features/authSlice'
import bookingsReducer from '../features/bookingsSlice'
import propertiesReducer from '../features/propertiesSlice'

const bookingsPersistConfig = {
  key: 'bookings',
  storage,
  whitelist: ['favorites'],
}
const persistedBookings = persistReducer(bookingsPersistConfig, bookingsReducer)

export default combineReducers({
  auth: authReducer,
  bookings: persistedBookings,
  properties: propertiesReducer,
})
