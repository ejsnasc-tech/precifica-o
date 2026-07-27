"use client";

import { useState } from "react";
import Link from "next/link";

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  async function gerarCodigo() {
    if (!secret.trim()) return;
    setCarregando(true);
    setErro("");
    setCodigo("");
    try {
      const res = await fetch("/api/admin/gerar-codigo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });
      const data = await res.json() as { codigo?: string; erro?: string };
      if (!res.ok || data.erro) {
        setErro(data.erro ?? "Erro ao gerar código.");
      } else {
        setCodigo(data.codigo ?? "");
      }
    } catch {
      setErro("Falha na conexão.");
    } finally {
      setCarregando(false);
    }
  }

  async function copiar() {
    await navigator.clipboard.writeText(codigo);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-3xl mb-2">🔐</p>
          <h1 className="text-xl font-extrabold text-white">Admin — Gerar Código</h1>
          <p className="text-slate-400 text-sm mt-1">Área restrita. Não compartilhe esta URL.</p>
        </div>

        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-4">
          <div>
            <label className="text-sm text-slate-400 block mb-1.5">Senha admin</label>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && gerarCodigo()}
              placeholder="••••••••"
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {erro && (
            <p className="text-rose-400 text-sm bg-rose-950/50 rounded-lg px-3 py-2">{erro}</p>
          )}

          <button
            onClick={gerarCodigo}
            disabled={carregando || !secret.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition"
          >
            {carregando ? "Gerando..." : "✨ Gerar novo código"}
          </button>

          {codigo && (
            <div className="mt-2 bg-slate-800 rounded-xl p-4 text-center border border-indigo-500/40">
              <p className="text-xs text-slate-400 mb-2">Código gerado:</p>
              <p className="text-2xl font-extrabold tracking-widest text-indigo-300 font-mono mb-3">
                {codigo}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={copiar}
                  className="flex-1 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg transition"
                >
                  {copiado ? "✅ Copiado!" : "📋 Copiar"}
                </button>
                <Link
                  href="/ativar"
                  className="flex-1 text-sm bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 rounded-lg transition text-center"
                >
                  Ativar agora →
                </Link>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          A senha é definida pela variável de ambiente <code className="text-slate-500">ADMIN_SECRET</code> no Cloudflare Workers.
        </p>
      </div>
    </div>
  );
}
