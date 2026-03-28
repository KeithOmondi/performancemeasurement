// types/store.types.ts

import type { store } from "../store/store";


export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;