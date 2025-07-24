import { configureStore } from '@reduxjs/toolkit';
import { api } from '@/services/api'; // Import the RTK Query API service

export const store = configureStore({
  // Combines all reducers, including the API's generated reducer.
  // The key `api.reducerPath` matches the `reducerPath` defined in createApi.
  reducer: {
    [api.reducerPath]: api.reducer,
    // Add other state slices here if your application grows (e.g., auth: authReducer)
  },
  // Adds the API middleware to enable caching, invalidation, and other RTK Query features.
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware),

  // Enables Redux DevTools Extension only in development mode for easier debugging.
  devTools: process.env.NODE_ENV !== 'production',
});

// Infers and exports the `RootState` type from the store's reducer.
export type RootState = ReturnType<typeof store.getState>;
// Infers and exports the `AppDispatch` type for typed dispatch hook.
export type AppDispatch = typeof store.dispatch;
