import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/auth/authSlice';
import userReducer from "./slices/user/userSlice";
import strategicPlanReducer from "./slices/strategicPlan/strategicPlanSlice"
import indicatorReducer from "./slices/indicatorSlice"
import userIndicatorsReducer from "./slices/userIndicatorSlice"
import adminIndicatorsReducer from "./slices/adminIndicatorSlice"
import reportsReducer from "./slices/reportSlice"
import dashboardReducer from "./slices/dashboardSlice"
import registryReducer from "./slices/registrySlice"
import streamFileReducer from "./slices/streamSlice"

export const store = configureStore({
  reducer: {
    auth: authReducer,
    users: userReducer,
    strategicPlan: strategicPlanReducer,
    indicators: indicatorReducer,
    userIndicators: userIndicatorsReducer,
    adminIndicators: adminIndicatorsReducer,
    reports: reportsReducer,
    dashboard: dashboardReducer,
    registry: registryReducer,
    streamFile: streamFileReducer
    // Add other features (e.g., products, cart) here later
  },
  // DevTools is enabled by default in development mode
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;