import { configureStore } from '@reduxjs/toolkit';
import fsrsReducer from './slices/fsrsSlice';
import quizReducer from './slices/quizSlice';

export const store = configureStore({
  reducer: {
    fsrs: fsrsReducer,
    quiz: quizReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
