/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FamilyProvider, useFamily } from './context/FamilyContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

function AppContent() {
  const { user, userData, loading } = useFamily();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If user is logged in but doesn't have a family setup yet, the Login component handles step 2
  if (!user || !userData?.familyId) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Dashboard />
    </div>
  );
}

export default function App() {
  return (
    <FamilyProvider>
      <AppContent />
    </FamilyProvider>
  );
}
