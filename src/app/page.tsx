"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const features = [
  { emoji: "🧮", title: "Precificação inteligente", desc: "Calcule o preço ideal com ingredientes, funcionários, impostos e gastos variáveis automaticamente." },
  { emoji: "💰", title: "Financeiro empresarial", desc: "DRE, fluxo de caixa e relatórios mensais/anuais. Gestão de sócios e retiradas." },
  { emoji: "📦", title: "Controle de estoque", desc: "Entradas, saídas, alerta de mínimo e controle de validade de produtos." },
  { emoji: "👤", title: "Finanças pessoais", desc: "Lançamentos, cartões de crédito com parcelas, metas de economia e relatórios." },
  { emoji: "🔒", title: "Seus dados, no seu celular", desc: "Nenhum dado vai para o servidor. Tudo fica salvo no seu próprio dispositivo." },
  { emoji: "✈️", title: "Funciona sem internet", desc: "Após instalar, use o app offline normalmente. Internet só na primeira vez." },
];

type Plataforma = "android" | "ios" | "desktop";

const passos: Record<Plataforma, { titulo: string; icone: string; steps: string[] }> = {
  android: {
    titulo: "Android",
    icone: "🤖",
    steps: [
      "Abra o site no Google Chrome",
      "Toque nos 3 pontinhos (⋮) no canto superior direito",
      'Toque em "Adicionar à tela inicial" ou "Instalar app"',
      "Confirme e o ícone aparece na sua tela inicial",
    ],
  },
  ios: {
    titulo: "iPhone / iPad",
    icone: "🍎",
    steps: [
      "Abra o site no Safari (não funciona em outros navegadores no iOS)",
      'Toque no ícone de compartilhar (□↑) na barra inferior',
      'Role a lista e toque em "Adicionar à Tela de Início"',
      "Confirme e o ícone aparece igual a um app normal",
    ],
  },
  desktop: {
    titulo: "Computador",
    icone: "💻",
    steps: [
      "Abra o site no Google Chrome ou Microsoft Edge",
      'Clique no ícone de instalar (⊕) na barra de endereços — ou vá em Menu → "Instalar Top Precificação"',
      "Confirme a instalação",
      "O app abre em janela própria, sem barra do navegador",
    ],
  },
};

export default function LandingPage() {
  const router = useRouter();
  const [plataforma, setPlataforma] = useState<Plataforma>("android");

  useEffect(() => {
    // Redireciona quem já tem licença ativa
    if (document.cookie.includes("pp_licenca=")) {
      router.replace("/dashboard");
    }
    // Detecta plataforma para pré-selecionar a aba
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) setPlataforma("ios");
    else if (/android/.test(ua)) setPlataforma("android");
    else setPlataforma("desktop");
  }, [router]);

  const p = passos[plataforma];

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* Header */}
      <header className="border-b border-slate-800/60 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="font-bold text-white text-sm">Top Precificação</span>
          </div>
          <Link href="/ativar" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
            Já tenho um código →
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 pt-20 pb-14 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/25 rounded-full px-4 py-1.5 text-indigo-400 text-xs font-semibold mb-7 tracking-wide uppercase">
            🇧🇷 Para pequenos negócios brasileiros
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-5">
            Precifique certo,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">lucre mais.</span>
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed mb-8">
            Sistema completo de gestão para pequenos negócios: precificação, financeiro, estoque e finanças pessoais — num só lugar, sem mensalidade, instalado no seu celular.
          </p>
          <div className="flex items-center justify-center gap-3 text-slate-500 text-sm">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span> Funciona offline</span>
            <span>·</span>
            <span>Dados só no seu dispositivo</span>
            <span>·</span>
            <span>Sem mensalidade</span>
          </div>
        </div>
      </section>

      {/* Instalação */}
      <section className="px-6 py-14 border-t border-slate-800/60">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-2">Como instalar</h2>
          <p className="text-slate-400 text-center text-sm mb-8">
            Instale como um app — funciona no celular e no computador, sem precisar de loja de aplicativos.
          </p>

          {/* Abas de plataforma */}
          <div className="flex gap-2 mb-6 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
            {(Object.keys(passos) as Plataforma[]).map((key) => (
              <button key={key} onClick={() => setPlataforma(key)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${plataforma === key ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"}`}>
                {passos[key].icone} {passos[key].titulo}
              </button>
            ))}
          </div>

          {/* Passos */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            {p.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-4">
                <span className="w-7 h-7 rounded-full bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-slate-300 text-sm leading-relaxed">{step}</p>
              </div>
            ))}
            <div className="pt-2 border-t border-slate-800 mt-4">
              <p className="text-slate-500 text-xs">
                {plataforma === "ios"
                  ? "⚠️ No iPhone, use obrigatoriamente o Safari. Chrome e outros navegadores não suportam instalação de PWA no iOS."
                  : plataforma === "android"
                  ? "💡 Após instalar, o app abre em tela cheia, igual a um aplicativo baixado da Play Store."
                  : "💡 Após instalar, o app abre em janela própria, sem barra do navegador, como qualquer programa instalado."}
              </p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link href="/ativar"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-3.5 rounded-2xl text-sm transition-all shadow-lg shadow-indigo-900/40">
              Já recebi meu código — ativar agora →
            </Link>
          </div>
        </div>
      </section>

      {/* Funcionalidades */}
      <section className="px-6 py-14 border-t border-slate-800/60">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-2">Tudo que você precisa</h2>
          <p className="text-slate-400 text-center text-sm mb-10">Um sistema completo para quem leva o negócio a sério.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <div key={f.title} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-indigo-800/50 transition-colors">
                <span className="text-3xl mb-3 block">{f.emoji}</span>
                <h3 className="font-bold text-white mb-2 text-sm">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 px-6 py-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-slate-600 text-sm">© 2026 Top Precificação · EJSNASC Tech</p>
          <div className="flex gap-6">
            <Link href="/privacidade" className="text-slate-600 hover:text-slate-400 text-sm transition-colors">Privacidade</Link>
            <Link href="/ativar" className="text-slate-600 hover:text-slate-400 text-sm transition-colors">Ativar código</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
