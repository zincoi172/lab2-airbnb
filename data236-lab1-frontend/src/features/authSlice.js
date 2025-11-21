import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api'

export const login = createAsyncThunk('auth/login', async (credentials, thunkAPI) => {
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(credentials),
      signal: thunkAPI.signal,            
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || 'Login failed')
    return { token: data.token, role: data.role, user: data.user || { role: data.role } }
  } catch (err) {
    return thunkAPI.rejectWithValue(err?.message || 'Login failed')
  }
})

export const signup = createAsyncThunk('auth/signup', async (payload, thunkAPI) => {
  try {
    const res = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
      signal: thunkAPI.signal,            
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || 'Signup failed')
    return { token: data.token, role: data.role, user: data.user || { role: data.role } }
  } catch (err) {
    return thunkAPI.rejectWithValue(err?.message || 'Signup failed')
  }
})

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: null,
    role: null,
    user: null,            
    loading: false,
    error: null,
  },
  reducers: {
    logout(state) {
      state.token = null
      state.role = null
      state.user = null     
      state.error = null
      state.loading = false
    },
    setAuth(state, action) { 
      if (action.payload?.token) state.token = action.payload.token
      if (action.payload?.role) state.role = action.payload.role
      if (action.payload?.user) state.user = action.payload.user
    },
    clearAuthError(state) {   
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // login
      .addCase(login.pending, (s) => {
        s.loading = true
        s.error = null
      })
      .addCase(login.fulfilled, (s, a) => {
        s.loading = false
        s.error = null               
        s.token = a.payload.token
        s.role = a.payload.role
        s.user = a.payload.user || null
      })
      .addCase(login.rejected, (s, a) => {
        s.loading = false
        s.error = a.payload || 'Login failed'  
      })
      // signup
      .addCase(signup.pending, (s) => {
        s.loading = true
        s.error = null
      })
      .addCase(signup.fulfilled, (s, a) => {
        s.loading = false
        s.error = null               
        if (a.payload.token) s.token = a.payload.token
        if (a.payload.role) s.role = a.payload.role
        s.user = a.payload.user || s.user || null
      })
      .addCase(signup.rejected, (s, a) => {
        s.loading = false
        s.error = a.payload || 'Signup failed' 
      })
  },
})

export const { logout, setAuth, clearAuthError } = authSlice.actions
export default authSlice.reducer
