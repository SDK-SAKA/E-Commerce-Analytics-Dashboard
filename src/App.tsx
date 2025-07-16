import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Sales } from './pages/Sales';
import { Customers } from './pages/Customers';
import { Inventory } from './pages/Inventory';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={
              <ProtectedRoute requiredRoles={['ceo', 'staff']}>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="sales" element={
              <ProtectedRoute requiredRoles={['ceo']}>
                <Sales />
              </ProtectedRoute>
            } />
            <Route path="customers" element={
              <ProtectedRoute requiredRoles={['ceo', 'staff']}>
                <Customers />
              </ProtectedRoute>
            } />
            <Route path="inventory" element={
              <ProtectedRoute requiredRoles={['ceo', 'staff']}>
                <Inventory />
              </ProtectedRoute>
            } />
            <Route path="reports" element={
              <ProtectedRoute requiredRoles={['ceo']}>
                <Reports />
              </ProtectedRoute>
            } />
            <Route path="settings" element={
              <ProtectedRoute requiredRoles={['ceo']}>
                <Settings />
              </ProtectedRoute>
            } />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;