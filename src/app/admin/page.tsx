"use client";

import { useState } from "react";
import Link from "next/link";

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [codigo, setCodigo] = useState("");
  const [codigoRevogar, setCodigoRevogar] = useState("");
  const [resultado, setResultado] = useState<{ tipo: "gerado" | "revogado" | "erro"; msg: string } | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  async function gerarCodigo() {
    if (!secret.trim()) return;
    setCarregando(true);
    setResultado(null);
    try {
      const res = await fetch("/api/admin/gerar-codigo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });
      const data = await res.json() as { codigo?: string; erro?: string };
      if (!res.ok || data.erro) {
        setResultado({ tipo: "erro", msg: data.erro ?? "Erro ao gerar código." });
      } else {
        setCodigo(data.codigo ?? "");
        setResultado({ tipo: "gerado", msg: data.codigo ?? "" });
      }
    } catch {
      setResultado({ tipo: "erro", msg: "Falha na conexão." });
    } finally {
      setCarregando(false);
    }
  }

  async function revogarCodigo() {
    if (!secret.trim() || !codigoRevogar.trim()) return;
    if (!confirm(`Revogar o código ${codigoRevogar.toUpperCase()}? O acesso do cliente será encerrado.`)) return;
    setCarregando(true);
    setResultado(null);
    try {
      const res = await fetch("/api/admin/revogar-codigo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, codigo: codigoRevogar.trim() }),
      });
      const data = await res.json() as { ok?: boolean; erro?: string };
      if (!res.ok || data.erro) {
        setResultado({ tipo: "erro", msg: data.erro ?? "Erro ao revogar." });
      } else {
        setResultado({ tipo: "revogado", msg: `Código ${codigoRevogar.toUpperCase()} revogado. O cliente perderá acesso na próxima abertura do site.` });
        setCodigoRevogar("");
      }
    } catch {
      setResultado({ tipo: "erro", msg: "Falha na conexão." });
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
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center mb-6">
          <p className="text-3xl mb-2">🔐</p>
          <h1 className="text-xl font-extrabold text-white">Admin — Top Precificação</h1>
          <p className="text-slate-500 text-xs mt-1">Área restrita. Não compartilhe esta URL.</p>
        </div>

        {/* Senha */}
        <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800">
          <label className="text-sm text-slate-400 block mb-1.5">Senha admin</label>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Gerar código */}
        <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 space-y-3">
          <h2 className="text-sm font-bold text-white">✨ Gerar novo código de acesso</h2>
          <button
            onClick={gerarCodigo}
            disabled={carregando || !secret.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition"
          >
            {carregando ? "Gerando..." : "Gerar código"}
          </button>

          {resultado?.tipo === "gerado" && (
            <div className="bg-slate-800 rounded-xl p-4 text-center border border-indigo-500/40">
              <p className="text-xs text-slate-400 mb-2">Código gerado:</p>
              <p className="text-2xl font-extrabold tracking-widest text-indigo-300 font-mono mb-3">
                {resultado.msg}
              </p>
              <div className="flex gap-2">
                <button onClick={copiar}
                  className="flex-1 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg transition">
                  {copiado ? "✅ Copiado!" : "📋 Copiar"}
                </button>
                <Link href="/ativar"
                  className="flex-1 text-sm bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 rounded-lg transition text-center">
                  Ativar agora →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Revogar código (reembolso) */}
        <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 space-y-3">
          <h2 className="text-sm font-bold text-white">🚫 Revogar código <span className="text-slate-500 font-normal">(reembolso)</span></h2>
          <input
            value={codigoRevogar}
            onChange={(e) => setCodigoRevogar(e.target.value.toUpperCase())}
            placeholder="XXXX-XXXX-XXXX"
            className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-500 placeholder-slate-600"
          />
          <button
            onClick={revogarCodigo}
            disabled={carregando || !secret.trim() || !codigoRevogar.trim()}
            className="w-full bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition"
          >
            Revogar acesso
          </button>
        </div>

        {/* Feedback */}
        {resultado?.tipo === "erro" && (
          <p className="text-rose-400 text-sm bg-rose-950/60 rounded-xl px-4 py-3 border border-rose-800/50">{resultado.msg}</p>
        )}
        {resultado?.tipo === "revogado" && (
          <p className="text-emerald-400 text-sm bg-emerald-950/60 rounded-xl px-4 py-3 border border-emerald-800/50">{resultado.msg}</p>
        )}
      </div>
    </div>
  );
}
