"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CadastroPage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSenha, setShowSenha] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, senha }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setErro(data.error ?? "Erro ao cadastrar."); return; }
      router.push("/dashboard");
    } catch { setErro("Erro de conexão."); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex">
      {/* Painel esquerdo */}
      <div className="hidden md:flex flex-col justify-between w-1/2 bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-700 p-12 text-white">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="font-bold text-base">Precificação Pro</p>
        </div>

        <div>
          <h2 className="text-4xl font-extrabold leading-tight mb-4">
            Comece agora.<br />É gratuito. 🚀
          </h2>
          <p className="text-white/70 text-base leading-relaxed mb-8">
            Cadastre sua empresa, defina suas configurações e comece a precificar seus produtos com confiança.
          </p>

          <div className="space-y-3">
            {[
              { icon: "✅", label: "Cadastro gratuito, sem cartão" },
              { icon: "🔒", label: "Seus dados são privados e seguros" },
              { icon: "📱", label: "Acesse de qualquer dispositivo" },
            ].map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-lg">{icon}</span>
                <p className="text-white/80 text-sm">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/40 text-xs">© 2025 Precificação Pro</p>
      </div>

      {/* Painel direito */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-3 mb-8 md:hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="font-bold text-slate-800">Precificação Pro</p>
          </div>

          <h1 className="text-2xl font-extrabold text-slate-800 mb-1">Crie sua conta</h1>
          <p className="text-slate-400 text-sm mb-8">Gratuito. Sem cartão de crédito.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Nome</label>
              <input
                type="text" value={nome} onChange={(e) => setNome(e.target.value)}
                required minLength={2} placeholder="Seu nome"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 transition-shadow"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">E-mail</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                required placeholder="seu@email.com"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 transition-shadow"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showSenha ? "text" : "password"} value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required minLength={6} placeholder="Mínimo 6 caracteres"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 pr-11 text-slate-800 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 transition-shadow"
                />
                <button
                  type="button" onClick={() => setShowSenha((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showSenha ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {erro && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {erro}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors text-sm shadow-sm shadow-indigo-200 mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Criando conta...
                </span>
              ) : "Criar conta grátis"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-6">
            Já tem conta?{" "}
            <Link href="/login" className="text-indigo-600 font-semibold hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
