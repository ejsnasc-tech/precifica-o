"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import AppShell from "@/components/AppShell";

interface Empresa { id: number; nome: string; descricao: string; cor: string; emoji: string; }
interface ItemEstoque {
  id: number; empresa_id: number; nome: string; unidade: string;
  quantidade_atual: number; quantidade_minima: number; custo_unitario: number;
}
interface Movimento { id: number; estoque_id: number; tipo: string; quantidade: number; observacao: string | null; criado_at: string; }

type AbaType = "lista" | "novo";
type TipoMov = "entrada" | "saida" | "ajuste";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const emptyForm = { nome: "", unidade: "un", quantidade_atual: "", quantidade_minima: "", custo_unitario: "" };

export default function EstoquePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [itens, setItens] = useState<ItemEstoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState<AbaType>("lista");
  const [form, setForm] = useState(emptyForm);
  const [salvando, setSalvando] = useState(false);
  const [editando, setEditando] = useState<ItemEstoque | null>(null);

  // movimento
  const [movItem, setMovItem] = useState<ItemEstoque | null>(null);
  const [movTipo, setMovTipo] = useState<TipoMov>("entrada");
  const [movQtd, setMovQtd] = useState("");
  const [movObs, setMovObs] = useState("");
  const [movHistorico, setMovHistorico] = useState<Movimento[]>([]);
  const [salvandoMov, setSalvandoMov] = useState(false);

  // busca
  const [busca, setBusca] = useState("");

  const load = useCallback(async () => {
    const [eRes, iRes] = await Promise.all([
      fetch("/api/empresas"),
      fetch(`/api/estoque?empresaId=${id}`),
    ]);
    if (eRes.status === 401) { router.push("/login"); return; }
    const empresas = await eRes.json() as Empresa[];
    const e = empresas.find((x) => x.id === Number(id));
    if (!e) { router.push("/dashboard"); return; }
    setEmpresa(e);
    setItens(await iRes.json() as ItemEstoque[]);
    setLoading(false);
  }, [id, router]);

  useEffect(() => { void load(); }, [load]);

  async function loadHistorico(item: ItemEstoque) {
    const res = await fetch(`/api/estoque-movimentos?estoqueId=${item.id}`);
    setMovHistorico(await res.json() as Movimento[]);
  }

  async function salvar() {
    if (!form.nome.trim()) return;
    setSalvando(true);
    const body = {
      empresa_id: Number(id),
      nome: form.nome.trim(),
      unidade: form.unidade,
      quantidade_atual: parseFloat(form.quantidade_atual) || 0,
      quantidade_minima: parseFloat(form.quantidade_minima) || 0,
      custo_unitario: parseFloat(form.custo_unitario) || 0,
    };
    if (editando) {
      await fetch(`/api/estoque/${editando.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      await fetch("/api/estoque", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    setForm(emptyForm); setEditando(null); setSalvando(false); setAba("lista");
    void load();
  }

  async function deletar(item: ItemEstoque) {
    if (!confirm(`Excluir "${item.nome}" do estoque?`)) return;
    await fetch(`/api/estoque/${item.id}`, { method: "DELETE" });
    if (movItem?.id === item.id) setMovItem(null);
    void load();
  }

  async function registrarMovimento() {
    if (!movItem || !movQtd) return;
    setSalvandoMov(true);
    const updated = await fetch("/api/estoque-movimentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estoque_id: movItem.id, tipo: movTipo, quantidade: parseFloat(movQtd), observacao: movObs || null }),
    });
    const updatedItem = await updated.json() as ItemEstoque;
    setItens((prev) => prev.map((i) => i.id === updatedItem.id ? updatedItem : i));
    setMovItem(updatedItem);
    setMovQtd(""); setMovObs("");
    setSalvandoMov(false);
    void loadHistorico(updatedItem);
  }

  function iniciarEdicao(item: ItemEstoque) {
    setEditando(item);
    setForm({
      nome: item.nome, unidade: item.unidade,
      quantidade_atual: String(item.quantidade_atual),
      quantidade_minima: String(item.quantidade_minima),
      custo_unitario: String(item.custo_unitario),
    });
    setAba("novo");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const itensFiltrados = itens.filter((i) => i.nome.toLowerCase().includes(busca.toLowerCase()));
  const abaixoMinimo = itens.filter((i) => i.quantidade_atual <= i.quantidade_minima && i.quantidade_minima > 0);
  const valorTotalEstoque = itens.reduce((acc, i) => acc + i.quantidade_atual * i.custo_unitario, 0);

  if (!empresa) return (
    <AppShell>
      <div className="flex items-center justify-center h-64 text-slate-400">Carregando...</div>
    </AppShell>
  );

  return (
    <AppShell>
      <div className="min-h-full bg-slate-50">
        {/* Header */}
        <div className={`bg-gradient-to-r ${empresa.cor} p-5 shadow-md`}>
          <div className="max-w-5xl mx-auto flex items-center gap-4">
            <button onClick={() => router.push(`/empresa/${id}`)} className="text-white/70 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <p className="text-white/60 text-xs font-medium">{empresa.emoji} {empresa.nome}</p>
              <h1 className="text-xl font-extrabold text-white">📦 Estoque</h1>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto p-6">
          {/* KPIs */}
          {!loading && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-2xl shadow-sm p-4 border border-slate-100">
                <p className="text-xs text-slate-400 font-semibold uppercase">Itens cadastrados</p>
                <p className="text-3xl font-extrabold text-slate-800 mt-1">{itens.length}</p>
              </div>
              <div className={`rounded-2xl shadow-sm p-4 border ${abaixoMinimo.length > 0 ? "bg-red-50 border-red-200" : "bg-white border-slate-100"}`}>
                <p className={`text-xs font-semibold uppercase ${abaixoMinimo.length > 0 ? "text-red-500" : "text-slate-400"}`}>Abaixo do mínimo</p>
                <p className={`text-3xl font-extrabold mt-1 ${abaixoMinimo.length > 0 ? "text-red-600" : "text-slate-800"}`}>{abaixoMinimo.length}</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-4 border border-slate-100 col-span-2 md:col-span-1">
                <p className="text-xs text-slate-400 font-semibold uppercase">Valor em estoque</p>
                <p className="text-2xl font-extrabold text-emerald-600 mt-1">{fmt(valorTotalEstoque)}</p>
              </div>
            </div>
          )}

          {/* Alertas */}
          {abaixoMinimo.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-bold text-red-700 text-sm">Estoque baixo!</p>
                <p className="text-red-600 text-xs mt-1">{abaixoMinimo.map((i) => i.nome).join(", ")}</p>
              </div>
            </div>
          )}

          {/* Abas */}
          <div className="flex gap-2 mb-6">
            {([["lista", `📋 Itens (${itens.length})`], ["novo", editando ? "✏️ Editar item" : "➕ Novo item"]] as const).map(([key, label]) => (
              <button key={key} onClick={() => { setAba(key); if (key === "lista") { setEditando(null); setForm(emptyForm); } }}
                className={`px-5 py-2 rounded-xl font-semibold text-sm transition-colors ${aba === key ? "bg-white shadow text-slate-800" : "text-slate-500 hover:bg-white/60"}`}>
                {label}
              </button>
            ))}
          </div>

          {/* ABA: LISTA */}
          {aba === "lista" && (
            <div className="space-y-4">
              <div className="flex gap-3 items-center">
                <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar item..."
                  className="flex-1 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>

              {loading ? (
                <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="bg-slate-200 rounded-2xl h-24 animate-pulse" />)}</div>
              ) : itensFiltrados.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm p-16 text-center border border-slate-100">
                  <p className="text-5xl mb-4">📦</p>
                  <p className="text-slate-700 font-semibold text-lg mb-1">Nenhum item no estoque</p>
                  <p className="text-slate-400 text-sm mb-6">Adicione itens para controlar seu estoque</p>
                  <button onClick={() => setAba("novo")} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors">+ Adicionar item</button>
                </div>
              ) : (
                <div className="space-y-3">
                  {itensFiltrados.map((item) => {
                    const abaixo = item.quantidade_minima > 0 && item.quantidade_atual <= item.quantidade_minima;
                    const isMovOpen = movItem?.id === item.id;
                    return (
                      <div key={item.id} className={`bg-white rounded-2xl shadow-sm border transition-all ${abaixo ? "border-red-200" : "border-slate-100"}`}>
                        <div className="p-4 flex items-center gap-4 flex-wrap">
                          {/* Status indicator */}
                          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${abaixo ? "bg-red-500" : item.quantidade_atual > item.quantidade_minima * 2 ? "bg-emerald-500" : "bg-amber-400"}`} />

                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-800">{item.nome}</p>
                            <p className="text-sm text-slate-400">
                              Mínimo: {item.quantidade_minima} {item.unidade} · Custo: {fmt(item.custo_unitario)}/{item.unidade}
                            </p>
                          </div>

                          <div className="text-right flex-shrink-0">
                            <p className={`text-2xl font-extrabold ${abaixo ? "text-red-600" : "text-slate-800"}`}>
                              {item.quantidade_atual}
                            </p>
                            <p className="text-xs text-slate-400">{item.unidade}</p>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => { setMovItem(isMovOpen ? null : item); if (!isMovOpen) { setMovQtd(""); setMovObs(""); setMovTipo("entrada"); void loadHistorico(item); } }}
                              className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors ${isMovOpen ? "bg-slate-200 text-slate-700" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"}`}
                            >
                              {isMovOpen ? "Fechar" : "Movimentar"}
                            </button>
                            <button onClick={() => iniciarEdicao(item)} className="bg-amber-100 text-amber-700 hover:bg-amber-200 px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors">✏️</button>
                            <button onClick={() => deletar(item)} className="text-slate-300 hover:text-red-500 px-2 py-1.5 rounded-xl text-sm transition-colors">🗑️</button>
                          </div>
                        </div>

                        {/* Painel de movimentação */}
                        {isMovOpen && (
                          <div className="border-t border-slate-100 p-4 bg-slate-50 rounded-b-2xl space-y-4">
                            <div className="flex gap-2">
                              {(["entrada", "saida", "ajuste"] as TipoMov[]).map((t) => (
                                <button key={t} onClick={() => setMovTipo(t)}
                                  className={`flex-1 py-2 rounded-xl text-sm font-semibold capitalize transition-colors ${movTipo === t
                                    ? t === "entrada" ? "bg-emerald-500 text-white" : t === "saida" ? "bg-red-500 text-white" : "bg-blue-500 text-white"
                                    : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200"}`}>
                                  {t === "entrada" ? "⬆️ Entrada" : t === "saida" ? "⬇️ Saída" : "🔄 Ajuste"}
                                </button>
                              ))}
                            </div>
                            <div className="flex gap-3">
                              <input type="number" step="0.01" value={movQtd} onChange={(e) => setMovQtd(e.target.value)}
                                placeholder={`Quantidade (${item.unidade})`}
                                className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                              <input value={movObs} onChange={(e) => setMovObs(e.target.value)} placeholder="Observação (opcional)"
                                className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                              <button onClick={registrarMovimento} disabled={salvandoMov || !movQtd}
                                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors">
                                {salvandoMov ? "..." : "Registrar"}
                              </button>
                            </div>

                            {/* Histórico */}
                            {movHistorico.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Últimas movimentações</p>
                                <div className="space-y-1.5">
                                  {movHistorico.slice(0, 8).map((m) => (
                                    <div key={m.id} className="flex items-center gap-3 text-sm bg-white rounded-xl px-3 py-2 border border-slate-100">
                                      <span className={`font-bold text-xs px-2 py-0.5 rounded-lg ${m.tipo === "entrada" ? "bg-emerald-100 text-emerald-700" : m.tipo === "saida" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                                        {m.tipo === "entrada" ? "⬆️" : m.tipo === "saida" ? "⬇️" : "🔄"} {m.tipo}
                                      </span>
                                      <span className="font-bold text-slate-800">{m.quantidade} {item.unidade}</span>
                                      {m.observacao && <span className="text-slate-400 text-xs truncate">{m.observacao}</span>}
                                      <span className="text-slate-300 text-xs ml-auto">{new Date(m.criado_at).toLocaleDateString("pt-BR")}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ABA: NOVO / EDITAR */}
          {aba === "novo" && (
            <div className="max-w-xl">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
                <h2 className="text-lg font-bold text-slate-800">{editando ? "✏️ Editar item" : "➕ Novo item no estoque"}</h2>

                <div>
                  <label className="text-sm font-semibold text-slate-600 block mb-1">Nome do item</label>
                  <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Farinha de trigo"
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-600 block mb-1">Unidade</label>
                    <select value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })}
                      className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-400">
                      {["un","kg","g","L","ml","cx","pc","saco","fardo"].map((u) => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-600 block mb-1">Custo unitário (R$)</label>
                    <input type="number" step="0.01" value={form.custo_unitario} onChange={(e) => setForm({ ...form, custo_unitario: e.target.value })} placeholder="0,00"
                      className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-600 block mb-1">Quantidade atual</label>
                    <input type="number" step="0.01" value={form.quantidade_atual} onChange={(e) => setForm({ ...form, quantidade_atual: e.target.value })} placeholder="0"
                      className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-600 block mb-1">Estoque mínimo</label>
                    <input type="number" step="0.01" value={form.quantidade_minima} onChange={(e) => setForm({ ...form, quantidade_minima: e.target.value })} placeholder="0"
                      className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                    <p className="text-xs text-slate-400 mt-1">Alerta vermelho quando atingir esse valor</p>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={salvar} disabled={salvando || !form.nome.trim()}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors">
                    {salvando ? "Salvando..." : editando ? "💾 Salvar alterações" : "➕ Adicionar ao estoque"}
                  </button>
                  {editando && (
                    <button onClick={() => { setEditando(null); setForm(emptyForm); setAba("lista"); }}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-3 rounded-xl transition-colors">
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
