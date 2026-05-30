import React, { useState } from 'react';
import { useFamily } from '../context/FamilyContext';
import { loginWithGoogle } from '../lib/firebase';
import { LogIn, Users, CheckCircle, Zap, Shield } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const { user, loading, joinOrCreateFamily } = useFamily();
  const [familyName, setFamilyName] = useState('');
  const [step, setStep] = useState(user ? 2 : 1);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);

  // Sync step with user auth state
  React.useEffect(() => {
    if (user && step === 1) {
      setStep(2);
    }
  }, [user, step]);

  if (loading) return null;

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setError(null);
    try {
      await loginWithGoogle();
      setStep(2);
    } catch (err: any) {
      console.error(err);
      setError("Failed to sign in. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyName.trim() || isFinishing) return;
    setIsFinishing(true);
    setError(null);
    try {
      await joinOrCreateFamily(familyName);
    } catch (err: any) {
      console.error(err);
      // Try to extract a more useful message if it's a JSON string from handleFirestoreError
      let msg = "Could not create family. Please check your connection.";
      try {
        const parsed = JSON.parse(err.message);
        if (parsed.error) msg = `Error: ${parsed.error}`;
      } catch (e) {
        if (err.message) msg = err.message;
      }
      setError(msg);
      setIsFinishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl shadow-gray-200">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-100">
            <Users size={32} />
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">FamilyHub</h1>
          <p className="text-gray-500 font-medium italic">Beyond Tasks & Simple Lists</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold rounded-2xl animate-pulse">
             ⚠️ {error}
          </div>
        )}

        {step === 1 ? (
          <div className="space-y-6">
            <div className="space-y-4">
              <FeatureItem icon={Zap} text="AI-Powered Task Organization" />
              <CheckItem text="Real-time Family Collaboration" />
              <CheckItem text="Visual File Management" />
              <FeatureItem icon={Shield} text="Private & Secure Family Data" />
            </div>
            
            <button 
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-black transition-all transform active:scale-95 disabled:opacity-50"
            >
              {isLoggingIn ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={20} />
                  Login with Google
                </>
              )}
            </button>
          </div>
        ) : (
          <form onSubmit={handleFinish} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 px-1">Give your family a name</label>
              <input 
                autoFocus
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                placeholder="The Smith's Home..."
                className="w-full px-5 py-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-100 text-gray-700 font-medium"
              />
            </div>
            <button 
              type="submit"
              disabled={isFinishing || !familyName.trim()}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
            >
              {isFinishing ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
              ) : (
                'Get Started'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const FeatureItem = ({ icon: Icon, text }: { icon: any, text: string }) => (
  <div className="flex items-center gap-3 text-sm font-medium text-gray-700">
    <div className="text-blue-500">
      <Icon size={18} />
    </div>
    {text}
  </div>
);

const CheckItem = ({ text }: { text: string }) => (
  <div className="flex items-center gap-3 text-sm font-medium text-gray-700">
    <CheckCircle size={18} className="text-green-500" />
    {text}
  </div>
);
