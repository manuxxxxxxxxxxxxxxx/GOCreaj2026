import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as authService from '../../services/authService';
import type { User, UserRole } from '../../types';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = { user: null, loading: false, error: null };

export const loadUser = createAsyncThunk('auth/loadUser', async () => {
  const loggedIn = await authService.isLoggedIn();
  if (!loggedIn) return null;
  return authService.getStoredUser();
});

export const loginThunk = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    const result = await authService.login(email, password);
    if ('error' in result) return rejectWithValue(result.error);
    return result.user;
  }
);

export const registerThunk = createAsyncThunk(
  'auth/register',
  async (
    { name, email, password, role }: { name: string; email: string; password: string; role: UserRole },
    { rejectWithValue }
  ) => {
    const result = await authService.register(name, email, password, role);
    if ('error' in result) return rejectWithValue(result.error);
    return result;
  }
);

export const logoutThunk = createAsyncThunk('auth/logout', async () => {
  await authService.logout();
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError(state) { state.error = null; },
    setUser(state, action: PayloadAction<User>) { state.user = action.payload; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadUser.fulfilled, (state, action) => { state.user = action.payload; })
      .addCase(loginThunk.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(loginThunk.fulfilled, (state, action) => { state.loading = false; state.user = action.payload; })
      .addCase(loginThunk.rejected, (state, action) => { state.loading = false; state.error = action.payload as string; })
      .addCase(logoutThunk.fulfilled, (state) => { state.user = null; });
  },
});

export const { clearError, setUser } = authSlice.actions;
export default authSlice.reducer;
