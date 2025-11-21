// src/features/propertySlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api'

export const fetchProperties = createAsyncThunk(
  'properties/fetchAll',
  async (params = {}, thunkAPI) => {
    try {
      const qs = new URLSearchParams(
        Object.fromEntries(
          Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
        )
      ).toString()
      const url = `${API_URL}/properties/search${qs ? `?${qs}` : ''}`
      const res = await fetch(url, { signal: thunkAPI.signal })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return thunkAPI.rejectWithValue(data.message || 'Get Properties Failed')
      return data
    } catch (err) {
      return thunkAPI.rejectWithValue(err?.message || 'Get Properties Failed')
    }
  }
)

export const fetchPropertyById = createAsyncThunk(
  'properties/fetchById',
  async (id, thunkAPI) => {
    try {
      const res = await fetch(`${API_URL}/properties/${id}`, { signal: thunkAPI.signal })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return thunkAPI.rejectWithValue(data.message || 'Get Properties Details Failed')
      return data
    } catch (err) {
      return thunkAPI.rejectWithValue(err?.message || 'Get Properties Details Failed')
    }
  }
)

const propertiesSlice = createSlice({
  name: 'properties',
  initialState: {
    list: [],
    detail: null,
    page: 1,
    pageSize: 10,
    total: 0,
    loading: false,
    error: null,
  },
  reducers: {
    clearPropertyError(state) { state.error = null },
  },
  extraReducers: (builder) => {
    builder
      // list
      .addCase(fetchProperties.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchProperties.fulfilled, (state, action) => {
        state.loading = false
        state.error = null
        if (Array.isArray(action.payload)) {
          state.list = action.payload
          state.total = action.payload.length
        } else {
          state.list = action.payload.items || []
          state.total = action.payload.total ?? state.total
          state.page = action.payload.page ?? state.page
          state.pageSize = action.payload.pageSize ?? state.pageSize
        }
      })
      .addCase(fetchProperties.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Get Properties Failed'
      })

      // detail
      .addCase(fetchPropertyById.pending, (state) => {
        state.loading = true
        state.error = null
        state.detail = null
      })
      .addCase(fetchPropertyById.fulfilled, (state, action) => {
        state.loading = false
        state.error = null
        state.detail = action.payload
      })
      .addCase(fetchPropertyById.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Get Properties Details Failed'
      })
  },
})

export const { clearPropertyError } = propertiesSlice.actions
export default propertiesSlice.reducer

export const selectPropertyList = (s) => s.properties.list
export const selectPropertyDetail = (s) => s.properties.detail
export const selectPropertyLoading = (s) => s.properties.loading
export const selectPropertyError = (s) => s.properties.error
export const selectPropertyTotal = (s) => s.properties.total
