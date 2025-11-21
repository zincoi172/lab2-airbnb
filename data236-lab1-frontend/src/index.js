import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import TravelerDashboard from './traveler/dashboard';
import Travelerprofile from './traveler/profile';
import ProfileEdit from './traveler/profileEdit';
import Favorites from './traveler/favorites';
import PropertyDetails from "./traveler/propertydetails";
import BookingRequest from "./traveler/bookmanagement";
import OwnerDashboard from './owner/dashboard';
import Ownerprofile from './owner/profile';
import PropertyForm from './owner/propertiesEdit';
import BookingManagement from './owner/bookingmanagement';
import ProfileEditO from './owner/profileEdit';
import reportWebVitals from './reportWebVitals';
import ProtectedRoute from "./utils/ProtectedRoute";
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import {Provider} from 'react-redux'
import {store, persistor} from './store'
import {PersistGate} from 'redux-persist/integration/react'
import GlobalModals from './global/GlobalModals';
import {login as loginThunk} from './features/authSlice'

if (process.env.NODE_ENV === 'development') {
  window.store = store;
  window.testLogin = (email, password) =>
    store.dispatch(loginThunk({ email, password }));
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={<div style={{padding:16}}>Loading…</div>}
  persistor={persistor}>   
        <BrowserRouter>
          <GlobalModals />
          <Routes>
            <Route path="/" element={<TravelerDashboard />} />
            <Route path="/property/:id" element={<PropertyDetails />} />

            {/* Traveler */}
            <Route
              path="/traveler/profile"
              element={
                <ProtectedRoute role="traveler">
                  <Travelerprofile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/traveler/profile/edit"
              element={
                <ProtectedRoute role="traveler">
                  <ProfileEdit />
                </ProtectedRoute>
              }
            />
            <Route
              path="/traveler/favorites"
              element={
                <ProtectedRoute role="traveler">
                  <Favorites />
                </ProtectedRoute>
              }
            />
            <Route
              path="/property/book/:id"
              element={
                <ProtectedRoute role="traveler">
                  <BookingRequest />
                </ProtectedRoute>
              }
            />

            {/* Owner */}
            <Route
              path="/owner/dashboard"
              element={
                <ProtectedRoute role="owner">
                  <OwnerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner/properties/new"
              element={
                <ProtectedRoute role="owner">
                  <PropertyForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner/properties/:id/edit"
              element={
                <ProtectedRoute role="owner">
                  <PropertyForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner/bookings"
              element={
                <ProtectedRoute role="owner">
                  <BookingManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner/profile"
              element={
                <ProtectedRoute role="owner">
                  <Ownerprofile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner/profile/edit"
              element={
                <ProtectedRoute role="owner">
                  <ProfileEditO />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </PersistGate>
    </Provider>
  </React.StrictMode>
);

reportWebVitals();
