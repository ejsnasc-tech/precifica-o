"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Lancamento {
  id: number;
  data: string;
  tipo: "receita" | "despesa";
  categoria: string;
  descricao: string;
  valor: number;
  obs: string;
}

interface Cartao {
  id: number;
  nome: string;
  bandeira: string;
  limite: number;
  dia_fechamento: number;
  dia_vencimento: number;
  cor: string;
}

interface CartaoLancamento {
  id: number;
  cartao_id: number;
  data: string;
  descricao: string;
  categoria: string;
  valor_total: number;
  parcelas: number;
}

interface Meta {
  id: number;
  nome: string;
  emoji: string;
  valor_objetivo: number;
  valor_atual: number;
  prazo: string | null;
  cor: string;
}

type Tab = "dashboard" | "lancamentos" | "cartoes" | "metas" | "relatorios";
type TipoLanc = "receita" | "despesa";
type LancForm = { data: string; tipo: TipoLanc; categoria: string; descricao: string; valor: string; obs: string };

// ─── Utilitários ─────────────────────────────────────────────────────────────

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const hoje = () => new Date().toISOString().slice(0, 10);
const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KPI({ label, valor, sub, cor, emoji }: { label: string; valor: string; sub?: string; cor: string; emoji: string }) {
  return (
    <div className={`rounded-2xl p-4 ${cor}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{emoji} {label}</p>
      <p className="text-2xl font-extrabold mt-1">{valor}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Barra de Progresso ───────────────────────────────────────────────────────

function ProgressBar({ value, max, cor }: { value: number; max: number; cor: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
      <div className="h-3 rounded-full transition-all" style={{ width: `${pct}%`, background: cor }} />
    </div>
  );
}

// ─── Gráfico de Barras simples ────────────────────────────────────────────────

function MiniBar({ entries }: { entries: { label: string; receita: number; despesa: number }[] }) {
  if (entries.length === 0) return <p className="text-slate-400 text-sm text-center py-8">Sem dados</p>;
  const max = Math.max(...entries.flatMap((e) => [e.receita, e.despesa]), 1);
  const H = 80; const bW = 10; const gap = 2; const slotW = 32;
  const W = entries.length * slotW;
  return (
    <div className="overflow-x-auto">
      <div className="flex gap-4 mb-2 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block bg-emerald-500" /> Receitas</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block bg-rose-400" /> Despesas</span>
      </div>
      <svg viewBox={`0 0 ${Math.max(W, 200)} ${H + 28}`} style={{ width: Math.max(W, 200), height: H + 28 }} className="overflow-visible">
        {entries.map((e, i) => {
          const x = i * slotW + 4;
          const rh = Math.round((e.receita / max) * H);
          const dh = Math.round((e.despesa / max) * H);
          return (
            <g key={i}>
              <rect x={x} y={H - rh} width={bW} height={rh} fill="#10b981" rx={2} />
              <rect x={x + bW + gap} y={H - dh} width={bW} height={dh} fill="#fb7185" rx={2} />
              <text x={x + bW + gap / 2} y={H + 14} textAnchor="middle" fontSize={8} fill="#94a3b8">{e.label}</text>
            </g>
          );
        })}
        <line x1={0} y1={H} x2={Math.max(W, 200)} y2={H} stroke="#334155" strokeWidth={1} />
      </svg>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function FinanceiroPessoalPage() {
  const router = useRouter();
  const now = new Date();

  const [aba, setAba] = useState<Tab>("dashboard");
  const [filtroAno, setFiltroAno] = useState(now.getFullYear());
  const [filtroMes, setFiltroMes] = useState(now.getMonth() + 1);

  // Dados
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [cartaoLancs, setCartaoLancs] = useState<CartaoLancamento[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);

  // Form lançamento
  const emptyLanc: LancForm = { data: hoje(), tipo: "despesa", categoria: "", descricao: "", valor: "", obs: "" };
  const [formLanc, setFormLanc] = useState<LancForm>(emptyLanc);
  const [editandoLancId, setEditandoLancId] = useState<number | null>(null);
  const [salvandoLanc, setSalvandoLanc] = useState(false);

  // Form cartão
  const emptyCartao = { nome: "", bandeira: "visa", limite: "", dia_fechamento: "20", dia_vencimento: "10", cor: "#6366f1" };
  const [formCartao, setFormCartao] = useState(emptyCartao);
  const [cartaoSelecionado, setCartaoSelecionado] = useState<number | null>(null);
  const [salvandoCartao, setSalvandoCartao] = useState(false);

  // Form lançamento de cartão
  const emptyCartaoLanc = { data: hoje(), descricao: "", categoria: "", valor_total: "", parcelas: "1" };
  const [formCartaoLanc, setFormCartaoLanc] = useState(emptyCartaoLanc);
  const [salvandoCartaoLanc, setSalvandoCartaoLanc] = useState(false);

  // Form meta
  const emptyMeta = { nome: "", emoji: "🎯", valor_objetivo: "", valor_atual: "", prazo: "", cor: "#6366f1" };
  const [formMeta, setFormMeta] = useState(emptyMeta);
  const [editandoMetaId, setEditandoMetaId] = useState<number | null>(null);
  const [aporteMeta, setAporteMeta] = useState<{ id: number; valor: string } | null>(null);
  const [salvandoMeta, setSalvandoMeta] = useState(false);

  // ── Carregar dados ─────────────────────────────────────────────────────────

  const load = useCallback(async (ano: number) => {
    const [lRes, cRes, clRes, mRes] = await Promise.all([
      fetch(`/api/pf/lancamentos?ano=${ano}`),
      fetch("/api/pf/cartoes"),
      fetch("/api/pf/cartao-lancamentos"),
      fetch("/api/pf/metas"),
    ]);
    if (lRes.status === 401) { router.push("/login"); return; }
    if (lRes.ok) setLancamentos(await lRes.json() as Lancamento[]);
    if (cRes.ok) setCartoes(await cRes.json() as Cartao[]);
    if (clRes.ok) setCartaoLancs(await clRes.json() as CartaoLancamento[]);
    if (mRes.ok) setMetas(await mRes.json() as Meta[]);
  }, [router]);

  useEffect(() => { void load(filtroAno); }, [load, filtroAno]);

  // ── Dados calculados ───────────────────────────────────────────────────────

  const doMes = lancamentos.filter((l) =>
    l.data.startsWith(`${filtroAno}-${String(filtroMes).padStart(2, "0")}-`)
  );

  const totalReceitas = doMes.filter((l) => l.tipo === "receita").reduce((a, l) => a + l.valor, 0);
  const totalDespesas = doMes.filter((l) => l.tipo === "despesa").reduce((a, l) => a + l.valor, 0);
  const saldo = totalReceitas - totalDespesas;

  const dadosAnuais = Array.from({ length: 12 }, (_, m) => {
    const key = `${filtroAno}-${String(m + 1).padStart(2, "0")}-`;
    const ls = lancamentos.filter((l) => l.data.startsWith(key));
    return {
      mes: MESES[m],
      receita: ls.filter((l) => l.tipo === "receita").reduce((a, l) => a + l.valor, 0),
      despesa: ls.filter((l) => l.tipo === "despesa").reduce((a, l) => a + l.valor, 0),
    };
  });

  // Fatura do cartão selecionado no mês
  const faturaDoMes = (cartaoId: number) => {
    const cartao = cartoes.find((c) => c.id === cartaoId);
    if (!cartao) return 0;
    return cartaoLancs
      .filter((cl) => cl.cartao_id === cartaoId && cl.data.startsWith(`${filtroAno}-${String(filtroMes).padStart(2, "0")}-`))
      .reduce((a, cl) => a + cl.valor_total / cl.parcelas, 0);
  };

  // ── Handlers Lançamentos ───────────────────────────────────────────────────

  async function salvarLanc() {
    const v = parseFloat(formLanc.valor);
    if (!formLanc.descricao.trim() || isNaN(v) || v <= 0 || !formLanc.data) return;
    setSalvandoLanc(true);
    const body = { ...formLanc, valor: v, categoria: formLanc.categoria || formLanc.tipo };

    if (editandoLancId !== null) {
      await fetch(`/api/pf/lancamentos/${editandoLancId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/pf/lancamentos", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
    }

    setFormLanc(emptyLanc);
    setEditandoLancId(null);
    setSalvandoLanc(false);
    void load(filtroAno);
  }

  async function deletarLanc(id: number) {
    if (!confirm("Excluir este lançamento?")) return;
    await fetch(`/api/pf/lancamentos/${id}`, { method: "DELETE" });
    void load(filtroAno);
  }

  function editarLanc(l: Lancamento) {
    setFormLanc({ data: l.data, tipo: l.tipo, categoria: l.categoria, descricao: l.descricao, valor: String(l.valor), obs: l.obs });
    setEditandoLancId(l.id);
    setAba("lancamentos");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Handlers Cartões ───────────────────────────────────────────────────────

  async function salvarCartao() {
    if (!formCartao.nome.trim()) return;
    setSalvandoCartao(true);
    await fetch("/api/pf/cartoes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...formCartao, limite: parseFloat(formCartao.limite) || 0, dia_fechamento: Number(formCartao.dia_fechamento), dia_vencimento: Number(formCartao.dia_vencimento) }),
    });
    setFormCartao(emptyCartao);
    setSalvandoCartao(false);
    void load(filtroAno);
  }

  async function deletarCartao(id: number) {
    if (!confirm("Excluir este cartão e todos os lançamentos?")) return;
    await fetch(`/api/pf/cartoes/${id}`, { method: "DELETE" });
    if (cartaoSelecionado === id) setCartaoSelecionado(null);
    void load(filtroAno);
  }

  async function salvarCartaoLanc() {
    if (!cartaoSelecionado) return;
    const v = parseFloat(formCartaoLanc.valor_total);
    if (!formCartaoLanc.descricao.trim() || isNaN(v) || v <= 0) return;
    setSalvandoCartaoLanc(true);
    await fetch("/api/pf/cartao-lancamentos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cartao_id: cartaoSelecionado, ...formCartaoLanc, valor_total: v, parcelas: Number(formCartaoLanc.parcelas) || 1, categoria: formCartaoLanc.categoria || "outros" }),
    });
    setFormCartaoLanc(emptyCartaoLanc);
    setSalvandoCartaoLanc(false);
    void load(filtroAno);
  }

  async function deletarCartaoLanc(id: number) {
    if (!confirm("Excluir este lançamento?")) return;
    await fetch(`/api/pf/cartao-lancamentos/${id}`, { method: "DELETE" });
    void load(filtroAno);
  }

  // ── Handlers Metas ─────────────────────────────────────────────────────────

  async function salvarMeta() {
    const obj = parseFloat(formMeta.valor_objetivo);
    if (!formMeta.nome.trim() || isNaN(obj) || obj <= 0) return;
    setSalvandoMeta(true);
    const body = { ...formMeta, valor_objetivo: obj, valor_atual: parseFloat(formMeta.valor_atual) || 0, prazo: formMeta.prazo || undefined };

    if (editandoMetaId !== null) {
      await fetch(`/api/pf/metas/${editandoMetaId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/pf/metas", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
    }

    setFormMeta(emptyMeta);
    setEditandoMetaId(null);
    setSalvandoMeta(false);
    void load(filtroAno);
  }

  async function aportarMeta() {
    if (!aporteMeta) return;
    const v = parseFloat(aporteMeta.valor);
    if (isNaN(v) || v <= 0) return;
    const meta = metas.find((m) => m.id === aporteMeta.id);
    if (!meta) return;
    await fetch(`/api/pf/metas/${aporteMeta.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ valor_atual: meta.valor_atual + v }),
    });
    setAporteMeta(null);
    void load(filtroAno);
  }

  async function deletarMeta(id: number) {
    if (!confirm("Excluir esta meta?")) return;
    await fetch(`/api/pf/metas/${id}`, { method: "DELETE" });
    void load(filtroAno);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const TABS: { key: Tab; label: string }[] = [
    { key: "dashboard", label: "📊 Dashboard" },
    { key: "lancamentos", label: "💸 Lançamentos" },
    { key: "cartoes", label: "💳 Cartões" },
    { key: "metas", label: "🎯 Metas" },
    { key: "relatorios", label: "📈 Relatórios" },
  ];

  return (
    <AppShell>
    <div className="min-h-full bg-slate-50">
      <div className="max-w-5xl mx-auto p-6 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-800">👤 Finanças Pessoais</h1>
          <p className="text-slate-400 text-sm mt-0.5">Controle suas receitas, despesas, cartões e metas</p>
        </div>
        {/* Abas */}
        <div className="flex flex-wrap gap-2 mb-6">
          {TABS.map(({ key, label }) => (
            <button key={key} onClick={() => setAba(key)}
              className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${aba === key ? "bg-white shadow text-slate-800" : "text-slate-500 hover:bg-white/60"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* ═══ DASHBOARD ═══ */}
        {aba === "dashboard" && (
          <div className="space-y-6">
            {/* Filtro mês */}
            <div className="flex items-center gap-3 flex-wrap">
              <select value={filtroMes} onChange={(e) => setFiltroMes(Number(e.target.value))}
                className="border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white">
                {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <select value={filtroAno} onChange={(e) => setFiltroAno(Number(e.target.value))}
                className="border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white">
                {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => <option key={y}>{y}</option>)}
              </select>
              <span className="text-sm text-slate-400">{doMes.length} lançamento{doMes.length !== 1 ? "s" : ""}</span>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPI label="Receitas" valor={fmt(totalReceitas)} emoji="💚" cor="bg-emerald-50 text-emerald-800" />
              <KPI label="Despesas" valor={fmt(totalDespesas)} emoji="🔴" cor="bg-rose-50 text-rose-800" />
              <KPI label="Saldo" valor={fmt(saldo)} emoji={saldo >= 0 ? "✅" : "⚠️"} cor={saldo >= 0 ? "bg-blue-50 text-blue-800" : "bg-red-50 text-red-800"} />
              <KPI label="Cartões" valor={fmt(cartoes.reduce((a, c) => a + faturaDoMes(c.id), 0))} emoji="💳" cor="bg-purple-50 text-purple-800" sub="fatura do mês" />
            </div>

            {/* Gráfico anual */}
            <div className="bg-white rounded-2xl shadow p-5">
              <h3 className="font-bold text-slate-700 mb-3 text-sm">Receitas vs Despesas — {filtroAno}</h3>
              <MiniBar entries={dadosAnuais.map((d) => ({ label: d.mes, receita: d.receita, despesa: d.despesa }))} />
            </div>

            {/* Últimos lançamentos */}
            {doMes.length > 0 && (
              <div className="bg-white rounded-2xl shadow overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="font-bold text-slate-700 text-sm">Últimos Lançamentos — {MESES[filtroMes - 1]}</h3>
                </div>
                <div className="divide-y divide-slate-50">
                  {doMes.slice(0, 8).map((l) => (
                    <div key={l.id} className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{l.tipo === "receita" ? "💚" : "🔴"}</span>
                        <div>
                          <p className="text-sm font-medium text-slate-700">{l.descricao}</p>
                          <p className="text-xs text-slate-400">{l.categoria} · {l.data.split("-").reverse().join("/")}</p>
                        </div>
                      </div>
                      <span className={`font-bold text-sm ${l.tipo === "receita" ? "text-emerald-600" : "text-rose-500"}`}>
                        {l.tipo === "receita" ? "+" : "-"}{fmt(l.valor)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metas resumo */}
            {metas.length > 0 && (
              <div className="bg-white rounded-2xl shadow p-5">
                <h3 className="font-bold text-slate-700 mb-4 text-sm">🎯 Progresso das Metas</h3>
                <div className="space-y-4">
                  {metas.map((m) => {
                    const pct = m.valor_objetivo > 0 ? Math.min((m.valor_atual / m.valor_objetivo) * 100, 100) : 0;
                    return (
                      <div key={m.id}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-slate-700">{m.emoji} {m.nome}</span>
                          <span className="text-xs text-slate-500">{fmt(m.valor_atual)} / {fmt(m.valor_objetivo)} ({pct.toFixed(0)}%)</span>
                        </div>
                        <ProgressBar value={m.valor_atual} max={m.valor_objetivo} cor={m.cor} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ LANÇAMENTOS ═══ */}
        {aba === "lancamentos" && (
          <div className="space-y-6">
            {/* Formulário */}
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-lg font-bold text-slate-700 mb-4">
                {editandoLancId !== null ? "✏️ Editando Lançamento" : "➕ Novo Lançamento"}
              </h2>

              {/* Tipo */}
              <div className="flex gap-3 mb-4">
                {(["receita", "despesa"] as const).map((t) => (
                  <button key={t} onClick={() => setFormLanc({ ...formLanc, tipo: t })}
                    className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-colors ${formLanc.tipo === t
                      ? t === "receita" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                    {t === "receita" ? "💚 Receita" : "🔴 Despesa"}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-sm text-slate-600 block mb-1">Data</label>
                  <input type="date" value={formLanc.data} onChange={(e) => setFormLanc({ ...formLanc, data: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </div>
                <div>
                  <label className="text-sm text-slate-600 block mb-1">Valor (R$)</label>
                  <input type="number" step="0.01" min="0" value={formLanc.valor}
                    onChange={(e) => setFormLanc({ ...formLanc, valor: e.target.value })}
                    placeholder="0,00"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </div>
                <div>
                  <label className="text-sm text-slate-600 block mb-1">Descrição</label>
                  <input value={formLanc.descricao} onChange={(e) => setFormLanc({ ...formLanc, descricao: e.target.value })}
                    placeholder="Ex: Salário, Aluguel, Mercado..."
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </div>
                <div>
                  <label className="text-sm text-slate-600 block mb-1">Categoria <span className="text-slate-400">(opcional)</span></label>
                  <input value={formLanc.categoria} onChange={(e) => setFormLanc({ ...formLanc, categoria: e.target.value })}
                    placeholder="Ex: Moradia, Alimentação, Salário..."
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </div>
              </div>

              <div className="mb-4">
                <label className="text-sm text-slate-600 block mb-1">Observação <span className="text-slate-400">(opcional)</span></label>
                <input value={formLanc.obs} onChange={(e) => setFormLanc({ ...formLanc, obs: e.target.value })}
                  placeholder="Alguma nota adicional..."
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>

              <div className="flex gap-3">
                <button onClick={salvarLanc} disabled={salvandoLanc}
                  className={`font-bold px-6 py-2.5 rounded-xl text-sm text-white disabled:opacity-50 ${formLanc.tipo === "receita" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-rose-500 hover:bg-rose-600"}`}>
                  {salvandoLanc ? "Salvando..." : editandoLancId !== null ? "💾 Salvar alterações" : "💾 Salvar"}
                </button>
                {editandoLancId !== null && (
                  <button onClick={() => { setFormLanc(emptyLanc); setEditandoLancId(null); }}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold px-5 py-2.5 rounded-xl text-sm">
                    Cancelar
                  </button>
                )}
              </div>
            </div>

            {/* Filtro */}
            <div className="flex items-center gap-3 flex-wrap">
              <select value={filtroMes} onChange={(e) => setFiltroMes(Number(e.target.value))}
                className="border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white">
                {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <select value={filtroAno} onChange={(e) => setFiltroAno(Number(e.target.value))}
                className="border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white">
                {[now.getFullYear() - 1, now.getFullYear()].map((y) => <option key={y}>{y}</option>)}
              </select>
              <div className="flex gap-3 text-sm">
                <span className="text-emerald-600 font-semibold">Receitas: {fmt(totalReceitas)}</span>
                <span className="text-rose-500 font-semibold">Despesas: {fmt(totalDespesas)}</span>
                <span className={`font-bold ${saldo >= 0 ? "text-blue-600" : "text-red-500"}`}>Saldo: {fmt(saldo)}</span>
              </div>
            </div>

            {/* Lista */}
            {doMes.length === 0 ? (
              <div className="bg-white rounded-2xl shadow p-12 text-center">
                <p className="text-5xl mb-3">💸</p>
                <p className="text-slate-500">Nenhum lançamento neste mês.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left px-5 py-3 text-slate-500 font-semibold">Data</th>
                      <th className="text-left px-5 py-3 text-slate-500 font-semibold">Descrição</th>
                      <th className="text-left px-5 py-3 text-slate-500 font-semibold">Categoria</th>
                      <th className="text-right px-5 py-3 text-slate-500 font-semibold">Valor</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {doMes.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 text-slate-500 text-xs">{l.data.split("-").reverse().join("/")}</td>
                        <td className="px-5 py-3 font-medium text-slate-700">
                          {l.tipo === "receita" ? "💚" : "🔴"} {l.descricao}
                          {l.obs && <span className="text-xs text-slate-400 ml-2">· {l.obs}</span>}
                        </td>
                        <td className="px-5 py-3 text-slate-500 text-xs">{l.categoria}</td>
                        <td className={`px-5 py-3 text-right font-bold ${l.tipo === "receita" ? "text-emerald-600" : "text-rose-500"}`}>
                          {l.tipo === "receita" ? "+" : "-"}{fmt(l.valor)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex gap-1 justify-end">
                            <button onClick={() => editarLanc(l)} className="text-slate-300 hover:text-amber-400 text-xs">✏️</button>
                            <button onClick={() => deletarLanc(l.id)} className="text-slate-300 hover:text-red-400 text-xs">🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══ CARTÕES ═══ */}
        {aba === "cartoes" && (
          <div className="space-y-6">
            {/* Cadastrar cartão */}
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-lg font-bold text-slate-700 mb-4">💳 Adicionar Cartão</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="text-sm text-slate-600 block mb-1">Nome do cartão</label>
                  <input value={formCartao.nome} onChange={(e) => setFormCartao({ ...formCartao, nome: e.target.value })}
                    placeholder="Ex: Nubank, Itaú Gold..."
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </div>
                <div>
                  <label className="text-sm text-slate-600 block mb-1">Bandeira</label>
                  <select value={formCartao.bandeira} onChange={(e) => setFormCartao({ ...formCartao, bandeira: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white">
                    <option value="visa">Visa</option>
                    <option value="mastercard">Mastercard</option>
                    <option value="elo">Elo</option>
                    <option value="amex">Amex</option>
                    <option value="hipercard">Hipercard</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-slate-600 block mb-1">Limite (R$)</label>
                  <input type="number" step="0.01" min="0" value={formCartao.limite}
                    onChange={(e) => setFormCartao({ ...formCartao, limite: e.target.value })}
                    placeholder="0,00"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </div>
                <div>
                  <label className="text-sm text-slate-600 block mb-1">Dia fechamento</label>
                  <input type="number" min="1" max="31" value={formCartao.dia_fechamento}
                    onChange={(e) => setFormCartao({ ...formCartao, dia_fechamento: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </div>
                <div>
                  <label className="text-sm text-slate-600 block mb-1">Dia vencimento</label>
                  <input type="number" min="1" max="31" value={formCartao.dia_vencimento}
                    onChange={(e) => setFormCartao({ ...formCartao, dia_vencimento: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </div>
                <div>
                  <label className="text-sm text-slate-600 block mb-1">Cor</label>
                  <input type="color" value={formCartao.cor}
                    onChange={(e) => setFormCartao({ ...formCartao, cor: e.target.value })}
                    className="w-full h-10 border border-slate-300 rounded-xl px-1 py-1 cursor-pointer" />
                </div>
              </div>
              <button onClick={salvarCartao} disabled={salvandoCartao}
                className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl text-sm">
                {salvandoCartao ? "Salvando..." : "+ Adicionar cartão"}
              </button>
            </div>

            {/* Lista de cartões */}
            {cartoes.length === 0 ? (
              <div className="bg-white rounded-2xl shadow p-12 text-center">
                <p className="text-5xl mb-3">💳</p>
                <p className="text-slate-500">Nenhum cartão cadastrado.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cartoes.map((c) => {
                  const fatura = faturaDoMes(c.id);
                  const usoPct = c.limite > 0 ? Math.min((fatura / c.limite) * 100, 100) : 0;
                  const isSelected = cartaoSelecionado === c.id;
                  return (
                    <div key={c.id} className={`bg-white rounded-2xl shadow overflow-hidden border-2 transition-colors ${isSelected ? "border-violet-400" : "border-transparent"}`}>
                      {/* Card visual */}
                      <div className="p-5 text-white rounded-t-2xl" style={{ background: `linear-gradient(135deg, ${c.cor}, ${c.cor}99)` }}>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs opacity-70 uppercase tracking-wide">{c.bandeira}</p>
                            <p className="text-lg font-bold mt-1">{c.nome}</p>
                          </div>
                          <button onClick={() => deletarCartao(c.id)} className="text-white/50 hover:text-white text-xs">🗑️</button>
                        </div>
                        <div className="mt-3 flex gap-6 text-xs opacity-80">
                          <span>Fechamento: dia {c.dia_fechamento}</span>
                          <span>Vencimento: dia {c.dia_vencimento}</span>
                        </div>
                      </div>
                      {/* Fatura info */}
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-slate-500">Fatura {MESES[filtroMes - 1]}</span>
                          <span className="font-bold text-slate-800">{fmt(fatura)}</span>
                        </div>
                        {c.limite > 0 && (
                          <>
                            <ProgressBar value={fatura} max={c.limite} cor={c.cor} />
                            <p className="text-xs text-slate-400 mt-1">{usoPct.toFixed(0)}% do limite · Disponível: {fmt(c.limite - fatura)}</p>
                          </>
                        )}
                        <button
                          onClick={() => setCartaoSelecionado(isSelected ? null : c.id)}
                          className={`mt-3 w-full py-2 rounded-xl text-sm font-semibold transition-colors ${isSelected ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                          {isSelected ? "✓ Selecionado" : "Ver / Lançar"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Lançamentos do cartão selecionado */}
            {cartaoSelecionado && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl shadow p-6">
                  <h3 className="font-bold text-slate-700 mb-4 text-sm">
                    + Novo lançamento — {cartoes.find((c) => c.id === cartaoSelecionado)?.nome}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Data</label>
                      <input type="date" value={formCartaoLanc.data}
                        onChange={(e) => setFormCartaoLanc({ ...formCartaoLanc, data: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <label className="text-xs text-slate-500 block mb-1">Descrição</label>
                      <input value={formCartaoLanc.descricao}
                        onChange={(e) => setFormCartaoLanc({ ...formCartaoLanc, descricao: e.target.value })}
                        placeholder="Ex: Supermercado, Netflix..."
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Categoria</label>
                      <input value={formCartaoLanc.categoria}
                        onChange={(e) => setFormCartaoLanc({ ...formCartaoLanc, categoria: e.target.value })}
                        placeholder="Alimentação, Lazer..."
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Valor total (R$)</label>
                      <input type="number" step="0.01" min="0" value={formCartaoLanc.valor_total}
                        onChange={(e) => setFormCartaoLanc({ ...formCartaoLanc, valor_total: e.target.value })}
                        placeholder="0,00"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Parcelas</label>
                      <input type="number" min="1" max="48" value={formCartaoLanc.parcelas}
                        onChange={(e) => setFormCartaoLanc({ ...formCartaoLanc, parcelas: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                    </div>
                  </div>
                  {formCartaoLanc.valor_total && Number(formCartaoLanc.parcelas) > 1 && (
                    <p className="text-xs text-violet-600 mb-3">
                      {formCartaoLanc.parcelas}× de {fmt((parseFloat(formCartaoLanc.valor_total) || 0) / Number(formCartaoLanc.parcelas))} = {fmt(parseFloat(formCartaoLanc.valor_total) || 0)}
                    </p>
                  )}
                  <button onClick={salvarCartaoLanc} disabled={salvandoCartaoLanc}
                    className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl text-sm">
                    {salvandoCartaoLanc ? "Salvando..." : "💾 Lançar"}
                  </button>
                </div>

                {/* Lançamentos do cartão */}
                <div className="bg-white rounded-2xl shadow overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100">
                    <h3 className="font-bold text-slate-700 text-sm">Lançamentos — {cartoes.find((c) => c.id === cartaoSelecionado)?.nome}</h3>
                  </div>
                  {cartaoLancs.filter((cl) => cl.cartao_id === cartaoSelecionado).length === 0 ? (
                    <p className="text-center text-slate-400 py-8">Nenhum lançamento</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          <th className="text-left px-5 py-3 text-slate-500 font-semibold">Data</th>
                          <th className="text-left px-5 py-3 text-slate-500 font-semibold">Descrição</th>
                          <th className="text-right px-5 py-3 text-slate-500 font-semibold">Parcela/mês</th>
                          <th className="text-right px-5 py-3 text-slate-500 font-semibold">Total</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {cartaoLancs.filter((cl) => cl.cartao_id === cartaoSelecionado).map((cl) => (
                          <tr key={cl.id} className="hover:bg-slate-50">
                            <td className="px-5 py-3 text-slate-500 text-xs">{cl.data.split("-").reverse().join("/")}</td>
                            <td className="px-5 py-3 font-medium text-slate-700">
                              {cl.descricao}
                              {cl.categoria && <span className="text-xs text-slate-400 ml-2">· {cl.categoria}</span>}
                            </td>
                            <td className="px-5 py-3 text-right text-violet-600 font-semibold">
                              {fmt(cl.valor_total / cl.parcelas)}
                              {cl.parcelas > 1 && <span className="text-xs text-slate-400 ml-1">/{cl.parcelas}x</span>}
                            </td>
                            <td className="px-5 py-3 text-right text-slate-600">{fmt(cl.valor_total)}</td>
                            <td className="px-5 py-3 text-right">
                              <button onClick={() => deletarCartaoLanc(cl.id)} className="text-slate-300 hover:text-red-400 text-xs">🗑️</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ METAS ═══ */}
        {aba === "metas" && (
          <div className="space-y-6">
            {/* Formulário nova meta */}
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-lg font-bold text-slate-700 mb-4">
                {editandoMetaId !== null ? "✏️ Editando Meta" : "🎯 Nova Meta de Economia"}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="text-sm text-slate-600 block mb-1">Nome da meta</label>
                  <input value={formMeta.nome} onChange={(e) => setFormMeta({ ...formMeta, nome: e.target.value })}
                    placeholder="Ex: Viagem, Carro, Reserva..."
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </div>
                <div>
                  <label className="text-sm text-slate-600 block mb-1">Emoji</label>
                  <input value={formMeta.emoji} onChange={(e) => setFormMeta({ ...formMeta, emoji: e.target.value })}
                    placeholder="🎯"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </div>
                <div>
                  <label className="text-sm text-slate-600 block mb-1">Objetivo (R$)</label>
                  <input type="number" step="0.01" min="0" value={formMeta.valor_objetivo}
                    onChange={(e) => setFormMeta({ ...formMeta, valor_objetivo: e.target.value })}
                    placeholder="0,00"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </div>
                <div>
                  <label className="text-sm text-slate-600 block mb-1">Já tenho (R$)</label>
                  <input type="number" step="0.01" min="0" value={formMeta.valor_atual}
                    onChange={(e) => setFormMeta({ ...formMeta, valor_atual: e.target.value })}
                    placeholder="0,00"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </div>
                <div>
                  <label className="text-sm text-slate-600 block mb-1">Prazo <span className="text-slate-400">(opcional)</span></label>
                  <input type="date" value={formMeta.prazo} onChange={(e) => setFormMeta({ ...formMeta, prazo: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </div>
                <div>
                  <label className="text-sm text-slate-600 block mb-1">Cor</label>
                  <input type="color" value={formMeta.cor} onChange={(e) => setFormMeta({ ...formMeta, cor: e.target.value })}
                    className="w-full h-10 border border-slate-300 rounded-xl px-1 py-1 cursor-pointer" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={salvarMeta} disabled={salvandoMeta}
                  className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl text-sm">
                  {salvandoMeta ? "Salvando..." : editandoMetaId !== null ? "💾 Salvar alterações" : "🎯 Criar Meta"}
                </button>
                {editandoMetaId !== null && (
                  <button onClick={() => { setFormMeta(emptyMeta); setEditandoMetaId(null); }}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold px-5 py-2.5 rounded-xl text-sm">
                    Cancelar
                  </button>
                )}
              </div>
            </div>

            {/* Lista de metas */}
            {metas.length === 0 ? (
              <div className="bg-white rounded-2xl shadow p-12 text-center">
                <p className="text-5xl mb-3">🎯</p>
                <p className="text-slate-500">Nenhuma meta criada ainda.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {metas.map((m) => {
                  const pct = m.valor_objetivo > 0 ? Math.min((m.valor_atual / m.valor_objetivo) * 100, 100) : 0;
                  const falta = Math.max(m.valor_objetivo - m.valor_atual, 0);
                  return (
                    <div key={m.id} className="bg-white rounded-2xl shadow p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-bold text-slate-800 text-lg">{m.emoji} {m.nome}</p>
                          {m.prazo && <p className="text-xs text-slate-400 mt-0.5">Prazo: {m.prazo.split("-").reverse().join("/")}</p>}
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => {
                            setFormMeta({ nome: m.nome, emoji: m.emoji, valor_objetivo: String(m.valor_objetivo), valor_atual: String(m.valor_atual), prazo: m.prazo ?? "", cor: m.cor });
                            setEditandoMetaId(m.id);
                          }} className="text-slate-300 hover:text-amber-400 text-xs">✏️</button>
                          <button onClick={() => deletarMeta(m.id)} className="text-slate-300 hover:text-red-400 text-xs">🗑️</button>
                        </div>
                      </div>

                      <ProgressBar value={m.valor_atual} max={m.valor_objetivo} cor={m.cor} />

                      <div className="flex items-center justify-between mt-2 text-sm">
                        <span className="text-slate-500">{fmt(m.valor_atual)} de {fmt(m.valor_objetivo)}</span>
                        <span className="font-bold" style={{ color: m.cor }}>{pct.toFixed(0)}%</span>
                      </div>

                      {falta > 0 && <p className="text-xs text-slate-400 mt-1">Faltam {fmt(falta)}</p>}
                      {pct >= 100 && <p className="text-xs text-emerald-600 font-semibold mt-1">🎉 Meta atingida!</p>}

                      {/* Aportar */}
                      {aporteMeta?.id === m.id ? (
                        <div className="mt-3 flex gap-2">
                          <input type="number" step="0.01" min="0" value={aporteMeta.valor}
                            onChange={(e) => setAporteMeta({ ...aporteMeta, valor: e.target.value })}
                            placeholder="Valor do aporte"
                            className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                          <button onClick={aportarMeta} className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-3 py-1.5 rounded-lg text-xs">✓</button>
                          <button onClick={() => setAporteMeta(null)} className="bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs">✕</button>
                        </div>
                      ) : (
                        <button onClick={() => setAporteMeta({ id: m.id, valor: "" })}
                          className="mt-3 w-full py-1.5 rounded-xl text-sm font-semibold bg-slate-50 text-slate-500 hover:bg-violet-50 hover:text-violet-600 transition-colors">
                          + Aportar
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ RELATÓRIOS ═══ */}
        {aba === "relatorios" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 flex-wrap">
              <select value={filtroAno} onChange={(e) => setFiltroAno(Number(e.target.value))}
                className="border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white">
                {[now.getFullYear() - 1, now.getFullYear()].map((y) => <option key={y}>{y}</option>)}
              </select>
            </div>

            {/* KPIs anuais */}
            {(() => {
              const tr = lancamentos.filter((l) => l.tipo === "receita").reduce((a, l) => a + l.valor, 0);
              const td = lancamentos.filter((l) => l.tipo === "despesa").reduce((a, l) => a + l.valor, 0);
              return (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <KPI label="Total Receitas" valor={fmt(tr)} emoji="💚" cor="bg-emerald-50 text-emerald-800" />
                  <KPI label="Total Despesas" valor={fmt(td)} emoji="🔴" cor="bg-rose-50 text-rose-800" />
                  <KPI label="Saldo Anual" valor={fmt(tr - td)} emoji={tr - td >= 0 ? "✅" : "⚠️"} cor={tr - td >= 0 ? "bg-blue-50 text-blue-800" : "bg-red-50 text-red-800"} />
                </div>
              );
            })()}

            {/* Gráfico anual */}
            <div className="bg-white rounded-2xl shadow p-5">
              <h3 className="font-bold text-slate-700 mb-3 text-sm">Receitas vs Despesas por mês — {filtroAno}</h3>
              <MiniBar entries={dadosAnuais.map((d) => ({ label: d.mes, receita: d.receita, despesa: d.despesa }))} />
            </div>

            {/* Tabela mensal */}
            <div className="bg-white rounded-2xl shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-5 py-3 text-slate-500 font-semibold">Mês</th>
                    <th className="text-right px-5 py-3 text-slate-500 font-semibold">Receitas</th>
                    <th className="text-right px-5 py-3 text-slate-500 font-semibold">Despesas</th>
                    <th className="text-right px-5 py-3 text-slate-500 font-semibold">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {dadosAnuais.map((m, i) => {
                    const s = m.receita - m.despesa;
                    return (
                      <tr key={i} className={`hover:bg-slate-50 ${m.receita === 0 && m.despesa === 0 ? "opacity-40" : ""}`}>
                        <td className="px-5 py-3 font-medium text-slate-700">{m.mes}/{filtroAno}</td>
                        <td className="px-5 py-3 text-right text-emerald-600 font-semibold">{fmt(m.receita)}</td>
                        <td className="px-5 py-3 text-right text-rose-500">{fmt(m.despesa)}</td>
                        <td className={`px-5 py-3 text-right font-bold ${s >= 0 ? "text-blue-600" : "text-red-500"}`}>{fmt(s)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50 border-t font-bold">
                  {(() => {
                    const tr = dadosAnuais.reduce((a, m) => a + m.receita, 0);
                    const td = dadosAnuais.reduce((a, m) => a + m.despesa, 0);
                    return (
                      <tr>
                        <td className="px-5 py-3 text-slate-700">TOTAL {filtroAno}</td>
                        <td className="px-5 py-3 text-right text-emerald-700">{fmt(tr)}</td>
                        <td className="px-5 py-3 text-right text-rose-600">{fmt(td)}</td>
                        <td className={`px-5 py-3 text-right ${tr - td >= 0 ? "text-blue-700" : "text-red-600"}`}>{fmt(tr - td)}</td>
                      </tr>
                    );
                  })()}
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
    </AppShell>
  );
}
