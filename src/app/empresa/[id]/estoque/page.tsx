"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import AppShell from "@/components/AppShell";

interface Empresa { id: number; nome: string; descricao: string; cor: string; emoji: string; }
interface ItemEstoque {
  id: number; empresa_id: number; nome: string; unidade: string;
  quantidade_atual: number; quantidade_minima: number; custo_unitario: number;
  tem_validade: number; dias_alerta: number;
}
interface Movimento {
  id: number; estoque_id: number; tipo: string; quantidade: number;
  observacao: string | null; data_validade: string | null; criado_at: string;
}

type AbaType = "lista" | "novo";
type TipoMov = "entrada" | "saida" | "ajuste";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const emptyForm = { nome: "", unidade: "un", quantidade_atual: "", quantidade_minima: "", custo_unitario: "", tem_validade: false, dias_alerta: "7", data_validade_inicial: "" };

function diasParaVencer(dataValidade: string): number {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const vence = new Date(dataValidade + "T00:00:00");
  return Math.ceil((vence.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

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

  // painel de movimentação aberto
  const [movItem, setMovItem] = useState<ItemEstoque | null>(null);
  const [movTipo, setMovTipo] = useState<TipoMov>("entrada");
  const [movQtd, setMovQtd] = useState("");
  const [movObs, setMovObs] = useState("");
  const [movValidade, setMovValidade] = useState("");
  const [movHistorico, setMovHistorico] = useState<Movimento[]>([]);
  const [salvandoMov, setSalvandoMov] = useState(false);

  // painel rápido de retirada
  const [retiradaItem, setRetiradaItem] = useState<ItemEstoque | null>(null);
  const [retiradaQtd, setRetiradaQtd] = useState("");
  const [retiradaObs, setRetiradaObs] = useState("");
  const [salvandoRetirada, setSalvandoRetirada] = useState(false);

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
    const qtdAtual = parseFloat(form.quantidade_atual) || 0;
    const body = {
      empresa_id: Number(id), nome: form.nome.trim(), unidade: form.unidade,
      quantidade_atual: qtdAtual,
      quantidade_minima: parseFloat(form.quantidade_minima) || 0,
      custo_unitario: parseFloat(form.custo_unitario) || 0,
      tem_validade: form.tem_validade ? 1 : 0,
      dias_alerta: parseInt(form.dias_alerta) || 7,
    };
    if (editando) {
      await fetch(`/api/estoque/${editando.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      const res = await fetch("/api/estoque", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const created = await res.json() as { id: number };
      // se tem validade ativa e quantidade inicial > 0, registra o movimento de entrada com a data
      if (form.tem_validade && qtdAtual > 0) {
        await fetch("/api/estoque-movimentos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            estoque_id: created.id, tipo: "entrada", quantidade: qtdAtual,
            observacao: "Estoque inicial",
            data_validade: form.data_validade_inicial || null,
          }),
        });
      }
    }
    setForm(emptyForm); setEditando(null); setSalvando(false); setAba("lista");
    void load();
  }

  async function deletar(item: ItemEstoque) {
    if (!confirm(`Excluir "${item.nome}" do estoque?`)) return;
    await fetch(`/api/estoque/${item.id}`, { method: "DELETE" });
    if (movItem?.id === item.id) setMovItem(null);
    if (retiradaItem?.id === item.id) setRetiradaItem(null);
    void load();
  }

  async function registrarMovimento() {
    if (!movItem || !movQtd) return;
    setSalvandoMov(true);
    const res = await fetch("/api/estoque-movimentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        estoque_id: movItem.id, tipo: movTipo,
        quantidade: parseFloat(movQtd),
        observacao: movObs || null,
        data_validade: (movTipo === "entrada" && movItem.tem_validade && movValidade) ? movValidade : null,
      }),
    });
    const updatedItem = await res.json() as ItemEstoque;
    setItens((prev) => prev.map((i) => i.id === updatedItem.id ? { ...i, ...updatedItem } : i));
    setMovItem({ ...movItem, quantidade_atual: updatedItem.quantidade_atual });
    setMovQtd(""); setMovObs(""); setMovValidade("");
    setSalvandoMov(false);
    void loadHistorico({ ...movItem, quantidade_atual: updatedItem.quantidade_atual });
  }

  async function registrarRetirada() {
    if (!retiradaItem || !retiradaQtd) return;
    setSalvandoRetirada(true);
    const res = await fetch("/api/estoque-movimentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        estoque_id: retiradaItem.id, tipo: "saida",
        quantidade: parseFloat(retiradaQtd),
        observacao: retiradaObs || null,
        data_validade: null,
      }),
    });
    const updatedItem = await res.json() as ItemEstoque;
    setItens((prev) => prev.map((i) => i.id === updatedItem.id ? { ...i, ...updatedItem } : i));
    setRetiradaQtd(""); setRetiradaObs(""); setRetiradaItem(null);
    setSalvandoRetirada(false);
  }

  function iniciarEdicao(item: ItemEstoque) {
    setEditando(item);
    setForm({
      nome: item.nome, unidade: item.unidade,
      quantidade_atual: String(item.quantidade_atual),
      quantidade_minima: String(item.quantidade_minima),
      custo_unitario: String(item.custo_unitario),
      tem_validade: item.tem_validade === 1,
      dias_alerta: String(item.dias_alerta ?? 7),
      data_validade_inicial: "",
    });
    setAba("novo");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Alertas de validade: busca movimentos com data_validade próxima
  const [alertasValidade, setAlertasValidade] = useState<{ item: ItemEstoque; mov: Movimento }[]>([]);

  useEffect(() => {
    const itensComValidade = itens.filter((i) => i.tem_validade === 1);
    if (itensComValidade.length === 0) { setAlertasValidade([]); return; }
    Promise.all(itensComValidade.map(async (item) => {
      const res = await fetch(`/api/estoque-movimentos?estoqueId=${item.id}`);
      const movs = await res.json() as Movimento[];
      return movs
        .filter((m) => m.tipo === "entrada" && m.data_validade)
        .filter((m) => {
          const dias = diasParaVencer(m.data_validade!);
          return dias <= (item.dias_alerta ?? 7) && dias >= 0;
        })
        .map((m) => ({ item, mov: m }));
    })).then((results) => setAlertasValidade(results.flat()));
  }, [itens]);

  const itensFiltrados = itens.filter((i) => i.nome.toLowerCase().includes(busca.toLowerCase()));
  const abaixoMinimo = itens.filter((i) => i.quantidade_minima > 0 && i.quantidade_atual <= i.quantidade_minima);
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-2xl shadow-sm p-4 border border-slate-100">
                <p className="text-xs text-slate-400 font-semibold uppercase">Itens</p>
                <p className="text-3xl font-extrabold text-slate-800 mt-1">{itens.length}</p>
              </div>
              <div className={`rounded-2xl shadow-sm p-4 border ${abaixoMinimo.length > 0 ? "bg-red-50 border-red-200" : "bg-white border-slate-100"}`}>
                <p className={`text-xs font-semibold uppercase ${abaixoMinimo.length > 0 ? "text-red-500" : "text-slate-400"}`}>Estoque baixo</p>
                <p className={`text-3xl font-extrabold mt-1 ${abaixoMinimo.length > 0 ? "text-red-600" : "text-slate-800"}`}>{abaixoMinimo.length}</p>
              </div>
              <div className={`rounded-2xl shadow-sm p-4 border ${alertasValidade.length > 0 ? "bg-amber-50 border-amber-200" : "bg-white border-slate-100"}`}>
                <p className={`text-xs font-semibold uppercase ${alertasValidade.length > 0 ? "text-amber-600" : "text-slate-400"}`}>Vencendo em breve</p>
                <p className={`text-3xl font-extrabold mt-1 ${alertasValidade.length > 0 ? "text-amber-600" : "text-slate-800"}`}>{alertasValidade.length}</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-4 border border-slate-100">
                <p className="text-xs text-slate-400 font-semibold uppercase">Valor em estoque</p>
                <p className="text-xl font-extrabold text-emerald-600 mt-1">{fmt(valorTotalEstoque)}</p>
              </div>
            </div>
          )}

          {/* Alertas */}
          {abaixoMinimo.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4 flex gap-3">
              <span className="text-xl">🔴</span>
              <div>
                <p className="font-bold text-red-700 text-sm">Estoque abaixo do mínimo</p>
                <p className="text-red-600 text-xs mt-0.5">{abaixoMinimo.map((i) => i.nome).join(" · ")}</p>
              </div>
            </div>
          )}

          {alertasValidade.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 space-y-2">
              <div className="flex gap-3 items-start">
                <span className="text-xl">⏰</span>
                <p className="font-bold text-amber-800 text-sm">Produtos com validade próxima</p>
              </div>
              {alertasValidade.map(({ item, mov }) => {
                const dias = diasParaVencer(mov.data_validade!);
                return (
                  <div key={`${item.id}-${mov.id}`} className="ml-8 flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-amber-200">
                    <div>
                      <span className="font-semibold text-slate-800 text-sm">{item.nome}</span>
                      <span className="text-slate-400 text-xs ml-2">lote de {mov.quantidade} {item.unidade}</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${dias === 0 ? "bg-red-100 text-red-700" : dias <= 2 ? "bg-orange-100 text-orange-700" : "bg-amber-100 text-amber-700"}`}>
                      {dias === 0 ? "Vence hoje!" : `${dias} dia${dias !== 1 ? "s" : ""}`}
                    </span>
                  </div>
                );
              })}
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
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar item..."
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />

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
                    const isRetiradaOpen = retiradaItem?.id === item.id;

                    return (
                      <div key={item.id} className={`bg-white rounded-2xl shadow-sm border transition-all ${abaixo ? "border-red-200" : "border-slate-100"}`}>
                        {/* Linha principal do item */}
                        <div className="p-4 flex items-center gap-3 flex-wrap">
                          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${abaixo ? "bg-red-500 animate-pulse" : item.quantidade_atual > item.quantidade_minima * 1.5 ? "bg-emerald-500" : "bg-amber-400"}`} />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-slate-800">{item.nome}</p>
                              {item.tem_validade === 1 && (
                                <span className="text-xs bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded-lg">⏰ Validade</span>
                              )}
                            </div>
                            <p className="text-sm text-slate-400 mt-0.5">
                              Mín: {item.quantidade_minima} {item.unidade} · {fmt(item.custo_unitario)}/{item.unidade}
                              {item.tem_validade === 1 && ` · Alerta ${item.dias_alerta}d`}
                            </p>
                          </div>

                          <div className="text-right flex-shrink-0">
                            <p className={`text-2xl font-extrabold ${abaixo ? "text-red-600" : "text-slate-800"}`}>{item.quantidade_atual}</p>
                            <p className="text-xs text-slate-400">{item.unidade}</p>
                          </div>

                          <div className="flex gap-2 flex-wrap">
                            {/* Botão de retirada destacado */}
                            <button
                              onClick={() => {
                                setRetiradaItem(isRetiradaOpen ? null : item);
                                setMovItem(null);
                                setRetiradaQtd(""); setRetiradaObs("");
                              }}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors ${isRetiradaOpen ? "bg-orange-500 text-white" : "bg-orange-100 text-orange-700 hover:bg-orange-200"}`}
                            >
                              📤 Retirar
                            </button>
                            {/* Botão de movimentação geral */}
                            <button
                              onClick={() => {
                                setMovItem(isMovOpen ? null : item);
                                setRetiradaItem(null);
                                if (!isMovOpen) { setMovQtd(""); setMovObs(""); setMovValidade(""); setMovTipo("entrada"); void loadHistorico(item); }
                              }}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors ${isMovOpen ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                            >
                              ↕️ Movimentos
                            </button>
                            <button onClick={() => iniciarEdicao(item)} className="bg-amber-100 text-amber-700 hover:bg-amber-200 px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors">✏️</button>
                            <button onClick={() => deletar(item)} className="text-slate-300 hover:text-red-500 px-2 py-1.5 rounded-xl text-sm transition-colors">🗑️</button>
                          </div>
                        </div>

                        {/* Painel rápido de RETIRADA */}
                        {isRetiradaOpen && (
                          <div className="border-t border-orange-100 bg-orange-50 rounded-b-2xl p-4">
                            <p className="text-sm font-bold text-orange-800 mb-3">📤 Retirar do estoque — <span className="font-normal">{item.nome}</span></p>
                            <div className="flex gap-3 flex-wrap">
                              <input
                                type="number" step="0.01"
                                value={retiradaQtd}
                                onChange={(e) => setRetiradaQtd(e.target.value)}
                                placeholder={`Quantidade (${item.unidade})`}
                                className="flex-1 min-w-[140px] border border-orange-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                              />
                              <input
                                value={retiradaObs}
                                onChange={(e) => setRetiradaObs(e.target.value)}
                                placeholder="Motivo / observação (opcional)"
                                className="flex-1 min-w-[160px] border border-orange-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                              />
                              <button
                                onClick={registrarRetirada}
                                disabled={salvandoRetirada || !retiradaQtd}
                                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-xl text-sm transition-colors"
                              >
                                {salvandoRetirada ? "Registrando..." : "Confirmar retirada"}
                              </button>
                            </div>
                            {item.quantidade_atual > 0 && (
                              <p className="text-xs text-orange-600 mt-2">
                                Estoque atual: <strong>{item.quantidade_atual} {item.unidade}</strong>
                                {retiradaQtd && ` → após retirada: ${Math.max(0, item.quantidade_atual - parseFloat(retiradaQtd || "0")).toFixed(2)} ${item.unidade}`}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Painel de MOVIMENTOS (entrada / ajuste / histórico) */}
                        {isMovOpen && (
                          <div className="border-t border-slate-100 bg-slate-50 rounded-b-2xl p-4 space-y-4">
                            <div className="flex gap-2">
                              {(["entrada", "ajuste"] as TipoMov[]).map((t) => (
                                <button key={t} onClick={() => setMovTipo(t)}
                                  className={`flex-1 py-2 rounded-xl text-sm font-semibold capitalize transition-colors ${movTipo === t
                                    ? t === "entrada" ? "bg-emerald-500 text-white" : "bg-blue-500 text-white"
                                    : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200"}`}>
                                  {t === "entrada" ? "⬆️ Dar entrada" : "🔄 Ajuste de saldo"}
                                </button>
                              ))}
                            </div>

                            <div className="space-y-2">
                              <div className="flex gap-3 flex-wrap">
                                <input type="number" step="0.01" value={movQtd} onChange={(e) => setMovQtd(e.target.value)}
                                  placeholder={`Quantidade (${item.unidade})`}
                                  className="flex-1 min-w-[140px] border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white" />
                                <input value={movObs} onChange={(e) => setMovObs(e.target.value)} placeholder="Observação (opcional)"
                                  className="flex-1 min-w-[160px] border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white" />
                              </div>

                              {/* Campo de validade apenas em ENTRADAS de itens com validade */}
                              {movTipo === "entrada" && item.tem_validade === 1 && (
                                <div className="flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
                                  <span className="text-purple-600 text-sm font-semibold whitespace-nowrap">⏰ Validade do lote:</span>
                                  <input
                                    type="date"
                                    value={movValidade}
                                    onChange={(e) => setMovValidade(e.target.value)}
                                    min={new Date().toISOString().split("T")[0]}
                                    className="flex-1 border border-purple-300 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                                  />
                                  {movValidade && (
                                    <span className="text-purple-700 text-xs font-medium whitespace-nowrap">
                                      {diasParaVencer(movValidade)} dias
                                    </span>
                                  )}
                                </div>
                              )}

                              <button onClick={registrarMovimento} disabled={salvandoMov || !movQtd}
                                className={`w-full font-bold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50 text-white ${movTipo === "entrada" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-blue-600 hover:bg-blue-700"}`}>
                                {salvandoMov ? "Registrando..." : movTipo === "entrada" ? "✅ Confirmar entrada" : "✅ Aplicar ajuste"}
                              </button>
                            </div>

                            {/* Histórico de movimentos */}
                            {movHistorico.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Histórico de movimentações</p>
                                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                  {movHistorico.map((m) => (
                                    <div key={m.id} className="flex items-center gap-3 text-sm bg-white rounded-xl px-3 py-2 border border-slate-100">
                                      <span className={`font-bold text-xs px-2 py-0.5 rounded-lg ${m.tipo === "entrada" ? "bg-emerald-100 text-emerald-700" : m.tipo === "saida" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}>
                                        {m.tipo === "entrada" ? "⬆️" : m.tipo === "saida" ? "📤" : "🔄"} {m.tipo}
                                      </span>
                                      <span className="font-bold text-slate-800">{m.quantidade} {item.unidade}</span>
                                      {m.data_validade && (
                                        <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${diasParaVencer(m.data_validade) <= (item.dias_alerta ?? 7) ? "bg-amber-100 text-amber-700" : "bg-purple-100 text-purple-700"}`}>
                                          val. {new Date(m.data_validade + "T00:00:00").toLocaleDateString("pt-BR")}
                                        </span>
                                      )}
                                      {m.observacao && <span className="text-slate-400 text-xs truncate flex-1">{m.observacao}</span>}
                                      <span className="text-slate-300 text-xs ml-auto whitespace-nowrap">{new Date(m.criado_at).toLocaleDateString("pt-BR")}</span>
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
                    <p className="text-xs text-slate-400 mt-1">Alerta vermelho ao atingir</p>
                  </div>
                </div>

                {/* Toggle de validade */}
                <div className={`rounded-2xl border-2 p-4 transition-colors ${form.tem_validade ? "border-purple-300 bg-purple-50" : "border-slate-200 bg-slate-50"}`}>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, tem_validade: !form.tem_validade })}
                    className="flex items-center justify-between w-full"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-6 rounded-full transition-colors relative ${form.tem_validade ? "bg-purple-500" : "bg-slate-300"}`}>
                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.tem_validade ? "translate-x-5" : "translate-x-0.5"}`} />
                      </div>
                      <div className="text-left">
                        <p className={`font-semibold text-sm ${form.tem_validade ? "text-purple-800" : "text-slate-600"}`}>⏰ Controlar validade</p>
                        <p className="text-xs text-slate-400 mt-0.5">Registrar data de vencimento nas entradas</p>
                      </div>
                    </div>
                  </button>

                  {form.tem_validade && (
                    <div className="mt-4 pt-4 border-t border-purple-200 space-y-4">
                      <div>
                        <label className="text-sm font-semibold text-purple-800 block mb-1">Alertar quantos dias antes do vencimento?</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="number" min="1" max="90"
                            value={form.dias_alerta}
                            onChange={(e) => setForm({ ...form, dias_alerta: e.target.value })}
                            className="w-24 border border-purple-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                          />
                          <span className="text-sm text-purple-700 font-medium">dias antes do vencimento</span>
                        </div>
                      </div>

                      {!editando && parseFloat(form.quantidade_atual) > 0 && (
                        <div>
                          <label className="text-sm font-semibold text-purple-800 block mb-1">
                            Data de validade do estoque inicial <span className="text-purple-400 font-normal">(opcional)</span>
                          </label>
                          <input
                            type="date"
                            value={form.data_validade_inicial}
                            onChange={(e) => setForm({ ...form, data_validade_inicial: e.target.value })}
                            min={new Date().toISOString().split("T")[0]}
                            className="border border-purple-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                          />
                          {form.data_validade_inicial && (
                            <p className="text-xs text-purple-600 mt-1">
                              Alerta a partir de {(() => {
                                const d = new Date(form.data_validade_inicial + "T00:00:00");
                                d.setDate(d.getDate() - (parseInt(form.dias_alerta) || 7));
                                return d.toLocaleDateString("pt-BR");
                              })()}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
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
