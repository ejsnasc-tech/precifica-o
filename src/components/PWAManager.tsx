"use client";

import { useEffect, useRef, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAManager() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);

  useEffect(() => {
    // Registra o service worker e detecta atualizações
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          // Se já existe um SW esperando (ex: usuário abriu o app depois do deploy)
          if (reg.waiting) {
            waitingWorkerRef.current = reg.waiting;
            setUpdateAvailable(true);
          }

          // Detecta novo SW sendo instalado em tempo real
          reg.addEventListener("updatefound", () => {
            const newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener("statechange", () => {
              // "installed" + controller ativo = nova versão esperando para assumir
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                waitingWorkerRef.current = newWorker;
                setUpdateAvailable(true);
              }
            });
          });
        })
        .catch((err) => console.warn("[PWA] SW erro:", err));

      // Quando o SW novo assumir o controle, recarrega a página para aplicar
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        window.location.reload();
      });
    }

    // Online/offline
    const onOffline = () => { setIsOffline(true); setShowOfflineBanner(true); };
    const onOnline = () => { setIsOffline(false); setTimeout(() => setShowOfflineBanner(false), 3000); };
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    // Detecta se já está instalado (modo standalone)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
    }

    // Captura o evento de instalação
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      const dismissed = localStorage.getItem("pwa-install-dismissed");
      if (!dismissed && !installed) setShowInstallBanner(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, [installed]);

  const handleUpdate = () => {
    if (!waitingWorkerRef.current) return;
    // Manda o SW novo pular a fila e assumir — o listener de controllerchange recarrega
    waitingWorkerRef.current.postMessage({ type: "SKIP_WAITING" });
  };

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setShowInstallBanner(false);
    setInstallPrompt(null);
  };

  const dismissInstall = () => {
    localStorage.setItem("pwa-install-dismissed", "1");
    setShowInstallBanner(false);
  };

  return (
    <>
      {/* Banner offline / online */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${showOfflineBanner ? "translate-y-0" : "-translate-y-full"}`}
      >
        <div className={`flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-center ${isOffline ? "bg-amber-500 text-white" : "bg-emerald-500 text-white"}`}>
          {isOffline ? (
            <>
              <span>📡</span>
              Sem internet — exibindo dados salvos no dispositivo
            </>
          ) : (
            <>
              <span>✅</span>
              Conexão restaurada!
            </>
          )}
        </div>
      </div>

      {/* Banner de atualização disponível */}
      {updateAvailable && (
        <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
          <div className="bg-indigo-600 rounded-2xl shadow-2xl p-4 flex items-center gap-4">
            <div className="text-2xl">🚀</div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white text-sm">Nova versão disponível</p>
              <p className="text-indigo-200 text-xs mt-0.5">
                Melhorias e correções prontas para você.
              </p>
            </div>
            <button
              onClick={handleUpdate}
              className="shrink-0 bg-white text-indigo-700 font-bold text-xs px-4 py-2 rounded-xl hover:bg-indigo-50 transition-colors"
            >
              Atualizar
            </button>
          </div>
        </div>
      )}

      {/* Banner de instalação (só se não tiver update pendente) */}
      {showInstallBanner && !installed && !updateAvailable && (
        <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 text-white font-extrabold text-lg">
              $
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-800 text-sm">Instalar no dispositivo</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Acesse mesmo sem internet. Funciona como app nativo.
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleInstall}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-1.5 rounded-xl text-xs transition-colors"
                >
                  Instalar
                </button>
                <button
                  onClick={dismissInstall}
                  className="text-slate-400 hover:text-slate-600 text-xs px-2 py-1.5"
                >
                  Agora não
                </button>
              </div>
            </div>
            <button onClick={dismissInstall} className="text-slate-300 hover:text-slate-500 flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
