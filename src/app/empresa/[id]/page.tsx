"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getLocalDB, type Empresa } from "@/lib/localdb";

const MODULOS = [
  {
    key: "precificacao",
    icon: "🧮",
    titulo: "Precificação",
    desc: "Calcule o preço ideal dos seus produtos com ingredientes, margens e impostos",
    gradient: "from-orange-500 to-red-500",
    shadow: "shadow-orange-200",
    textColor: "text-orange-600",
  },
  {
    key: "financeiro",
    icon: "💰",
    titulo: "Financeiro",
    desc: "DRE, fluxo de caixa, receitas, despesas e relatórios gerenciais",
    gradient: "from-blue-500 to-indigo-600",
    shadow: "shadow-blue-200",
    textColor: "text-blue-600",
  },
  {
    key: "estoque",
    icon: "📦",
    titulo: "Estoque",
    desc: "Controle entradas e saídas, defina estoque mínimo e evite rupturas",
    gradient: "from-emerald-500 to-teal-600",
    shadow: "shadow-emerald-200",
    textColor: "text-emerald-600",
  },
];

export default function EmpresaHubPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [empresa, setEmpresa] = useState<Empresa | null>(null);

  const load = useCallback(async () => {
    const db = getLocalDB();
    const e = await db.empresas.get(Number(id));
    if (!e) { router.push("/dashboard"); return; }
    setEmpresa(e);
  }, [id, router]);

  useEffect(() => { void load(); }, [load]);

  if (!empresa) return (
    <AppShell>
      <div className="flex items-center justify-center h-64 text-slate-400">Carregando...</div>
    </AppShell>
  );

  return (
    <AppShell>
      <div className="min-h-full bg-slate-50">
        <div className={`bg-gradient-to-r ${empresa.cor} px-6 py-8 shadow-md`}>
          <div className="max-w-4xl mx-auto">
            <p className="text-white/60 text-sm font-medium mb-1">Empresa</p>
            <h1 className="text-3xl font-extrabold text-white">{empresa.emoji} {empresa.nome}</h1>
            {empresa.descricao && <p className="text-white/70 text-sm mt-1">{empresa.descricao}</p>}
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-6 md:p-8">
          <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-5">Módulos disponíveis</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {MODULOS.map((m) => (
              <button
                key={m.key}
                onClick={() => router.push(`/empresa/${id}/${m.key}`)}
                className={`group text-left bg-white rounded-2xl shadow-sm hover:shadow-lg ${m.shadow} border border-slate-100 p-6 transition-all duration-200 hover:-translate-y-1`}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${m.gradient} flex items-center justify-center text-2xl mb-4 shadow-md`}>
                  {m.icon}
                </div>
                <h2 className="text-lg font-bold text-slate-800 mb-1">{m.titulo}</h2>
                <p className="text-sm text-slate-500 leading-relaxed">{m.desc}</p>
                <div className={`mt-4 flex items-center gap-1 text-sm font-semibold ${m.textColor}`}>
                  Acessar
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
