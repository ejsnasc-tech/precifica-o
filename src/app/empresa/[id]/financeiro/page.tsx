"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Empresa { id: number; nome: string; descricao: string; cor: string; emoji: string; }

interface LancItem { categoria?: string; descricao: string; quantidade?: number; valor_unitario?: number; valor: number; }

interface Lancamento {
  id: number;
  empresa_id: number;
  data: string;
  vendas: number;
  itens: LancItem[];
  itens_vendas: LancItem[];
  obs: string;
  criado_em: string;
}

interface Socio { nome: string; percentual: number; retirada?: number; }

type Tab = "dashboard" | "lancamentos" | "semanal" | "mensal" | "anual" | "socios";

// ─── Constantes ───────────────────────────────────────────────────────────────

const CATEGORIAS = ["insumos", "embalagens", "limpeza", "pessoal", "equipamentos", "outros"] as const;
type Categoria = typeof CATEGORIAS[number];

const CAT_LABEL: Record<string, string> = {
  insumos: "Insumos", embalagens: "Embalagens", limpeza: "Limpeza",
  pessoal: "Pessoal", equipamentos: "Equipamentos", outros: "Outros",
};

const CAT_COLOR: Record<string, string> = {
  insumos: "#10b981", embalagens: "#3b82f6", limpeza: "#8b5cf6",
  pessoal: "#f97316", equipamentos: "#06b6d4", outros: "#94a3b8",
};

const CATEGORIAS_VENDA = ["sucos", "vitaminas", "lanches", "delivery", "outros"] as const;
type CategoriaVenda = typeof CATEGORIAS_VENDA[number];

const CAT_VENDA_LABEL: Record<string, string> = {
  sucos: "Sucos", vitaminas: "Vitaminas", lanches: "Lanches",
  delivery: "Delivery", outros: "Outros",
};

const CAT_VENDA_COLOR: Record<string, string> = {
  sucos: "#10b981", vitaminas: "#34d399", lanches: "#059669",
  delivery: "#6ee7b7", outros: "#94a3b8",
};

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const DIAS_SEMANA = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

// ─── Utilitários ─────────────────────────────────────────────────────────────

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtPct = (v: number) => v.toFixed(1) + "%";

function compras(l: Lancamento) { return l.itens.reduce((a, i) => a + i.valor, 0); }
function lucro(l: Lancamento) { return l.vendas - compras(l); }
function margem(l: Lancamento) { return l.vendas > 0 ? (lucro(l) / l.vendas) * 100 : 0; }

function hoje() { return new Date().toISOString().slice(0, 10); }

// ─── Gráfico de Barras (vendas vs compras) ───────────────────────────────────

function BarDuploChart({
  entries,
}: {
  entries: { label: string; vendas: number; compras: number }[];
}) {
  if (entries.length === 0) return <p className="text-slate-400 text-sm text-center py-8">Sem dados</p>;
  const max = Math.max(...entries.flatMap((e) => [e.vendas, e.compras]), 1);
  const H = 100;
  const bW = 10;
  const gap = 2;
  const slotW = 32;
  const W = entries.length * slotW;

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-4 mb-2 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#10b981" }} /> Vendas</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#f97316" }} /> Compras</span>
      </div>
      <svg viewBox={`0 0 ${Math.max(W, 200)} ${H + 28}`} style={{ width: Math.max(W, 200), height: H + 28 }} className="overflow-visible">
        {entries.map((e, i) => {
          const x = i * slotW + 4;
          const vh = Math.round((e.vendas / max) * H);
          const ch = Math.round((e.compras / max) * H);
          return (
            <g key={i}>
              <rect x={x} y={H - vh} width={bW} height={vh} fill="#10b981" rx={2} />
              <rect x={x + bW + gap} y={H - ch} width={bW} height={ch} fill="#f97316" rx={2} />
              <text x={x + bW + gap / 2} y={H + 14} textAnchor="middle" fontSize={8} fill="#94a3b8">{e.label}</text>
            </g>
          );
        })}
        <line x1={0} y1={H} x2={Math.max(W, 200)} y2={H} stroke="#334155" strokeWidth={1} />
      </svg>
    </div>
  );
}

// ─── Gráfico Rosca (categorias) ──────────────────────────────────────────────

function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((a, d) => a + d.value, 0);
  if (total === 0) return <p className="text-slate-400 text-sm text-center">Sem despesas</p>;

  const R = 48, r = 28, cx = 64, cy = 64;

  const filtered = data.filter((d) => d.value > 0);
  const startAngles = filtered.reduce<number[]>((acc, _d) => {
    const prev = acc.length > 0 ? acc[acc.length - 1] : -Math.PI / 2;
    const prevSweep = acc.length > 0 ? (filtered[acc.length - 1].value / total) * Math.PI * 2 : 0;
    return [...acc, prev + (acc.length === 0 ? 0 : prevSweep)];
  }, []);

  const arcs = filtered.map((d, i) => {
    const a0 = i === 0 ? -Math.PI / 2 : startAngles[i];
    const sweep = (d.value / total) * Math.PI * 2;
    const a1 = a0 + sweep;
    const x1o = cx + R * Math.cos(a0), y1o = cy + R * Math.sin(a0);
    const x1i = cx + r * Math.cos(a0), y1i = cy + r * Math.sin(a0);
    const x2o = cx + R * Math.cos(a1), y2o = cy + R * Math.sin(a1);
    const x2i = cx + r * Math.cos(a1), y2i = cy + r * Math.sin(a1);
    const large = sweep > Math.PI ? 1 : 0;
    return {
      ...d,
      path: `M ${x1o} ${y1o} A ${R} ${R} 0 ${large} 1 ${x2o} ${y2o} L ${x2i} ${y2i} A ${r} ${r} 0 ${large} 0 ${x1i} ${y1i} Z`,
      pct: ((d.value / total) * 100).toFixed(1),
    };
  });

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <svg viewBox="0 0 128 128" className="w-28 h-28 shrink-0">
        {arcs.map((a, i) => <path key={i} d={a.path} fill={a.color} />)}
      </svg>
      <div className="space-y-1">
        {arcs.map((a) => (
          <div key={a.label} className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: a.color }} />
            <span className="text-slate-600">{a.label}</span>
            <span className="font-semibold text-slate-800">{a.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Linha de Tendência ───────────────────────────────────────────────────────

function LineChart({ pontos, label }: { pontos: { x: string; y: number }[]; label: string }) {
  if (pontos.length < 2) return <p className="text-slate-400 text-sm text-center py-4">Dados insuficientes</p>;
  const H = 80, W = 280;
  const max = Math.max(...pontos.map((p) => p.y), 1);
  const min = Math.min(...pontos.map((p) => p.y), 0);
  const range = max - min || 1;
  const xs = pontos.map((_, i) => (i / (pontos.length - 1)) * W);
  const ys = pontos.map((p) => H - ((p.y - min) / range) * H);
  const path = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x} ${ys[i]}`).join(" ");

  return (
    <div>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <svg viewBox={`0 0 ${W} ${H + 16}`} className="w-full">
        <polyline points={xs.map((x, i) => `${x},${ys[i]}`).join(" ")} fill="none" stroke="#6366f1" strokeWidth={2} strokeLinejoin="round" />
        <path d={`${path} L ${W} ${H} L 0 ${H} Z`} fill="rgba(99,102,241,0.1)" />
        {[0, Math.floor(pontos.length / 2), pontos.length - 1].map((idx) => (
          <text key={idx} x={xs[idx]} y={H + 13} textAnchor="middle" fontSize={8} fill="#94a3b8">
            {pontos[idx].x}
          </text>
        ))}
        <line x1={0} y1={H} x2={W} y2={H} stroke="#334155" strokeWidth={1} />
      </svg>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KPI({ label, valor, sub, cor }: { label: string; valor: string; sub?: string; cor: string }) {
  return (
    <div className={`rounded-2xl p-4 ${cor}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-2xl font-extrabold mt-1">{valor}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function FinanceiroPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [socios, setSocios] = useState<Socio[]>([]);
  const [aba, setAba] = useState<Tab>("dashboard");

  const now = new Date();
  const [filtroAno, setFiltroAno] = useState(now.getFullYear());
  const [filtroMes, setFiltroMes] = useState(now.getMonth() + 1);

  // Form lançamento
  const emptyForm = { data: hoje(), vendas: "", obs: "", itens: [] as LancItem[], itens_vendas: [] as LancItem[] };
  const [form, setForm] = useState(emptyForm);
  const [novoItem, setNovoItem] = useState<{ descricao: string; quantidade: string; valor_unitario: string }>({
    descricao: "", quantidade: "1", valor_unitario: "",
  });
  const [novoItemVenda, setNovoItemVenda] = useState<{ descricao: string; quantidade: string; valor_unitario: string }>({
    descricao: "", quantidade: "1", valor_unitario: "",
  });
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [salvando, setSalvando] = useState(false);

  // Sócios form
  const [novoSocio, setNovoSocio] = useState({ nome: "", percentual: "" });
  const [salvandoSocios, setSalvandoSocios] = useState(false);

  // Semana atual
  const [semanaRef, setSemanaRef] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().slice(0, 10);
  });

  const carregouAno = useRef<number | null>(null);

  const load = useCallback(async (ano: number) => {
    const [eRes, lRes, sRes] = await Promise.all([
      fetch("/api/empresas"),
      fetch(`/api/lancamentos?empresaId=${id}&ano=${ano}`),
      fetch(`/api/socios/${id}`),
    ]);
    if (eRes.status === 401) { router.push("/login"); return; }

    const empresas = await eRes.json() as Empresa[];
    const e = empresas.find((x) => x.id === Number(id));
    if (!e) { router.push("/dashboard"); return; }
    setEmpresa(e);

    if (lRes.ok) setLancamentos(await lRes.json() as Lancamento[]);
    if (sRes.ok) setSocios((await sRes.json() as { dados: Socio[] }).dados);
    carregouAno.current = ano;
  }, [id, router]);

  useEffect(() => { void load(filtroAno); }, [load, filtroAno]);

  // ── Dados filtrados ────────────────────────────────────────────────────────

  const doMes = lancamentos.filter((l) => l.data.startsWith(`${filtroAno}-${String(filtroMes).padStart(2, "0")}-`));

  const totalVendas = doMes.reduce((a, l) => a + l.vendas, 0);
  const totalCompras = doMes.reduce((a, l) => a + compras(l), 0);
  const totalLucro = totalVendas - totalCompras;
  const margemMes = totalVendas > 0 ? (totalLucro / totalVendas) * 100 : 0;

  // Categorias para donut
  const catData = CATEGORIAS.map((cat) => ({
    label: CAT_LABEL[cat],
    value: doMes.flatMap((l) => l.itens).filter((i) => i.categoria === cat).reduce((a, i) => a + i.valor, 0),
    color: CAT_COLOR[cat],
  }));

  // Últimos 7 dias do mês (ou do mês todo se ≤ 7 entradas)
  const ultimos7 = doMes.slice(0, 7).reverse().map((l) => ({
    label: l.data.slice(8),
    vendas: l.vendas,
    compras: compras(l),
  }));

  // Tendência de lucro por dia no mês
  const tendenciaMes = doMes.slice().reverse().map((l) => ({ x: l.data.slice(5), y: lucro(l) }));

  // Dados anuais (por mês)
  const dadosAnuais = Array.from({ length: 12 }, (_, m) => {
    const key = `${filtroAno}-${String(m + 1).padStart(2, "0")}-`;
    const ls = lancamentos.filter((l) => l.data.startsWith(key));
    return {
      mes: MESES[m],
      vendas: ls.reduce((a, l) => a + l.vendas, 0),
      compras: ls.reduce((a, l) => a + compras(l), 0),
      lucro: ls.reduce((a, l) => a + lucro(l), 0),
      entradas: ls.length,
    };
  });

  // Semana ref
  const semanaFim = (() => {
    const d = new Date(semanaRef + "T12:00:00");
    d.setDate(d.getDate() + 6);
    return d.toISOString().slice(0, 10);
  })();
  const daSemana = lancamentos.filter((l) => l.data >= semanaRef && l.data <= semanaFim);
  const diasSemana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(semanaRef + "T12:00:00");
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const ls = daSemana.filter((l) => l.data === key);
    return {
      label: DIAS_SEMANA[d.getDay()] + " " + key.slice(8),
      date: key,
      vendas: ls.reduce((a, l) => a + l.vendas, 0),
      compras: ls.reduce((a, l) => a + compras(l), 0),
      lucro: ls.reduce((a, l) => a + lucro(l), 0),
    };
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  function addItem() {
    const qtd = parseFloat(novoItem.quantidade) || 1;
    const unit = parseFloat(novoItem.valor_unitario);
    if (!novoItem.descricao.trim() || isNaN(unit) || unit <= 0) return;
    const valor = parseFloat((qtd * unit).toFixed(2));
    setForm((f) => ({ ...f, itens: [...f.itens, { descricao: novoItem.descricao.trim(), quantidade: qtd, valor_unitario: unit, valor }] }));
    setNovoItem({ descricao: "", quantidade: "1", valor_unitario: "" });
  }

  function removeItem(idx: number) {
    setForm((f) => ({ ...f, itens: f.itens.filter((_, i) => i !== idx) }));
  }

  function addItemVenda() {
    const qtd = parseFloat(novoItemVenda.quantidade) || 1;
    const unit = parseFloat(novoItemVenda.valor_unitario);
    if (!novoItemVenda.descricao.trim() || isNaN(unit) || unit <= 0) return;
    const valor = parseFloat((qtd * unit).toFixed(2));
    setForm((f) => ({ ...f, itens_vendas: [...f.itens_vendas, { descricao: novoItemVenda.descricao.trim(), quantidade: qtd, valor_unitario: unit, valor }] }));
    setNovoItemVenda({ descricao: "", quantidade: "1", valor_unitario: "" });
  }

  function removeItemVenda(idx: number) {
    setForm((f) => ({ ...f, itens_vendas: f.itens_vendas.filter((_, i) => i !== idx) }));
  }

  const formCompras = form.itens.reduce((a, i) => a + i.valor, 0);
  const formVendasAuto = form.itens_vendas.length > 0 ? form.itens_vendas.reduce((a, i) => a + i.valor, 0) : null;
  const formVendasTotal = formVendasAuto ?? (parseFloat(form.vendas) || 0);
  const formLucro = formVendasTotal - formCompras;

  async function salvar() {
    const v = formVendasTotal;
    if (isNaN(v) || v < 0 || !form.data) return;
    setSalvando(true);
    const body = { empresa_id: Number(id), data: form.data, vendas: v, itens: form.itens, itens_vendas: form.itens_vendas, obs: form.obs };

    if (editandoId !== null) {
      await fetch(`/api/lancamentos/${editandoId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/lancamentos", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
    }

    setForm(emptyForm);
    setEditandoId(null);
    setSalvando(false);
    void load(filtroAno);
  }

  async function deletar(lancId: number) {
    if (!confirm("Excluir este lançamento?")) return;
    await fetch(`/api/lancamentos/${lancId}`, { method: "DELETE" });
    void load(filtroAno);
  }

  function iniciarEdicao(l: Lancamento) {
    setForm({ data: l.data, vendas: String(l.vendas), obs: l.obs, itens: [...l.itens], itens_vendas: [...(l.itens_vendas ?? [])] });
    setEditandoId(l.id);
    setAba("lancamentos");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function salvarSocios() {
    setSalvandoSocios(true);
    await fetch(`/api/socios/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dados: socios }),
    });
    setSalvandoSocios(false);
  }

  function addSocio() {
    const pct = parseFloat(novoSocio.percentual);
    if (!novoSocio.nome.trim() || isNaN(pct)) return;
    setSocios((s) => [...s, { nome: novoSocio.nome.trim(), percentual: pct }]);
    setNovoSocio({ nome: "", percentual: "" });
  }

  function exportar() {
    const json = JSON.stringify({ empresa: empresa?.nome, lancamentos, socios, exportado: new Date().toISOString() }, null, 2);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    a.download = `financeiro-${empresa?.nome.toLowerCase().replace(/\s+/g, "-")}-${hoje()}.json`;
    a.click();
  }

  if (!empresa) return <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-400">Carregando...</div>;

  const TABS: { key: Tab; label: string }[] = [
    { key: "dashboard", label: "📊 Dashboard" },
    { key: "lancamentos", label: "➕ Lançamentos" },
    { key: "semanal", label: "📅 Semanal" },
    { key: "mensal", label: "📆 Mensal" },
    { key: "anual", label: "📈 Anual" },
    { key: "socios", label: "🤝 Sócios" },
  ];

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className={`bg-gradient-to-r ${empresa.cor} p-6 shadow-lg`}>
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push(`/empresa/${id}`)} className="text-white hover:opacity-70 text-2xl">←</button>
            <div>
              <h1 className="text-2xl font-extrabold text-white">💰 Financeiro · {empresa.emoji} {empresa.nome}</h1>
              {empresa.descricao && <p className="text-white/70 text-sm">{empresa.descricao}</p>}
            </div>
          </div>
          <button onClick={exportar} className="bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-4 py-2 rounded-xl">
            ⬇️ Exportar JSON
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        {/* Abas */}
        <div className="flex flex-wrap gap-2 mb-6">
          {TABS.map(({ key, label }) => (
            <button key={key} onClick={() => setAba(key)}
              className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${aba === key ? "bg-white shadow text-slate-800" : "text-slate-500 hover:bg-white/60"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* ═══ ABA DASHBOARD ═══ */}
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
              <KPI label="Vendas" valor={fmt(totalVendas)} cor="bg-green-50 text-green-800" />
              <KPI label="Compras" valor={fmt(totalCompras)} cor="bg-orange-50 text-orange-800" />
              <KPI label="Lucro" valor={fmt(totalLucro)} cor={totalLucro >= 0 ? "bg-blue-50 text-blue-800" : "bg-red-50 text-red-800"} />
              <KPI label="Margem" valor={fmtPct(margemMes)} cor="bg-purple-50 text-purple-800" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Barras diárias */}
              <div className="bg-white rounded-2xl shadow p-5">
                <h3 className="font-bold text-slate-700 mb-3 text-sm">Vendas vs Compras (últimos lançamentos)</h3>
                <BarDuploChart entries={ultimos7} />
              </div>

              {/* Donut categorias */}
              <div className="bg-white rounded-2xl shadow p-5">
                <h3 className="font-bold text-slate-700 mb-3 text-sm">Despesas por Categoria</h3>
                <DonutChart data={catData} />
              </div>
            </div>

            {/* Tendência lucro */}
            <div className="bg-white rounded-2xl shadow p-5">
              <h3 className="font-bold text-slate-700 mb-3 text-sm">Tendência de Lucro no Mês</h3>
              <LineChart pontos={tendenciaMes} label="" />
            </div>

            {/* Tabela últimos lançamentos */}
            {doMes.length > 0 && (
              <div className="bg-white rounded-2xl shadow overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="font-bold text-slate-700 text-sm">Últimos Lançamentos</h3>
                </div>
                <div className="divide-y divide-slate-50">
                  {doMes.slice(0, 10).map((l) => (
                    <div key={l.id} className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-slate-50">
                      <span className="text-sm text-slate-500 shrink-0">{l.data.split("-").reverse().join("/")}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-slate-700">{l.obs || "—"}</span>
                      </div>
                      <div className="flex gap-4 text-sm shrink-0">
                        <span className="text-green-600 font-semibold">{fmt(l.vendas)}</span>
                        <span className="text-orange-500">-{fmt(compras(l))}</span>
                        <span className={`font-bold ${lucro(l) >= 0 ? "text-blue-600" : "text-red-500"}`}>{fmt(lucro(l))}</span>
                      </div>
                      <button onClick={() => iniciarEdicao(l)} className="text-slate-300 hover:text-blue-400 text-xs">✏️</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ ABA LANÇAMENTOS ═══ */}
        {aba === "lancamentos" && (
          <div className="space-y-6">
            {/* Formulário */}
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-lg font-bold text-slate-700 mb-4">
                {editandoId !== null ? "✏️ Editando Lançamento" : "➕ Novo Lançamento"}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="text-sm text-slate-600 block mb-1">Data</label>
                  <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                </div>
                <div>
                  <label className="text-sm text-slate-600 block mb-1">
                    Vendas (R$)
                    {formVendasAuto !== null && <span className="text-green-600 text-xs ml-2">✓ calculado pelos itens</span>}
                  </label>
                  <input type="number" step="0.01" min="0"
                    value={formVendasAuto !== null ? formVendasAuto.toFixed(2) : form.vendas}
                    onChange={(e) => formVendasAuto === null && setForm({ ...form, vendas: e.target.value })}
                    readOnly={formVendasAuto !== null}
                    placeholder="0,00"
                    className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ${formVendasAuto !== null ? "border-green-300 bg-green-50 text-green-700 cursor-default" : "border-slate-300 focus:ring-green-400"}`} />
                </div>
                <div>
                  <label className="text-sm text-slate-600 block mb-1">Observação</label>
                  <input value={form.obs} onChange={(e) => setForm({ ...form, obs: e.target.value })}
                    placeholder="Ex: Segunda-feira"
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                </div>
              </div>

              {/* Itens de venda */}
              <div className="bg-green-50 rounded-xl p-4 mb-4">
                <h3 className="text-sm font-bold text-slate-700 mb-1">💰 Detalhamento de Vendas <span className="font-normal text-slate-400">(opcional)</span></h3>
                <p className="text-xs text-slate-500 mb-3">
                  {formVendasAuto !== null
                    ? `Total calculado automaticamente a partir dos itens abaixo`
                    : `Adicione itens para detalhar — ou use apenas o campo "Vendas (R$)" acima`}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                  <input value={novoItemVenda.descricao} onChange={(e) => setNovoItemVenda({ ...novoItemVenda, descricao: e.target.value })}
                    placeholder="Produto / descrição" onKeyDown={(e) => e.key === "Enter" && addItemVenda()}
                    className="col-span-2 md:col-span-1 border border-green-300 rounded-lg px-3 py-2 text-sm" />
                  <input type="number" step="0.01" min="0" value={novoItemVenda.quantidade}
                    onChange={(e) => setNovoItemVenda({ ...novoItemVenda, quantidade: e.target.value })}
                    placeholder="Qtd"
                    className="border border-green-300 rounded-lg px-3 py-2 text-sm" />
                  <input type="number" step="0.01" min="0" value={novoItemVenda.valor_unitario}
                    onChange={(e) => setNovoItemVenda({ ...novoItemVenda, valor_unitario: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && addItemVenda()}
                    placeholder="Valor unit. (R$)"
                    className="border border-green-300 rounded-lg px-3 py-2 text-sm" />
                  <button onClick={addItemVenda}
                    className="bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg px-4 py-2 text-sm">
                    + Item
                  </button>
                </div>

                {form.itens_vendas.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead><tr className="text-slate-400 text-xs border-b">
                      <th className="text-left py-1">Produto</th>
                      <th className="text-right py-1">Qtd</th>
                      <th className="text-right py-1">Unit.</th>
                      <th className="text-right py-1">Total</th>
                      <th></th>
                    </tr></thead>
                    <tbody>
                      {form.itens_vendas.map((item, idx) => (
                        <tr key={idx} className="border-b border-green-100">
                          <td className="py-1.5 text-slate-700 font-medium">{item.descricao}</td>
                          <td className="py-1.5 text-right text-slate-500">{item.quantidade ?? 1}</td>
                          <td className="py-1.5 text-right text-slate-500">{fmt(item.valor_unitario ?? item.valor)}</td>
                          <td className="py-1.5 text-right font-semibold text-green-600">{fmt(item.valor)}</td>
                          <td className="py-1.5 text-right">
                            <button onClick={() => removeItemVenda(idx)} className="text-slate-300 hover:text-red-400">✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr>
                      <td colSpan={3} className="py-2 font-bold text-slate-700 text-xs">Total de vendas</td>
                      <td className="py-2 text-right font-bold text-green-700">{fmt(formVendasAuto!)}</td>
                      <td></td>
                    </tr></tfoot>
                  </table>
                ) : (
                  <p className="text-slate-400 text-sm text-center py-2">Nenhum item adicionado — total manual será usado</p>
                )}
              </div>

              {/* Itens de compra */}
              <div className="bg-slate-50 rounded-xl p-4 mb-4">
                <h3 className="text-sm font-bold text-slate-700 mb-3">🛒 Compras / Despesas</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                  <input value={novoItem.descricao} onChange={(e) => setNovoItem({ ...novoItem, descricao: e.target.value })}
                    placeholder="Produto / descrição" onKeyDown={(e) => e.key === "Enter" && addItem()}
                    className="col-span-2 md:col-span-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                  <input type="number" step="0.01" min="0" value={novoItem.quantidade}
                    onChange={(e) => setNovoItem({ ...novoItem, quantidade: e.target.value })}
                    placeholder="Qtd"
                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                  <input type="number" step="0.01" min="0" value={novoItem.valor_unitario}
                    onChange={(e) => setNovoItem({ ...novoItem, valor_unitario: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && addItem()}
                    placeholder="Valor unit. (R$)"
                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                  <button onClick={addItem}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg px-4 py-2 text-sm">
                    + Item
                  </button>
                </div>

                {form.itens.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead><tr className="text-slate-400 text-xs border-b">
                      <th className="text-left py-1">Produto / Descrição</th>
                      <th className="text-right py-1">Qtd</th>
                      <th className="text-right py-1">Unit.</th>
                      <th className="text-right py-1">Total</th>
                      <th></th>
                    </tr></thead>
                    <tbody>
                      {form.itens.map((item, idx) => (
                        <tr key={idx} className="border-b border-slate-100">
                          <td className="py-1.5 text-slate-700 font-medium">{item.descricao}</td>
                          <td className="py-1.5 text-right text-slate-500 text-xs">{item.quantidade ?? 1}</td>
                          <td className="py-1.5 text-right text-slate-500 text-xs">{fmt(item.valor_unitario ?? item.valor)}</td>
                          <td className="py-1.5 text-right font-semibold text-orange-600">{fmt(item.valor)}</td>
                          <td className="py-1.5 text-right">
                            <button onClick={() => removeItem(idx)} className="text-slate-300 hover:text-red-400">✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr>
                      <td colSpan={3} className="py-2 font-bold text-slate-700 text-xs">Total compras</td>
                      <td className="py-2 text-right font-bold text-orange-600">{fmt(formCompras)}</td>
                      <td></td>
                    </tr></tfoot>
                  </table>
                ) : (
                  <p className="text-slate-400 text-sm text-center py-2">Nenhuma despesa adicionada</p>
                )}
              </div>

              {/* Resultado rápido */}
              {(formVendasTotal > 0 || formCompras > 0) && (
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-green-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-slate-500">Vendas</p>
                    <p className="font-bold text-green-600">{fmt(formVendasTotal)}</p>
                  </div>
                  <div className="bg-orange-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-slate-500">Compras</p>
                    <p className="font-bold text-orange-500">{fmt(formCompras)}</p>
                  </div>
                  <div className={`rounded-xl p-3 text-center ${formLucro >= 0 ? "bg-blue-50" : "bg-red-50"}`}>
                    <p className="text-xs text-slate-500">Lucro</p>
                    <p className={`font-bold ${formLucro >= 0 ? "text-blue-600" : "text-red-500"}`}>{fmt(formLucro)}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={salvar} disabled={salvando}
                  className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl text-sm">
                  {salvando ? "Salvando..." : editandoId !== null ? "💾 Salvar alterações" : "💾 Salvar lançamento"}
                </button>
                {editandoId !== null && (
                  <button onClick={() => { setForm(emptyForm); setEditandoId(null); }}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold px-5 py-2.5 rounded-xl text-sm">
                    Cancelar
                  </button>
                )}
              </div>
            </div>

            {/* Lista de lançamentos */}
            <div className="space-y-3">
              {lancamentos.length === 0 && (
                <div className="bg-white rounded-2xl shadow p-12 text-center">
                  <p className="text-5xl mb-3">📋</p>
                  <p className="text-slate-500">Nenhum lançamento ainda. Use o formulário acima para começar.</p>
                </div>
              )}
              {lancamentos.map((l) => {
                const c = compras(l);
                const luc = lucro(l);
                return (
                  <div key={l.id} className="bg-white rounded-2xl shadow p-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-800">{l.data.split("-").reverse().join("/")}</span>
                          {l.obs && <span className="text-sm text-slate-500">· {l.obs}</span>}
                        </div>
                        <div className="flex gap-4 mt-2 text-sm flex-wrap">
                          <span className="text-green-600 font-semibold">Vendas: {fmt(l.vendas)}</span>
                          <span className="text-orange-500">Compras: {fmt(c)}</span>
                          <span className={`font-bold ${luc >= 0 ? "text-blue-600" : "text-red-500"}`}>
                            Lucro: {fmt(luc)} ({fmtPct(margem(l))})
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => iniciarEdicao(l)} className="bg-amber-100 text-amber-700 hover:bg-amber-200 px-3 py-1.5 rounded-lg text-xs font-semibold">✏️ Editar</button>
                        <button onClick={() => deletar(l.id)} className="bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-500 px-3 py-1.5 rounded-lg text-xs font-semibold">🗑️</button>
                      </div>
                    </div>

                    {(l.itens_vendas?.length > 0 || l.itens.length > 0) && (
                      <div className="mt-3 space-y-2">
                        {l.itens_vendas?.length > 0 && (
                          <details>
                            <summary className="text-xs text-green-600 cursor-pointer hover:text-green-700 font-medium">
                              💰 {l.itens_vendas.length} {l.itens_vendas.length === 1 ? "item de venda" : "itens de venda"}
                            </summary>
                            <div className="mt-2 space-y-1">
                              {l.itens_vendas.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-xs">
                                  <span className="px-1.5 py-0.5 rounded" style={{ background: (CAT_VENDA_COLOR[item.categoria ?? ""] ?? "#ccc") + "33", color: CAT_VENDA_COLOR[item.categoria ?? ""] ?? "#666" }}>
                                    {CAT_VENDA_LABEL[item.categoria ?? ""] ?? item.categoria}
                                  </span>
                                  <span className="flex-1 text-slate-600">{item.descricao}</span>
                                  <span className="font-semibold text-green-600">{fmt(item.valor)}</span>
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                        {l.itens.length > 0 && (
                          <details>
                            <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">
                              🛒 {l.itens.length} {l.itens.length === 1 ? "item de compra" : "itens de compra"}
                            </summary>
                            <div className="mt-2 space-y-1">
                              {l.itens.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-xs">
                                  <span className="flex-1 text-slate-600">{item.descricao}{item.quantidade && item.quantidade > 1 ? ` × ${item.quantidade}` : ""}</span>
                                  <span className="font-semibold text-orange-600">{fmt(item.valor)}</span>
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ ABA SEMANAL ═══ */}
        {aba === "semanal" && (
          <div className="space-y-6">
            {/* Nav semana */}
            <div className="flex items-center gap-3">
              <button onClick={() => {
                const d = new Date(semanaRef + "T12:00:00");
                d.setDate(d.getDate() - 7);
                setSemanaRef(d.toISOString().slice(0, 10));
              }} className="bg-white shadow rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">← Anterior</button>
              <span className="text-sm font-medium text-slate-700">
                {semanaRef.split("-").reverse().join("/")} — {semanaFim.split("-").reverse().join("/")}
              </span>
              <button onClick={() => {
                const d = new Date(semanaRef + "T12:00:00");
                d.setDate(d.getDate() + 7);
                setSemanaRef(d.toISOString().slice(0, 10));
              }} className="bg-white shadow rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Próxima →</button>
            </div>

            {/* Totais da semana */}
            <div className="grid grid-cols-3 gap-4">
              <KPI label="Vendas" valor={fmt(daSemana.reduce((a, l) => a + l.vendas, 0))} cor="bg-green-50 text-green-800" />
              <KPI label="Compras" valor={fmt(daSemana.reduce((a, l) => a + compras(l), 0))} cor="bg-orange-50 text-orange-800" />
              <KPI label="Lucro" valor={fmt(daSemana.reduce((a, l) => a + lucro(l), 0))} cor="bg-blue-50 text-blue-800" />
            </div>

            {/* Dias da semana */}
            <div className="bg-white rounded-2xl shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-5 py-3 font-semibold text-slate-500">Dia</th>
                    <th className="text-right px-5 py-3 font-semibold text-slate-500">Vendas</th>
                    <th className="text-right px-5 py-3 font-semibold text-slate-500">Compras</th>
                    <th className="text-right px-5 py-3 font-semibold text-slate-500">Lucro</th>
                    <th className="text-right px-5 py-3 font-semibold text-slate-500">Margem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {diasSemana.map((d) => (
                    <tr key={d.date} className={d.vendas === 0 && d.compras === 0 ? "opacity-40" : ""}>
                      <td className="px-5 py-3 font-medium text-slate-700">{d.label}</td>
                      <td className="px-5 py-3 text-right text-green-600 font-semibold">{fmt(d.vendas)}</td>
                      <td className="px-5 py-3 text-right text-orange-500">{fmt(d.compras)}</td>
                      <td className={`px-5 py-3 text-right font-bold ${d.lucro >= 0 ? "text-blue-600" : "text-red-500"}`}>{fmt(d.lucro)}</td>
                      <td className="px-5 py-3 text-right text-slate-500 text-xs">
                        {d.vendas > 0 ? fmtPct((d.lucro / d.vendas) * 100) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t font-bold">
                  <tr>
                    <td className="px-5 py-3 text-slate-700">TOTAL</td>
                    <td className="px-5 py-3 text-right text-green-700">{fmt(daSemana.reduce((a, l) => a + l.vendas, 0))}</td>
                    <td className="px-5 py-3 text-right text-orange-600">{fmt(daSemana.reduce((a, l) => a + compras(l), 0))}</td>
                    <td className="px-5 py-3 text-right text-blue-700">{fmt(daSemana.reduce((a, l) => a + lucro(l), 0))}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ═══ ABA MENSAL ═══ */}
        {aba === "mensal" && (
          <div className="space-y-6">
            {/* Seletor mês/ano */}
            <div className="flex items-center gap-3 flex-wrap">
              <select value={filtroMes} onChange={(e) => setFiltroMes(Number(e.target.value))}
                className="border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white">
                {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <select value={filtroAno} onChange={(e) => setFiltroAno(Number(e.target.value))}
                className="border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white">
                {[now.getFullYear() - 1, now.getFullYear()].map((y) => <option key={y}>{y}</option>)}
              </select>
            </div>

            {/* KPIs do mês */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPI label="Vendas" valor={fmt(totalVendas)} cor="bg-green-50 text-green-800" />
              <KPI label="Compras" valor={fmt(totalCompras)} cor="bg-orange-50 text-orange-800" />
              <KPI label="Lucro" valor={fmt(totalLucro)} cor={totalLucro >= 0 ? "bg-blue-50 text-blue-800" : "bg-red-50 text-red-800"} />
              <KPI label="Margem" valor={fmtPct(margemMes)} cor="bg-purple-50 text-purple-800" />
            </div>

            {/* Gráfico barras */}
            <div className="bg-white rounded-2xl shadow p-5">
              <h3 className="font-bold text-slate-700 mb-3 text-sm">Vendas vs Compras — {MESES[filtroMes - 1]}/{filtroAno}</h3>
              <BarDuploChart entries={doMes.slice().reverse().map((l) => ({ label: l.data.slice(8), vendas: l.vendas, compras: compras(l) }))} />
            </div>

            {/* Tabela completa do mês */}
            <div className="bg-white rounded-2xl shadow overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-700 text-sm">{MESES[filtroMes - 1]}/{filtroAno} — {doMes.length} entradas</h3>
              </div>
              {doMes.length === 0 ? (
                <p className="text-center text-slate-400 py-8">Sem lançamentos neste mês</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left px-5 py-3 text-slate-500 font-semibold">Data</th>
                      <th className="text-left px-5 py-3 text-slate-500 font-semibold">Obs</th>
                      <th className="text-right px-5 py-3 text-slate-500 font-semibold">Vendas</th>
                      <th className="text-right px-5 py-3 text-slate-500 font-semibold">Compras</th>
                      <th className="text-right px-5 py-3 text-slate-500 font-semibold">Lucro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {doMes.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => iniciarEdicao(l)}>
                        <td className="px-5 py-3 text-slate-600">{l.data.split("-").reverse().join("/")}</td>
                        <td className="px-5 py-3 text-slate-500 text-xs">{l.obs || "—"}</td>
                        <td className="px-5 py-3 text-right text-green-600 font-semibold">{fmt(l.vendas)}</td>
                        <td className="px-5 py-3 text-right text-orange-500">{fmt(compras(l))}</td>
                        <td className={`px-5 py-3 text-right font-bold ${lucro(l) >= 0 ? "text-blue-600" : "text-red-500"}`}>{fmt(lucro(l))}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t font-bold">
                    <tr>
                      <td colSpan={2} className="px-5 py-3 text-slate-700">TOTAL</td>
                      <td className="px-5 py-3 text-right text-green-700">{fmt(totalVendas)}</td>
                      <td className="px-5 py-3 text-right text-orange-600">{fmt(totalCompras)}</td>
                      <td className={`px-5 py-3 text-right ${totalLucro >= 0 ? "text-blue-700" : "text-red-600"}`}>{fmt(totalLucro)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>

            {/* Categorias */}
            <div className="bg-white rounded-2xl shadow p-5">
              <h3 className="font-bold text-slate-700 mb-4 text-sm">Despesas por Categoria</h3>
              <div className="flex gap-6 flex-wrap items-start">
                <DonutChart data={catData} />
                <div className="flex-1 space-y-2 min-w-[200px]">
                  {catData.filter((c) => c.value > 0).sort((a, b) => b.value - a.value).map((c) => (
                    <div key={c.label} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-sm" style={{ background: c.color }} />
                        <span className="text-slate-600">{c.label}</span>
                      </div>
                      <span className="font-semibold text-slate-800">{fmt(c.value)}</span>
                    </div>
                  ))}
                  {catData.every((c) => c.value === 0) && <p className="text-slate-400 text-sm">Sem despesas registradas</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ ABA ANUAL ═══ */}
        {aba === "anual" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <select value={filtroAno} onChange={(e) => setFiltroAno(Number(e.target.value))}
                className="border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white">
                {[now.getFullYear() - 1, now.getFullYear()].map((y) => <option key={y}>{y}</option>)}
              </select>
            </div>

            {/* KPIs anuais */}
            {(() => {
              const tv = dadosAnuais.reduce((a, m) => a + m.vendas, 0);
              const tc = dadosAnuais.reduce((a, m) => a + m.compras, 0);
              const tl = tv - tc;
              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <KPI label="Vendas Ano" valor={fmt(tv)} cor="bg-green-50 text-green-800" />
                  <KPI label="Compras Ano" valor={fmt(tc)} cor="bg-orange-50 text-orange-800" />
                  <KPI label="Lucro Ano" valor={fmt(tl)} cor={tl >= 0 ? "bg-blue-50 text-blue-800" : "bg-red-50 text-red-800"} />
                  <KPI label="Margem Média" valor={tv > 0 ? fmtPct((tl / tv) * 100) : "—"} cor="bg-purple-50 text-purple-800" />
                </div>
              );
            })()}

            {/* Gráfico anual */}
            <div className="bg-white rounded-2xl shadow p-5">
              <h3 className="font-bold text-slate-700 mb-3 text-sm">Vendas vs Compras — {filtroAno}</h3>
              <BarDuploChart
                entries={dadosAnuais.filter((m) => m.entradas > 0).map((m) => ({ label: m.mes, vendas: m.vendas, compras: m.compras }))}
              />
            </div>

            {/* Tendência lucro anual */}
            <div className="bg-white rounded-2xl shadow p-5">
              <LineChart
                pontos={dadosAnuais.filter((m) => m.entradas > 0).map((m) => ({ x: m.mes, y: m.lucro }))}
                label={`Lucro mensal — ${filtroAno}`}
              />
            </div>

            {/* Tabela mensal */}
            <div className="bg-white rounded-2xl shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-5 py-3 text-slate-500 font-semibold">Mês</th>
                    <th className="text-right px-5 py-3 text-slate-500 font-semibold">Entradas</th>
                    <th className="text-right px-5 py-3 text-slate-500 font-semibold">Vendas</th>
                    <th className="text-right px-5 py-3 text-slate-500 font-semibold">Compras</th>
                    <th className="text-right px-5 py-3 text-slate-500 font-semibold">Lucro</th>
                    <th className="text-right px-5 py-3 text-slate-500 font-semibold">Margem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {dadosAnuais.map((m, i) => (
                    <tr key={i} className={`hover:bg-slate-50 ${m.entradas === 0 ? "opacity-40" : ""}`}>
                      <td className="px-5 py-3 font-medium text-slate-700">{m.mes}</td>
                      <td className="px-5 py-3 text-right text-slate-500">{m.entradas}</td>
                      <td className="px-5 py-3 text-right text-green-600 font-semibold">{fmt(m.vendas)}</td>
                      <td className="px-5 py-3 text-right text-orange-500">{fmt(m.compras)}</td>
                      <td className={`px-5 py-3 text-right font-bold ${m.lucro >= 0 ? "text-blue-600" : "text-red-500"}`}>{fmt(m.lucro)}</td>
                      <td className="px-5 py-3 text-right text-slate-500 text-xs">
                        {m.vendas > 0 ? fmtPct((m.lucro / m.vendas) * 100) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t font-bold">
                  {(() => {
                    const tv = dadosAnuais.reduce((a, m) => a + m.vendas, 0);
                    const tc = dadosAnuais.reduce((a, m) => a + m.compras, 0);
                    const tl = tv - tc;
                    return (
                      <tr>
                        <td className="px-5 py-3 text-slate-700">TOTAL {filtroAno}</td>
                        <td className="px-5 py-3 text-right text-slate-500">{dadosAnuais.reduce((a, m) => a + m.entradas, 0)}</td>
                        <td className="px-5 py-3 text-right text-green-700">{fmt(tv)}</td>
                        <td className="px-5 py-3 text-right text-orange-600">{fmt(tc)}</td>
                        <td className={`px-5 py-3 text-right ${tl >= 0 ? "text-blue-700" : "text-red-600"}`}>{fmt(tl)}</td>
                        <td className="px-5 py-3 text-right text-slate-500 text-xs">{tv > 0 ? fmtPct((tl / tv) * 100) : "—"}</td>
                      </tr>
                    );
                  })()}
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ═══ ABA SÓCIOS ═══ */}
        {aba === "socios" && (
          <div className="space-y-6 max-w-2xl">
            {/* Lucro do mês selecionado */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <p className="text-sm text-blue-700">
                Distribuição baseada em <strong>{MESES[filtroMes - 1]}/{filtroAno}</strong> — Lucro: <strong>{fmt(totalLucro)}</strong>
              </p>
              <div className="flex gap-3 mt-2">
                <select value={filtroMes} onChange={(e) => setFiltroMes(Number(e.target.value))}
                  className="border border-blue-300 rounded-lg px-3 py-1.5 text-sm bg-white">
                  {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
                <select value={filtroAno} onChange={(e) => setFiltroAno(Number(e.target.value))}
                  className="border border-blue-300 rounded-lg px-3 py-1.5 text-sm bg-white">
                  {[now.getFullYear() - 1, now.getFullYear()].map((y) => <option key={y}>{y}</option>)}
                </select>
              </div>
            </div>

            {/* Distribuição atual */}
            {socios.length > 0 && (
              <div className="bg-white rounded-2xl shadow overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="font-bold text-slate-700 text-sm">Distribuição de Lucro</h3>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left px-5 py-3 text-slate-500 font-semibold">Sócio</th>
                      <th className="text-right px-5 py-3 text-slate-500 font-semibold">%</th>
                      <th className="text-right px-5 py-3 text-slate-500 font-semibold">Valor Devido</th>
                      <th className="text-right px-5 py-3 text-slate-500 font-semibold">Retirada</th>
                      <th className="text-right px-5 py-3 text-slate-500 font-semibold">Saldo</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {socios.map((s, i) => {
                      const devido = (totalLucro * s.percentual) / 100;
                      const retirada = s.retirada ?? 0;
                      const saldo = devido - retirada;
                      return (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-5 py-3 font-medium text-slate-800">{s.nome}</td>
                          <td className="px-5 py-3 text-right text-slate-600">{s.percentual}%</td>
                          <td className={`px-5 py-3 text-right font-bold ${totalLucro >= 0 ? "text-green-600" : "text-red-500"}`}>
                            {fmt(devido)}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <input
                              type="number" step="0.01" min="0"
                              value={retirada === 0 && s.retirada === undefined ? "" : retirada}
                              onChange={(e) => setSocios((prev) => prev.map((x, j) => j === i ? { ...x, retirada: parseFloat(e.target.value) || 0 } : x))}
                              placeholder="0,00"
                              className="w-28 border border-slate-300 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-300"
                            />
                          </td>
                          <td className={`px-5 py-3 text-right font-bold text-xs ${saldo >= 0 ? "text-blue-600" : "text-red-500"}`}>
                            {fmt(saldo)}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <button onClick={() => setSocios((prev) => prev.filter((_, j) => j !== i))}
                              className="text-slate-300 hover:text-red-400 text-xs">✕</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t">
                    <tr>
                      <td colSpan={2} className="px-5 py-3 text-xs text-slate-500">
                        Total: {socios.reduce((a, s) => a + s.percentual, 0).toFixed(1)}%
                        {socios.reduce((a, s) => a + s.percentual, 0) !== 100 && (
                          <span className="text-amber-500 ml-2">⚠️ Diferente de 100%</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right text-sm font-bold text-slate-700">
                        {fmt(socios.reduce((a, s) => a + (totalLucro * s.percentual) / 100, 0))}
                      </td>
                      <td className="px-5 py-3 text-right text-sm font-bold text-slate-700">
                        {fmt(socios.reduce((a, s) => a + (s.retirada ?? 0), 0))}
                      </td>
                      <td className="px-5 py-3 text-right text-sm font-bold text-blue-700">
                        {fmt(socios.reduce((a, s) => a + ((totalLucro * s.percentual / 100) - (s.retirada ?? 0)), 0))}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Adicionar sócio */}
            <div className="bg-white rounded-2xl shadow p-6">
              <h3 className="font-bold text-slate-700 mb-4 text-sm">+ Adicionar Sócio</h3>
              <div className="flex gap-3">
                <input value={novoSocio.nome} onChange={(e) => setNovoSocio({ ...novoSocio, nome: e.target.value })}
                  placeholder="Nome do sócio"
                  className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <input type="number" step="0.1" min="0" max="100" value={novoSocio.percentual}
                  onChange={(e) => setNovoSocio({ ...novoSocio, percentual: e.target.value })}
                  placeholder="%"
                  className="w-20 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <button onClick={addSocio}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-xl text-sm">
                  + Adicionar
                </button>
              </div>
            </div>

            <button onClick={salvarSocios} disabled={salvandoSocios}
              className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-3 rounded-2xl text-sm">
              {salvandoSocios ? "Salvando..." : "💾 Salvar Sócios"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
