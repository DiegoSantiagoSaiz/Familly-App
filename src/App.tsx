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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Barra superior limpia que no tapa los botones del Dashboard */}
      <div className="w-full bg-white border-b border-gray-200 p-4 flex justify-center items-center">
        <button
          onClick={copiarCodigoFamiliar}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition-all duration-200 ${
            copiado 
              ? 'bg-green-600 text-white' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {copiado ? '✅ ¡Código Copiado!' : '📋 Copiar Código Familiar'}
        </button>
      </div>

      {/* El Dashboard ahora se renderiza debajo de la barra de forma natural */}
      <div className="flex-1">
        <Dashboard />
      </div>
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
