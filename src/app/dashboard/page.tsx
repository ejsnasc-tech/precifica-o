"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import EmpresaCard from "@/components/EmpresaCard";
import EmpresaModal from "@/components/EmpresaModal";

interface Empresa {
  id: number;
  nome: string;
  descricao: string;
  cor: string;
  emoji: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Empresa | null>(null);

  const loadEmpresas = useCallback(async () => {
    try {
      const res = await fetch("/api/empresas");
      if (res.status === 401) { router.push("/login"); return; }
      const data = await res.json();
      setEmpresas(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [router]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadEmpresas(); }, [loadEmpresas]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const handleSave = async (data: Omit<Empresa, "id">) => {
    if (editando) {
      await fetch(`/api/empresas/${editando.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } else {
      await fetch("/api/empresas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    }
    setShowModal(false);
    setEditando(null);
    void loadEmpresas();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Excluir esta empresa e todos os seus dados?")) return;
    await fetch(`/api/empresas/${id}`, { method: "DELETE" });
    void loadEmpresas();
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">💰</span>
          <span className="font-bold text-zinc-800 text-lg">Precificação Pro</span>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-zinc-500 hover:text-zinc-700"
        >
          Sair
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-zinc-800">Minhas Empresas</h1>
          <button
            onClick={() => { setEditando(null); setShowModal(true); }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
          >
            + Nova empresa
          </button>
        </div>

        {loading ? (
          <div className="text-center text-zinc-400 py-16">Carregando...</div>
        ) : empresas.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🏪</div>
            <p className="text-zinc-500 mb-4">Nenhuma empresa cadastrada ainda.</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
            >
              Criar minha primeira empresa
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {empresas.map((e) => (
              <EmpresaCard
                key={e.id}
                empresa={e}
                onClick={() => router.push(`/empresa/${e.id}`)}
                onEdit={() => { setEditando(e); setShowModal(true); }}
                onDelete={() => handleDelete(e.id)}
              />
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <EmpresaModal
          inicial={editando}
          onClose={() => { setShowModal(false); setEditando(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
