"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import EmpresaCard from "@/components/EmpresaCard";
import EmpresaModal from "@/components/EmpresaModal";
import { getLocalDB, type Empresa } from "@/lib/localdb";

export default function DashboardPage() {
  const router = useRouter();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Empresa | null>(null);

  const loadEmpresas = useCallback(async () => {
    try {
      const db = getLocalDB();
      const lista = await db.empresas.orderBy("criado_em").reverse().toArray();
      setEmpresas(lista);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadEmpresas(); }, [loadEmpresas]);

  const handleSave = async (data: { nome: string; descricao: string; cor: string; emoji: string }) => {
    const db = getLocalDB();
    if (editando?.id) {
      await db.empresas.update(editando.id, data);
    } else {
      await db.empresas.add({ ...data, criado_em: new Date().toISOString() });
    }
    setShowModal(false);
    setEditando(null);
    void loadEmpresas();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Excluir esta empresa e todos os seus dados?")) return;
    const db = getLocalDB();
    // Cascata manual
    const produtos = await db.produtos.where("empresa_id").equals(id).toArray();
    for (const p of produtos) {
      if (p.id) await db.ingredientes.where("produto_id").equals(p.id).delete();
    }
    await db.produtos.where("empresa_id").equals(id).delete();
    await db.gastos_variaveis.where("empresa_id").equals(id).delete();
    await db.catalogo_ingredientes.where("empresa_id").equals(id).delete();
    await db.lancamentos.where("empresa_id").equals(id).delete();
    await db.socios.where("empresa_id").equals(id).delete();
    await db.cargos_funcionarios.where("empresa_id").equals(id).delete();
    await db.estoque.where("empresa_id").equals(id).delete();
    await db.config_empresa.where("empresa_id").equals(id).delete();
    await db.empresas.delete(id);
    void loadEmpresas();
  };

  return (
    <AppShell>
      <div className="p-6 md:p-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">Minhas Empresas</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              {loading ? "Carregando..." : `${empresas.length} empresa${empresas.length !== 1 ? "s" : ""} cadastrada${empresas.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <button
            onClick={() => { setEditando(null); setShowModal(true); }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-sm shadow-indigo-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Nova empresa
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-slate-200 rounded-2xl h-36 animate-pulse" />
            ))}
          </div>
        ) : empresas.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
            <div className="text-6xl mb-4">🏪</div>
            <p className="text-slate-700 font-semibold text-lg mb-1">Nenhuma empresa ainda</p>
            <p className="text-slate-400 text-sm mb-6">Crie sua primeira empresa para começar a precificar</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
            >
              Criar empresa
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {empresas.map((e) => (
              <EmpresaCard
                key={e.id}
                empresa={e as Empresa & { id: number }}
                onClick={() => router.push(`/empresa/${e.id}`)}
                onEdit={() => { setEditando(e); setShowModal(true); }}
                onDelete={() => handleDelete(e.id!)}
              />
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <EmpresaModal
          inicial={editando}
          onClose={() => { setShowModal(false); setEditando(null); }}
          onSave={handleSave}
        />
      )}
    </AppShell>
  );
}
