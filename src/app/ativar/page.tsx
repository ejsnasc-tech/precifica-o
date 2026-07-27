"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AtivarPage() {
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const router = useRouter();

  async function ativar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      const res = await fetch("/api/codigo/verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo }),
      });
      const data = await res.json() as { erro?: string; expira_em?: string | null };
      if (!res.ok) {
        setErro(data.erro || "Código inválido.");
      } else {
        // Salva expiração no dispositivo para funcionar offline também
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
          <input
            type="text"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            placeholder="Ex: ABCD-1234-EFGH"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-center text-lg font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
            autoComplete="off"
            spellCheck={false}
          />

          {erro && (
            <p className="text-red-500 text-sm text-center bg-red-50 rounded-lg px-4 py-2">
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={carregando || codigo.trim().length < 4}
            className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {carregando ? "Verificando..." : "Ativar"}
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
