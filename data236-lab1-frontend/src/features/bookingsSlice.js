// src/features/bookingSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api'

export const fetchMyBookings = createAsyncThunk(
  'bookings/fetchMyBookings',
  async (_, thunkAPI) => {
    try {
      const res = await fetch(`${API_URL}/traveler/bookings`, {
        credentials: 'include',          
        signal: thunkAPI.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return thunkAPI.rejectWithValue(data.error || data.message || 'Failed to fetch bookings');
      }
      const rows = Array.isArray(data)
        ? data
        : Array.isArray(data.bookings)
        ? data.bookings
        : [];
      return rows;
    } catch (err) {
      return thunkAPI.rejectWithValue(err?.message || 'Failed to fetch bookings');
    }
  }
);

// 建立訂單（建議帶完整 payload）
export const createBooking = createAsyncThunk(
  'bookings/createBooking',
  async (payload, thunkAPI) => {
    // payload: { propertyId, checkIn, checkOut, guests }
    try {
      const token = thunkAPI.getState().auth.token
      const res = await fetch(`${API_URL}/traveler/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include', 
        body: JSON.stringify(payload),
        signal: thunkAPI.signal, 
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return thunkAPI.rejectWithValue(data.message || 'Create Order Failed')
      return data // { orderId, ... }
    } catch (err) {
      return thunkAPI.rejectWithValue(err?.message || 'Create Order Failed')
    }
  }
)

const bookingSlice = createSlice({
  name: 'bookings',
  initialState: {
    items: [],
    favorites: [],
    current: { status: 'idle' }, 
    loading: false,
    error: null,
  },
  reducers: {
    setFavorites(state, action) {
      state.favorites = Array.isArray(action.payload) ? action.payload : [];
    },
    toggleFavorite(state, action) {
      const id = action.payload
      state.favorites = state.favorites.includes(id)
        ? state.favorites.filter(f => f !== id)
        : [...state.favorites, id]
    },
    clearBookingError(state) {
      state.error = null
    },
    resetCurrentBooking(state) {
      state.current = { status: 'idle' }
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchMyBookings
      .addCase(fetchMyBookings.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchMyBookings.fulfilled, (state, action) => {
        state.loading = false
        state.items = action.payload || []
      })
      .addCase(fetchMyBookings.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Get Orders Failed'
      })

      // createBooking
      .addCase(createBooking.pending, (state) => {
        state.loading = true
        state.error = null
        state.current.status = 'creating'
      })
      .addCase(createBooking.fulfilled, (state, action) => {
        state.loading = false
        state.items.push(action.payload)
        state.current = { ...action.payload, status: 'created' }
      })
      .addCase(createBooking.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Create Order Failed'
        state.current.status = 'failed'
      })
  },
})

export const { setFavorites, toggleFavorite, clearBookingError, resetCurrentBooking } = bookingSlice.actions
export default bookingSlice.reducer

export const selectBookings = (s) => s.bookings.items
export const selectBookingLoading = (s) => s.bookings.loading
export const selectBookingError = (s) => s.bookings.error
export const selectFavorites = (s) => s.bookings.favorites
export const selectCurrentBooking = (s) => s.bookings.current
