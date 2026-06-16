import React, { useState, useEffect } from "react";
import { Download, Smartphone, Laptop, ExternalLink, Sparkles, Check, Info } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface InstallAppButtonProps {
  language?: "es" | "en";
  isDark: boolean;
  className?: string;
  variant?: "floating" | "sidebar" | "full" | "minimal" | "icon";
  onInstallStarted?: () => void;
  onInstallCompleted?: () => void;
}

export const InstallAppButton: React.FC<InstallAppButtonProps> = ({
  language: propLanguage,
  isDark,
  className = "",
  variant = "floating",
  onInstallStarted,
  onInstallCompleted,
}) => {
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(() => {
    if (typeof window !== "undefined") {
      return (window as any).deferredInstallPrompt || null;
    }
    return null;
  });

  const [installState, setInstallState] = useState<"idle" | "ready" | "prompting" | "installed" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync language with parent or document html attributes
  const [detectedLanguage, setDetectedLanguage] = useState<"es" | "en">(() => {
    if (propLanguage) return propLanguage;
    const htmlLang = typeof document !== "undefined" ? document.documentElement.lang : "es";
    return htmlLang === "en" ? "en" : "es";
  });

  useEffect(() => {
    if (propLanguage) {
      setDetectedLanguage(propLanguage);
      return;
    }
    const updateLang = () => {
      const htmlLang = document.documentElement.lang;
      setDetectedLanguage(htmlLang === "en" ? "en" : "es");
    };
    updateLang();
    const observer = new MutationObserver(updateLang);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    return () => observer.disconnect();
  }, [propLanguage]);

  const lang = detectedLanguage;

  // Track global beforeinstallprompt changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
      setInstallState("ready");
    };

    const handleCustomPromptCaptured = (e: any) => {
      if (e.detail) {
        setDeferredInstallPrompt(e.detail);
        setInstallState("ready");
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("pwa-prompt-captured", handleCustomPromptCaptured);

    // Initial check
    if ((window as any).deferredInstallPrompt) {
      setDeferredInstallPrompt((window as any).deferredInstallPrompt);
      setInstallState("ready");
    }

    // Check if app is running in standard standalone mode
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone;
    if (isStandalone) {
      setInstallState("installed");
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("pwa-prompt-captured", handleCustomPromptCaptured);
    };
  }, []);

  const handleInstallClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if inside an iframe
    const isInIframe = window.self !== window.top;
    if (isInIframe) {
      setInstallState("error");
      setErrorMessage(
        lang === "es"
          ? "No se puede instalar desde el editor integrado. Abre la app en una nueva pestaña tocando el enlace abajo."
          : "Cannot install from inside the embedded editor. Open the app in a new tab by tapping the link below."
      );
      return;
    }

    const currentPrompt = deferredInstallPrompt || (window as any).deferredInstallPrompt;

    if (!currentPrompt) {
      // Re-trigger standalone state check or alert instructions
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone;
      if (isStandalone) {
        setInstallState("installed");
        return;
      }

      setInstallState("error");
      setErrorMessage(
        lang === "es"
          ? "La instalación automática de 1-Clic no está lista. Si está en iOS use el menú de Compartir Safari -> 'Añadir a pantalla de inicio'."
          : "1-Click installation is not ready. If on iOS, use the Share Menu Safari -> 'Add to Home Screen' instead."
      );
      return;
    }

    try {
      setInstallState("prompting");
      onInstallStarted?.();
      
      currentPrompt.prompt();
      const { outcome } = await currentPrompt.userChoice;
      console.log(`PWA direct user response: ${outcome}`);

      if (outcome === "accepted") {
        setInstallState("installed");
        setDeferredInstallPrompt(null);
        (window as any).deferredInstallPrompt = null;
        onInstallCompleted?.();
      } else {
        setInstallState("ready");
      }
    } catch (err: any) {
      console.error("Installation failure:", err);
      setInstallState("error");
      setErrorMessage(err?.message || String(err));
    }
  };

  if (installState === "installed") {
    return (
      <div className={`flex items-center gap-1.5 justify-center py-2 px-4 rounded-xl text-emerald-500 font-bold text-xs bg-emerald-500/10 border border-emerald-500/10 ${className}`}>
        <Check size={14} className="animate-pulse" />
        <span>{lang === "es" ? "INSTALADA EN DISPOSITIVO" : "INSTALLED ON DEVICE"}</span>
      </div>
    );
  }

  // Define variant-specific UI
  if (variant === "icon") {
    return (
      <div className="relative flex justify-center">
        <motion.button
          type="button"
          onClick={handleInstallClick}
          whileTap={{ scale: 0.9 }}
          className={`p-3 rounded-xl flex items-center justify-center transition-all cursor-pointer relative ${
            deferredInstallPrompt
              ? "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/20 animate-pulse"
              : isDark
              ? "bg-white/5 border border-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
              : "bg-black/5 text-zinc-650 hover:text-zinc-900 hover:bg-black/10 border border-black/5"
          } ${className}`}
          title={lang === "es" ? "Instalar Aplicación (1-Clic)" : "Install Application (1-Click)"}
        >
          <Smartphone size={16} className={deferredInstallPrompt ? "animate-bounce text-amber-500" : ""} />
          {deferredInstallPrompt && (
            <span className="absolute top-1 right-1 flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
            </span>
          )}
        </motion.button>
      </div>
    );
  }

  if (variant === "minimal") {
    return (
      <div className="flex flex-col items-stretch gap-2">
        <motion.button
          type="button"
          onClick={handleInstallClick}
          whileTap={{ scale: 0.98 }}
          className={`flex items-center justify-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm ${
            deferredInstallPrompt
              ? "bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20"
              : isDark
              ? "bg-white/10 text-white hover:bg-white/15 border border-white/5"
              : "bg-black/5 text-zinc-900 hover:bg-black/10 border border-black/5"
          } ${className}`}
        >
          <Download size={14} className={deferredInstallPrompt ? "animate-bounce" : ""} />
          <span>{lang === "es" ? "Instalar One-Click" : "Install One-Click"}</span>
        </motion.button>
        
        {errorMessage && (
          <p className="text-[10px] font-black uppercase tracking-wide text-rose-500 text-center animate-pulse">
            {errorMessage}
          </p>
        )}
      </div>
    );
  }

  if (variant === "sidebar") {
    return (
      <div className="w-full flex flex-col gap-2">
        <motion.button
          type="button"
          onClick={handleInstallClick}
          whileTap={{ scale: 0.98 }}
          className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
            deferredInstallPrompt
              ? "bg-amber-500 text-black hover:bg-amber-400 shadow-md shadow-amber-500/15"
              : "opacity-60 hover:opacity-100 hover:bg-amber-500/10 hover:text-amber-500"
          } ${className}`}
          title={lang === "es" ? "Instalación One-Click inmediata" : "Instant PWA Installer"}
        >
          <Smartphone size={16} className={deferredInstallPrompt ? "animate-bounce text-amber-500" : ""} />
          <span className="text-[10px] font-black uppercase tracking-widest text-left flex-1">
            {lang === "es" ? "Instalar App Directa" : "Direct Install App"}
          </span>
          {deferredInstallPrompt && (
            <span className="absolute top-1 right-2 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-black"></span>
            </span>
          )}
        </motion.button>

        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-3 py-2 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-[10px] font-bold leading-normal overflow-hidden"
            >
              <p>{errorMessage}</p>
              {window.self !== window.top && (
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-rose-500 underline hover:text-rose-400 font-extrabold text-[9px] uppercase tracking-wider mt-1.5"
                >
                  <span>{lang === "es" ? "Abrir en Pestaña Nueva" : "Open in New Tab"}</span>
                  <ExternalLink size={10} />
                </a>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className={`p-5 rounded-3xl border ${isDark ? "bg-[#18181F] border-white/5" : "bg-zinc-50 border-zinc-200/60"} ${className}`}>
      <div className="flex items-center gap-3.5 mb-4">
        <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500 shrink-0">
          <Smartphone size={24} className="animate-pulse" />
        </div>
        <div>
          <h4 className="text-sm font-black uppercase tracking-tight flex items-center gap-1.5">
            <span>{lang === "es" ? "Instalación Digital 1-Clic" : "1-Click Instant Installer"}</span>
            <Sparkles size={14} className="text-amber-500" />
          </h4>
          <p className="text-[10px] sm:text-xs font-bold opacity-60 mt-0.5 leading-snug">
            {lang === "es"
              ? "Instala FamilyHub nativamente en tu móvil, tableta u ordenador portátil en un segundo."
              : "Download and bind FamilyHub directly on your mobile, tablet, or desktop instantly."}
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl text-[11px] font-bold leading-relaxed space-y-1.5"
          >
            <p>⚠️ {errorMessage}</p>
            {window.self !== window.top && (
              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-rose-400 hover:text-rose-300 font-black text-[10px] uppercase tracking-wider underline mt-0.5"
              >
                <span>{lang === "es" ? "Abrir en Pestaña Nueva y Probar" : "Open in New Tab to Try"}</span>
                <ExternalLink size={12} />
              </a>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row gap-3">
        <motion.button
          type="button"
          onClick={handleInstallClick}
          whileTap={{ scale: 0.98 }}
          className={`flex-1 flex items-center justify-center gap-3 p-3 text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl transition-all ${
            deferredInstallPrompt
              ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black cursor-pointer transform hover:scale-[1.01]"
              : isDark
              ? "bg-white/10 hover:bg-white/15 text-white border border-white/5 cursor-pointer"
              : "bg-black/5 hover:bg-black/10 text-zinc-800 border border-black/5 cursor-pointer"
          }`}
        >
          <Download size={16} className={deferredInstallPrompt ? "animate-bounce" : ""} />
          <span>{lang === "es" ? "Instalar App Ahora" : "Install App Now"}</span>
        </motion.button>

        {/* Display native help trigger if installation has manual steps */}
        <button
          type="button"
          onClick={() => {
            setErrorMessage(
              lang === "es"
                ? "iOS/Apple: Pulsa 'Compartir' en Safari y luego 'Añadir a pantalla de inicio'. Android/Chrome: Haz clic arriba para instalar o busca 'Instalar aplicación' en los 3 puntos."
                : "iOS/Safari: Tap 'Share' menu in Safari, choose 'Add to Home Screen'. Android/Desktop: Click Install or select 'Install app' inside Chrome's top-right menu."
            );
          }}
          className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-colors flex items-center justify-center gap-1.5 ${
            isDark ? "bg-white/5 border-white/10 text-white hover:bg-white/10" : "bg-black/5 border-black/5 text-zinc-650 hover:bg-black/10"
          }`}
        >
          <Info size={14} />
          <span>{lang === "es" ? "Instrucciones" : "Instructions"}</span>
        </button>
      </div>
    </div>
  );
};
