import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface VoiceInputButtonProps {
  value: string;
  onChange: (val: string) => void;
  language?: 'es' | 'en';
  isDark: boolean;
  className?: string;
  onDictationCaptured?: (text: string) => void;
}

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  value,
  onChange,
  language: propLanguage,
  isDark,
  className = '',
  onDictationCaptured,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [hasSupport, setHasSupport] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Dynamic language detection and synchronization
  const [detectedLanguage, setDetectedLanguage] = useState<'es' | 'en'>(() => {
    if (propLanguage) return propLanguage;
    const htmlLang = typeof document !== 'undefined' ? document.documentElement.lang : '';
    if (htmlLang === 'es' || htmlLang === 'en') return htmlLang as 'es' | 'en';
    return 'es'; // Fallback
  });

  useEffect(() => {
    if (propLanguage) {
      setDetectedLanguage(propLanguage);
      return;
    }

    const updateLang = () => {
      const htmlLang = document.documentElement.lang;
      if (htmlLang === 'es' || htmlLang === 'en') {
        setDetectedLanguage(htmlLang as 'es' | 'en');
      }
    };

    updateLang();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'lang') {
          updateLang();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang'],
    });

    return () => observer.disconnect();
  }, [propLanguage]);

  const language = detectedLanguage;
  
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setHasSupport(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    // Set language ISO code
    rec.lang = language === 'es' ? 'es-ES' : 'en-US';

    rec.onstart = () => {
      setIsListening(true);
      setErrorMsg(null);
    };

    rec.onresult = (event: any) => {
      const resultsIndex = event.resultIndex;
      const transcript = event.results[resultsIndex][0].transcript;
      if (transcript) {
        const trimmed = transcript.trim();
        // Capitalize the first letter of dictation
        const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
        const newValue = value ? `${value.trim()} ${capitalized}` : capitalized;
        onChange(newValue);
        onDictationCaptured?.(capitalized);
        
        // Dispatch custom global event for event-driven decoupled systems
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('voice-input-captured', { detail: capitalized }));
        }
      }
    };

    rec.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setErrorMsg(language === 'es' ? 'Permiso de micrófono denegado' : 'Microphone permission denied');
      } else if (event.error === 'no-speech') {
        // Silent timeout is fine, we just stop
      } else {
        setErrorMsg(language === 'es' ? 'Error al escuchar' : 'Listening error occurred');
      }
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = rec;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore error on cleanup
        }
      }
    };
  }, [language, value, onChange, onDictationCaptured]);

  // Adjust language dynamically if it changes during an active listener
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = language === 'es' ? 'es-ES' : 'en-US';
    }
  }, [language]);

  const toggleListening = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!hasSupport) {
      alert(
        language === 'es'
          ? 'La entrada de voz no es compatible con este navegador.'
          : 'Voice input is not supported in this browser.'
      );
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setErrorMsg(null);
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.error('Speech recognition start failed:', err);
        // Force reset
        setIsListening(false);
      }
    }
  };

  if (!hasSupport) return null;

  return (
    <div className={`relative flex items-center shrink-0 ${className}`}>
      <motion.button
        type="button"
        onClick={toggleListening}
        whileTap={{ scale: 0.9 }}
        className={`p-3.5 rounded-2xl flex items-center justify-center transition-all cursor-pointer relative ${
          isListening
            ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
            : isDark
            ? 'bg-white/5 border border-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
            : 'bg-black/5 text-zinc-650 hover:text-zinc-900 hover:bg-black/10'
        }`}
        title={
          isListening
            ? language === 'es'
              ? 'Escuchando... Haz clic para parar'
              : 'Listening... Click to stop'
            : language === 'es'
            ? 'Dictar tarea con voz'
            : 'Dictate task with voice'
        }
      >
        <AnimatePresence mode="wait">
          {isListening ? (
            <motion.div
              key="mic-off-anim"
              initial={{ rotate: -45, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 45, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <MicOff size={16} className="animate-pulse" />
            </motion.div>
          ) : (
            <motion.div
              key="mic-on-anim"
              initial={{ rotate: 45, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -45, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Mic size={16} />
            </motion.div>
          )}
        </AnimatePresence>

        {isListening && (
          <span className="absolute inset-0 rounded-2xl border-2 border-rose-500 animate-ping opacity-60 pointer-events-none" />
        )}
      </motion.button>

      {/* Floating Temp Error Tooltip */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, x: 10, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 10, scale: 0.95 }}
            className={`absolute right-full mr-3 z-50 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xl border flex items-center gap-2 whitespace-nowrap ${
              isDark
                ? 'bg-zinc-900 border-rose-500/20 text-rose-400'
                : 'bg-rose-50 border-rose-100 text-rose-700'
            }`}
          >
            <AlertCircle size={14} className="shrink-0" />
            <span>{errorMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
