/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { FamilyProvider, useFamily } from './context/FamilyContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

function AppContent() {
  const { user, userData, loading } = useFamily();
  const [copiado, setCopiado] = useState(false);

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

  // Función para copiar el ID familiar al portapapeles
  const copiarCodigoFamiliar = async () => {
    try {
      await navigator.clipboard.writeText(userData.familyId);
      setCopiado(true);
      // El mensaje de "¡Copiado!" desaparece a los 3 segundos
      setTimeout(() => setCopiado(false), 3000);
    } catch (err) {
      console.error('Error al copiar el código: ', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Botón flotante para copiar el ID de la familia */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        <button
          onClick={copiarCodigoFamiliar}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold shadow-md transition-all duration-200 ${
            copiado 
              ? 'bg-green-600 text-white' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {copiado ? '✅ ¡Código Copiado!' : '📋 Copiar Código Familiar'}
        </button>
      </div>

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
