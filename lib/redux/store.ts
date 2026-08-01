import { configureStore } from '@reduxjs/toolkit';
import fsrsReducer from './slices/fsrsSlice';

export const store = configureStore({
  reducer: {
    fsrs: fsrsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
