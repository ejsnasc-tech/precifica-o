"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function CheckIcon() {
  return (
    <svg className="w-5 h-5 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [comprando, setComprando] = useState(false);

  useEffect(() => {
    if (document.cookie.includes("pp_licenca=ok")) {
      router.replace("/dashboard");
    }
  }, [router]);

  async function handleComprar() {
    setComprando(true);
    try {
      const res = await fetch("/api/pagamento/criar", { method: "POST" });
      const data = await res.json() as { url: string };
      window.location.href = data.url;
    } catch {
      setComprando(false);
      alert("Erro ao iniciar pagamento. Tente novamente.");
    }
  }

  const features = [
    { emoji: "🧮", title: "Precificação inteligente", desc: "Calcule o preço ideal considerando ingredientes, funcionários, gastos variáveis e impostos automaticamente." },
    { emoji: "💰", title: "Financeiro empresarial", desc: "DRE, fluxo de caixa, relatórios semanais, mensais e anuais. Gestão de sócios e retiradas." },
    { emoji: "📦", title: "Controle de estoque", desc: "Entradas, saídas, ajustes, alerta de estoque mínimo e controle de validade de produtos." },
    { emoji: "👤", title: "Finanças pessoais", desc: "Lançamentos, cartões de crédito com parcelas, metas de economia e relatórios pessoais." },
    { emoji: "🔒", title: "Dados no seu dispositivo", desc: "Seus dados ficam salvos no navegador. O servidor não armazena nenhuma informação pessoal." },
    { emoji: "📱", title: "Instala como app", desc: "Funciona como PWA: instale no celular ou computador e use offline, sem precisar de internet." },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="font-bold text-white text-sm">Top Precificação</span>
          </div>
          <a href="/ativar" className="text-slate-400 hover:text-white text-sm transition-colors">
            Já tenho um código →
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 pt-20 pb-16 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 rounded-full px-4 py-1.5 text-indigo-400 text-sm font-medium mb-8">
            🇧🇷 Feito para pequenos negócios brasileiros
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-6">
            Precifique certo,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">lucre mais.</span>
          </h1>
          <p className="text-slate-400 text-lg md:text-xl leading-relaxed mb-10 max-w-2xl mx-auto">
            Tudo que você precisa para gerir seu negócio: precificação com impostos, financeiro, estoque e finanças pessoais — num só lugar, sem mensalidades.
          </p>

          {/* Pricing CTA */}
          <div className="flex flex-col items-center gap-4">
            <div className="bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 rounded-3xl px-10 py-8 inline-flex flex-col items-center gap-4 shadow-2xl">
              <div className="text-center">
                <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">Acesso vitalício</p>
                <div className="flex items-end justify-center gap-1">
                  <span className="text-slate-400 text-lg self-start mt-2">R$</span>
                  <span className="text-6xl font-extrabold text-white leading-none">29</span>
                  <span className="text-3xl font-bold text-white self-end mb-1">,90</span>
                </div>
                <p className="text-slate-500 text-xs mt-1">pagamento único — sem mensalidade</p>
              </div>
              <button
                onClick={handleComprar}
                disabled={comprando}
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-70 text-white font-bold px-8 py-4 rounded-2xl text-lg transition-all shadow-lg shadow-indigo-900/50 hover:shadow-indigo-900/70"
              >
                {comprando ? "Aguarde..." : "Comprar agora →"}
              </button>
              <p className="text-slate-500 text-xs text-center">
                Pagamento via Mercado Pago · Pix, cartão ou boleto<br />
                Código enviado por e-mail na hora
              </p>
            </div>
            <a href="/ativar" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
              Já comprei — ativar meu código
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16 border-t border-slate-800">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-3">Tudo que você precisa</h2>
          <p className="text-slate-400 text-center mb-12">Um sistema completo para quem leva o negócio a sério.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <div key={f.title} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-colors">
                <span className="text-3xl mb-3 block">{f.emoji}</span>
                <h3 className="font-bold text-white mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Included */}
      <section className="px-6 py-16 border-t border-slate-800">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-10">O que está incluído no acesso</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left mb-10">
            {[
              "Empresas ilimitadas",
              "Produtos ilimitados",
              "Lançamentos financeiros",
              "Catálogo de ingredientes",
              "Controle de estoque com validade",
              "Gestão de sócios e retiradas",
              "Relatórios semanais, mensais e anuais",
              "Finanças pessoais completas",
              "Metas de economia",
              "Cartões de crédito com parcelas",
              "Exportação de relatórios em PDF",
              "Atualizações gratuitas para sempre",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <CheckIcon />
                <span className="text-slate-300 text-sm">{item}</span>
              </div>
            ))}
          </div>
          <button
            onClick={handleComprar}
            disabled={comprando}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-70 text-white font-bold px-10 py-4 rounded-2xl text-lg transition-all shadow-lg shadow-indigo-900/50"
          >
            {comprando ? "Aguarde..." : "Garantir acesso por R$29,90"}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-6 py-8 text-center">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-slate-600 text-sm">© 2026 Top Precificação · EJSNASC Tech</p>
          <div className="flex gap-6">
            <a href="/privacidade" className="text-slate-600 hover:text-slate-400 text-sm transition-colors">Privacidade</a>
            <a href="/ativar" className="text-slate-600 hover:text-slate-400 text-sm transition-colors">Ativar código</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
