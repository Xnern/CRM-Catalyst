import { configureStore } from '@reduxjs/toolkit';
// Changez 'contactsApi' en 'api' pour correspondre à l'exportation dans services/api.ts
import { api } from '@/services/api';

export const store = configureStore({
  reducer: {
    // Utilisez 'api.reducerPath' et 'api.reducer'
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    // Utilisez 'api.middleware'
    getDefaultMiddleware().concat(api.middleware),

  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
