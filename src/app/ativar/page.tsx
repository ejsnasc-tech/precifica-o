"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AtivarPage() {
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const router = useRouter();

  const emailValido = email.includes("@") && email.includes(".");
  const podeSalvar = codigo.trim().length >= 4 && emailValido;

  async function ativar(e: React.FormEvent) {
    e.preventDefault();
    if (!podeSalvar) return;
    setErro("");
    setCarregando(true);
    try {
      const res = await fetch("/api/codigo/verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo, nome: nome.trim(), email: email.trim().toLowerCase() }),
      });
      const data = await res.json() as { erro?: string; expira_em?: string | null };
      if (!res.ok) {
        setErro(data.erro || "Código inválido.");
      } else {
        localStorage.setItem("pp_licenca_expira", data.expira_em ?? "vitalicio");
        router.push("/dashboard");
      }
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🔑</div>
          <h1 className="text-2xl font-black text-gray-900">Ativar acesso</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Digite o código de acesso fornecido pelo seu consultor.
          </p>
        </div>

        <form onSubmit={ativar} className="space-y-4">
          {/* Código */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">Código de acesso</label>
            <input
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="XXXX-XXXX-XXXX"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-center text-lg font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {/* Email */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">
              Seu e-mail <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@email.com"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-gray-400 mt-1">Para contato e suporte. Não enviamos spam.</p>
          </div>

          {/* Nome */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">
              Seu nome <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Como prefere ser chamado"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {erro && (
            <p className="text-red-500 text-sm text-center bg-red-50 rounded-lg px-4 py-2">
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={carregando || !podeSalvar}
            className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {carregando ? "Verificando..." : "Ativar acesso"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Não tem um código?{" "}
          <Link href="/" className="text-indigo-600 font-semibold hover:underline">
            Saiba mais
          </Link>
        </p>
      </div>
    </div>
  );
}
