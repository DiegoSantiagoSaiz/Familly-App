import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp, collection, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';

interface UserData {
  uid: string;
  familyId: string;
  displayName: string;
  photoURL: string;
  theme?: string;
}

interface FamilyData {
  id: string;
  name: string;
  hqName?: string;
  members: string[];
  papaName?: string;
  papaRole?: string;
  papaPhotoURL?: string;
  papaBirthdate?: string;
  papaAllergies?: string;
  mamaName?: string;
  mamaRole?: string;
  mamaPhotoURL?: string;
  mamaBirthdate?: string;
  mamaAllergies?: string;
  customMembers?: any[];
  restrictedFinanceMembers?: string[];
}

interface FamilyContextType {
  user: FirebaseUser | null;
  userData: UserData | null;
  family: FamilyData | null;
  loading: boolean;
  joinOrCreateFamily: (name: string) => Promise<void>;
  joinFamily: (familyId: string) => Promise<void>;
}

const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

export const FamilyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [family, setFamily] = useState<FamilyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Manejar el estado de autenticación básico
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setUserData(null);
        setFamily(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Manejar la carga de datos de usuario y familia
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let unsubFamily: (() => void) | null = null;
    
    const loadingTimeout = setTimeout(() => {
      setLoading(false);
    }, 3000);

    const userPath = `users/${user.uid}`;
    const unsubUser = onSnapshot(doc(db, 'users', user.uid), (userSnap) => {
      if (userSnap.exists()) {
        const ud = userSnap.data() as UserData;
        setUserData(ud);
        
        if (unsubFamily) unsubFamily();

        if (ud.familyId) {
          unsubFamily = onSnapshot(doc(db, 'families', ud.familyId), (familySnap) => {
            if (familySnap.exists()) {
              setFamily({ id: familySnap.id, ...familySnap.data() } as FamilyData);
            } else {
              setFamily(null);
            }
            clearTimeout(loadingTimeout);
            setLoading(false);
          }, (err) => {
            console.error("FamilyContext Error (Family):", err);
            // No mostrar error UI inmediatamente, dejar que el timeout maneje el loading
          });
        } else {
          setFamily(null);
          clearTimeout(loadingTimeout);
          setLoading(false);
        }
      } else {
        setUserData(null);
        setFamily(null);
        clearTimeout(loadingTimeout);
        setLoading(false);
      }
    }, (err) => {
      console.error("FamilyContext Error (User):", err);
      // Solo mostrar error en UI si persiste tras el timeout
    });

    return () => {
      clearTimeout(loadingTimeout);
      unsubUser();
      if (unsubFamily) unsubFamily();
    };
  }, [user]);

  const joinOrCreateFamily = async (name: string) => {
    if (!user) throw new Error("No hay usuario autenticado");
    
    try {
      // Usar un ID generado automáticamente para evitar colisiones
      const familyRef = doc(collection(db, 'families'));
      const familyId = familyRef.id;
      
      // Crear la familia
      await setDoc(familyRef, {
        name,
        createdAt: serverTimestamp(),
        members: [user.uid]
      });
      
      // Luego actualizar al usuario
      const ud: UserData = {
        uid: user.uid,
        familyId,
        displayName: user.displayName || 'Miembro Familiar',
        photoURL: user.photoURL || '',
      };
      
      await setDoc(doc(db, 'users', user.uid), ud, { merge: true });
    } catch (error) {
      console.error("joinOrCreateFamily error:", error);
      throw error;
    }
  };

  const joinFamily = async (familyId: string) => {
    if (!user) throw new Error("No hay usuario autenticado");
    const cleanId = familyId.trim();
    if (!cleanId) throw new Error("El código de la familia no puede estar vacío.");

    try {
      const familyRef = doc(db, 'families', cleanId);
      const familySnap = await getDoc(familyRef);

      if (!familySnap.exists()) {
        throw new Error(
          document.documentElement.lang === "en"
            ? "The entered family code does not exist or is invalid."
            : "El código de familia ingresado no existe o no es válido."
        );
      }

      // Add the user to the family members array
      await updateDoc(familyRef, {
        members: arrayUnion(user.uid)
      });

      // Update the user's familyId reference
      const ud: UserData = {
        uid: user.uid,
        familyId: cleanId,
        displayName: user.displayName || 'Miembro Familiar',
        photoURL: user.photoURL || '',
      };

      await setDoc(doc(db, 'users', user.uid), ud, { merge: true });
    } catch (error) {
      console.error("joinFamily error:", error);
      throw error;
    }
  };

  return (
    <FamilyContext.Provider value={{ user, userData, family, loading, joinOrCreateFamily, joinFamily }}>
      {error && (
        <div className="fixed top-0 left-0 w-full bg-rose-600 text-white p-2 text-center text-xs font-bold z-50 flex items-center justify-center gap-4">
          <span>⚠️ {error}</span>
          <button 
            onClick={() => {
              setError(null);
              setLoading(true);
              // Forzamos un re-render o simplemente dejamos que el useEffect [user] actúe (aunque no haya cambiado)
              // Una mejor forma es recargar la app si es un error fatal de inicio
              window.location.reload();
            }} 
            className="bg-white text-rose-600 px-3 py-1 rounded-full uppercase text-[10px] hover:bg-rose-50 transition-colors"
          >
            Reintentar
          </button>
        </div>
      )}
      {children}
    </FamilyContext.Provider>
  );
};

export const useFamily = () => {
  const context = useContext(FamilyContext);
  if (!context) throw new Error('useFamily must be used within a FamilyProvider');
  return context;
};
