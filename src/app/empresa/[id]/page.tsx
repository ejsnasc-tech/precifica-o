"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";

interface Empresa { id: number; nome: string; descricao: string; cor: string; emoji: string; }
interface Config {
  regime: string; anexo: string; aliquota_custom: number;
  taxa_debito: number; taxa_credito: number; taxa_pix: number; taxa_dinheiro: number;
  funcionarios_custo: number; funcionarios_qtd: number;
  gastos_variaveis: number; gastos_variaveis_tipo: "percent" | "fixed";
  perdas_pct: number;
}
interface GastoItem { id: number; empresa_id: number; nome: string; valor: number; }
interface Ingrediente { id: number; nome: string; quantidade: number; unidade: string; custo_por_unidade: number; }
interface Produto { id: number; nome: string; margem: number; ingredientes?: Ingrediente[]; }
interface CatalogoItem { id: number; empresa_id: number; nome: string; unidade: string; custo_por_unidade: number; }

const ALIQ: Record<string, number> = {
  "simples_nacional-I": 4.0, "simples_nacional-II": 4.5, "simples_nacional-III": 6.0,
  "simples_nacional-IV": 6.0, "simples_nacional-V": 15.5, "simples_nacional-VI": 16.93,
  lucro_presumido: 13.33, lucro_real: 34, mei: 0,
};

function getAliquota(config: Config): number {
  if (config.regime === "custom") return config.aliquota_custom;
  if (config.regime === "simples_nacional") {
    if (config.anexo === "custom") return config.aliquota_custom;
    return ALIQ[`simples_nacional-${config.anexo}`] ?? 4.0;
  }
  return ALIQ[config.regime] ?? 0;
}

function getRegLabel(config: Config): string {
  if (config.regime === "mei") return "MEI (0%)";
  if (config.regime === "lucro_presumido") return "Lucro Presumido";
  if (config.regime === "lucro_real") return "Lucro Real";
  if (config.regime === "custom") return `Personalizada ${config.aliquota_custom}%`;
  return `Simples Anexo ${config.anexo}`;
}

function calcSub(i: Ingrediente): number {
  if (i.unidade === "g" || i.unidade === "ml") return (i.custo_por_unidade / 1000) * i.quantidade;
  return i.custo_por_unidade * i.quantidade;
}

interface Calculo {
  ins: number; perdas: number; func: number; gv: number; imposto: number;
  custoTotal: number; lucro: number; precoBase: number;
  debito: number; credito: number; pix: number; dinheiro: number;
}

function calcular(
  ingredientes: Ingrediente[], margem: number, config: Config,
  overrideFunc: number, gvFixo: number, overridePerdas: number
): Calculo {
  const ins = ingredientes.reduce((a, i) => a + calcSub(i), 0);
  const perdas = ins * (overridePerdas / 100);
  const func = overrideFunc;
  const gv = gvFixo;
  const op = ins + perdas + func + gv;
  const aliq = getAliquota(config);
  const mDiv = 1 - margem / 100 - aliq / 100;
  const precoBase = mDiv > 0.01 ? op / mDiv : op * (1 + margem / 100);
  const imposto = precoBase * (aliq / 100);
  const custoTotal = op + imposto;
  const lucro = precoBase - custoTotal;

  const preco = (taxa: number) => {
    const d = 1 - margem / 100 - aliq / 100 - taxa / 100;
    return d > 0.01 ? op / d : precoBase;
  };

  return {
    ins, perdas, func, gv, imposto, custoTotal, lucro, precoBase,
    debito: preco(config.taxa_debito),
    credito: preco(config.taxa_credito),
    pix: preco(config.taxa_pix),
    dinheiro: preco(config.taxa_dinheiro),
  };
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function EmpresaPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [gastosItens, setGastosItens] = useState<GastoItem[]>([]);
  const [catalogo, setCatalogo] = useState<CatalogoItem[]>([]);
  const [aba, setAba] = useState<"form" | "lista" | "ingredientes" | "config">("form");

  // form produto
  const [nomeProd, setNomeProd] = useState("");
  const [margem, setMargem] = useState(30);
  const [ings, setIngs] = useState<(Omit<Ingrediente, "id"> & { localId: number })[]>([]);
  const [iNome, setINome] = useState(""); const [iCusto, setICusto] = useState(""); const [iQtd, setIQtd] = useState(""); const [iUn, setIUn] = useState("kg");
  const [overFunc, setOverFunc] = useState(""); const [overGv, setOverGv] = useState(""); const [overPerdas, setOverPerdas] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [msgSalvo, setMsgSalvo] = useState(false);
  // modo de cálculo
  const [modoCalc, setModoCalc] = useState<"margem" | "preco">("margem");
  const [precoVenda, setPrecoVenda] = useState("");
  // edição de produto salvo
  const [editandoProduto, setEditandoProduto] = useState<Produto | null>(null);

  // produto selecionado (lista)
  const [prodDetail, setProdDetail] = useState<Produto | null>(null);
  const [novoIngProd, setNovoIngProd] = useState({ nome: "", quantidade: "0", unidade: "kg", custo_por_unidade: "0" });

  // config form
  const [cfgForm, setCfgForm] = useState<Config | null>(null);
  const [salvandoCfg, setSalvandoCfg] = useState(false);
  const [novoGasto, setNovoGasto] = useState({ nome: "", valor: "" });
  const [editandoGasto, setEditandoGasto] = useState<{ id: number; valor: string } | null>(null);
  // catálogo
  const [novoCat, setNovoCat] = useState({ nome: "", unidade: "kg", custo_por_unidade: "" });
  const [editandoCat, setEditandoCat] = useState<{ id: number; nome: string; unidade: string; custo: string } | null>(null);
  // autocomplete no form de produto
  const [sugestoes, setSugestoes] = useState<CatalogoItem[]>([]);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  const localId = useRef(0);

  const load = useCallback(async () => {
    const [eRes, cRes, pRes, gRes, catRes] = await Promise.all([
      fetch("/api/empresas"),
      fetch(`/api/configuracoes/${id}`),
      fetch(`/api/produtos?empresaId=${id}`),
      fetch(`/api/gastos-variaveis?empresaId=${id}`),
      fetch(`/api/catalogo-ingredientes?empresaId=${id}`),
    ]);
    if (eRes.status === 401) { router.push("/login"); return; }
    const empresas = await eRes.json() as Empresa[];
    const e = empresas.find((x) => x.id === Number(id));
    if (!e) { router.push("/dashboard"); return; }
    setEmpresa(e);
    const c = await cRes.json() as Config;
    setConfig(c); setCfgForm(c);
    const p = await pRes.json() as Produto[];
    setProdutos(p);
    const g = await gRes.json() as GastoItem[];
    setGastosItens(g);
    const cat = await catRes.json() as CatalogoItem[];
    setCatalogo(cat);
  }, [id, router]);

  useEffect(() => { void load(); }, [load]);

  const gastosMensal = gastosItens.reduce((a, g) => a + g.valor, 0);
  const gastosPorProduto = config && config.funcionarios_qtd > 0 ? gastosMensal / config.funcionarios_qtd : 0;

  // sincronizar overrides com config quando config carrega
  useEffect(() => {
    if (!config) return;
    const fp = config.funcionarios_qtd > 0 ? config.funcionarios_custo / config.funcionarios_qtd : 0;
    setOverFunc(fp > 0 ? fp.toFixed(2) : "");
    setOverPerdas(String(config.perdas_pct));
  }, [config]);

  // atualizar overGv quando itens de gastos mudam
  useEffect(() => {
    if (!config) return;
    const gvPP = config.funcionarios_qtd > 0 ? gastosItens.reduce((a, g) => a + g.valor, 0) / config.funcionarios_qtd : 0;
    setOverGv(gvPP > 0 ? gvPP.toFixed(2) : "");
  }, [gastosItens, config]);

  const aliq = config ? getAliquota(config) : 0;

  // calcula margem implicita quando usuario digita o preço de venda
  const ingList = ings.map((i, idx) => ({ ...i, id: idx }));
  const opBase = config ? (() => {
    const ins = ingList.reduce((a, i) => a + calcSub(i), 0);
    const perdas = ins * ((parseFloat(overPerdas) || 0) / 100);
    return ins + perdas + (parseFloat(overFunc) || 0) + (parseFloat(overGv) || 0);
  })() : 0;

  const margemEfetiva = (() => {
    if (modoCalc === "preco") {
      const pv = parseFloat(precoVenda) || 0;
      if (pv > 0 && opBase > 0) {
        const m = (1 - aliq / 100 - opBase / pv) * 100;
        return Math.max(-999, m);
      }
      return 0;
    }
    return margem;
  })();

  const calc = config ? calcular(ingList, margemEfetiva, config,
    parseFloat(overFunc) || 0,
    parseFloat(overGv) || 0,
    parseFloat(overPerdas) || 0,
  ) : null;

  function addIng() {
    if (!iNome.trim() || !iCusto || !iQtd) return;
    setIngs((prev) => [...prev, { localId: localId.current++, nome: iNome.trim(), custo_por_unidade: parseFloat(iCusto), quantidade: parseFloat(iQtd), unidade: iUn }]);
    setINome(""); setICusto(""); setIQtd("");
  }

  function limparForm() {
    setNomeProd(""); setIngs([]); setMargem(30);
    setPrecoVenda(""); setModoCalc("margem"); setEditandoProduto(null);
  }

  async function salvarProduto() {
    if (!nomeProd.trim()) return;
    setSalvando(true);
    const margemFinal = Math.round(margemEfetiva * 10) / 10;

    if (editandoProduto) {
      // atualizar produto existente
      await fetch(`/api/produtos/${editandoProduto.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nomeProd, margem: margemFinal }),
      });
      // remover ingredientes antigos e recriar
      for (const ing of editandoProduto.ingredientes ?? []) {
        await fetch(`/api/ingredientes/${ing.id}`, { method: "DELETE" });
      }
      for (const ing of ings) {
        await fetch("/api/ingredientes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ produto_id: editandoProduto.id, nome: ing.nome, quantidade: ing.quantidade, unidade: ing.unidade, custo_por_unidade: ing.custo_por_unidade }),
        });
      }
    } else {
      // criar novo produto
      const res = await fetch("/api/produtos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresa_id: Number(id), nome: nomeProd, margem: margemFinal }),
      });
      const prod = await res.json() as Produto;
      for (const ing of ings) {
        await fetch("/api/ingredientes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ produto_id: prod.id, nome: ing.nome, quantidade: ing.quantidade, unidade: ing.unidade, custo_por_unidade: ing.custo_por_unidade }),
        });
      }
    }

    limparForm();
    setSalvando(false); setMsgSalvo(true);
    setTimeout(() => setMsgSalvo(false), 3000);
    void load();
  }

  async function iniciarEdicao(p: Produto) {
    const res = await fetch(`/api/produtos/${p.id}`);
    const detalhe = await res.json() as Produto;
    setEditandoProduto(detalhe);
    setNomeProd(detalhe.nome);
    setMargem(detalhe.margem);
    setModoCalc("margem");
    setPrecoVenda("");
    setIngs((detalhe.ingredientes ?? []).map((i) => ({ ...i, localId: localId.current++ })));
    setAba("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deletarProduto(prodId: number) {
    if (!confirm("Excluir este produto?")) return;
    await fetch(`/api/produtos/${prodId}`, { method: "DELETE" });
    if (prodDetail?.id === prodId) setProdDetail(null);
    void load();
  }

  async function loadProdDetail(p: Produto) {
    const res = await fetch(`/api/produtos/${p.id}`);
    setProdDetail(await res.json() as Produto);
  }

  async function addIngProd() {
    if (!prodDetail || !novoIngProd.nome.trim()) return;
    await fetch("/api/ingredientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ produto_id: prodDetail.id, nome: novoIngProd.nome, quantidade: parseFloat(novoIngProd.quantidade), unidade: novoIngProd.unidade, custo_por_unidade: parseFloat(novoIngProd.custo_por_unidade) }),
    });
    setNovoIngProd({ nome: "", quantidade: "0", unidade: "kg", custo_por_unidade: "0" });
    void loadProdDetail(prodDetail);
  }

  async function delIngProd(ingId: number) {
    await fetch(`/api/ingredientes/${ingId}`, { method: "DELETE" });
    if (prodDetail) void loadProdDetail(prodDetail);
  }

  async function salvarConfig() {
    if (!cfgForm) return;
    setSalvandoCfg(true);
    const res = await fetch(`/api/configuracoes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cfgForm) });
    const c = await res.json() as Config;
    setConfig(c); setCfgForm(c); setSalvandoCfg(false);
  }

  function gerarPDF(p?: Produto & { ingredientes: Ingrediente[] }) {
    const ingList = p ? p.ingredientes : ings.map((i, idx) => ({ ...i, id: idx }));
    const mg = p ? p.margem : margem;
    if (!config) return;
    const c = calcular(ingList, mg, config, parseFloat(overFunc) || 0, parseFloat(overGv) || 0, parseFloat(overPerdas) || 0);
    const nome = p ? p.nome : nomeProd;
    const linhasIng = ingList.map((i) => {
      const sub = calcSub(i);
      const base = (i.unidade === "g" || i.unidade === "ml") ? `R$${i.custo_por_unidade.toFixed(2)}/${i.unidade === "g" ? "kg" : "L"}` : `R$${i.custo_por_unidade.toFixed(2)}/${i.unidade}`;
      return `<tr><td>${i.nome} (${i.quantidade}${i.unidade})</td><td>${base}</td><td>R$ ${sub.toFixed(2)}</td></tr>`;
    }).join("");
    const linhasPag = [
      { l: "💳 Débito", v: c.debito, t: config.taxa_debito },
      { l: "💳 Crédito", v: c.credito, t: config.taxa_credito },
      { l: "💰 PIX", v: c.pix, t: config.taxa_pix },
      { l: "💵 Dinheiro", v: c.dinheiro, t: config.taxa_dinheiro },
    ].map((x) => `<tr><td>${x.l}</td><td>${x.t}%</td><td><b>R$ ${x.v.toFixed(2)}</b></td></tr>`).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${nome}</title>
    <style>body{font-family:Arial,sans-serif;padding:40px;color:#1e293b}h1{color:#1e40af;border-bottom:2px solid #1e40af;padding-bottom:10px}h2{color:#475569;margin-top:20px}table{width:100%;border-collapse:collapse}th{background:#f1f5f9;text-align:left;padding:8px;font-size:12px;color:#64748b}td{padding:8px;border-bottom:1px solid #e2e8f0;font-size:12px}.r{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #e2e8f0;font-size:12px}.rb{display:flex;justify-content:space-between;padding:8px 0;border-bottom:2px solid #cbd5e1;font-weight:bold;font-size:12px}.box{background:#eff6ff;border:2px solid #bfdbfe;border-radius:12px;padding:20px;text-align:center;margin-top:16px}.v{color:#16a34a}.r2{color:#ef4444}footer{margin-top:30px;text-align:center;color:#94a3b8;font-size:10px}</style></head><body>
    <h1>💰 ${nome}</h1><p><b>Empresa:</b> ${empresa?.nome} | <b>Data:</b> ${new Date().toLocaleDateString("pt-BR")} | <b>Regime:</b> ${getRegLabel(config)}</p>
    <h2>🧂 Ingredientes</h2><table><tr><th>Ingrediente</th><th>Custo base</th><th>Subtotal</th></tr>${linhasIng}</table>
    <h2>📊 Composição de Custo</h2>
    <div class="r"><span>🧂 Insumos</span><span>${fmt(c.ins)}</span></div>
    <div class="r"><span>🗑️ Perdas (${overPerdas || 0}%)</span><span class="r2">+ ${fmt(c.perdas)}</span></div>
    <div class="r"><span>👥 Funcionários</span><span class="r2">+ ${fmt(c.func)}</span></div>
    <div class="r"><span>⚡ Gastos Variáveis</span><span class="r2">+ ${fmt(c.gv)}</span></div>
    <div class="r"><span>🏛️ Imposto (${aliq.toFixed(1)}%)</span><span class="r2">+ ${fmt(c.imposto)}</span></div>
    <div class="rb"><span>📦 Custo Total</span><span>${fmt(c.custoTotal)}</span></div>
    <div class="r"><span class="v">💰 Lucro (${mg}%)</span><span class="v">${fmt(c.lucro)}</span></div>
    <div class="box"><p style="font-size:11px;color:#64748b;margin:0">PREÇO BASE DE VENDA</p><p style="font-size:38px;font-weight:900;color:#1d4ed8;margin:8px 0">R$ ${c.precoBase.toFixed(2)}</p></div>
    <h2>💳 Preço por Forma de Pagamento</h2>
    <table><tr><th>Forma</th><th>Taxa</th><th>Preço</th></tr>${linhasPag}</table>
    <footer>Precificação Pro • ${new Date().toLocaleString("pt-BR")}</footer></body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 500); }
  }

  if (!empresa || !config) return <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-400">Carregando...</div>;

  const funcPorProd = config.funcionarios_qtd > 0 ? config.funcionarios_custo / config.funcionarios_qtd : 0;

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className={`bg-gradient-to-r ${empresa.cor} p-6 shadow-lg`}>
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/dashboard")} className="text-white hover:opacity-70 text-2xl">←</button>
            <div>
              <h1 className="text-3xl font-extrabold text-white">{empresa.emoji} {empresa.nome}</h1>
              {empresa.descricao && <p className="text-white/80 text-sm">{empresa.descricao}</p>}
            </div>
          </div>
          <button
            onClick={() => router.push(`/empresa/${id}/financeiro`)}
            className="bg-white/20 hover:bg-white/30 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
          >
            💰 Módulo Financeiro
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        {/* Abas */}
        <div className="flex flex-wrap gap-2 mb-6">
          {([
            ["form", "➕ Novo Produto"],
            ["lista", `📋 Salvos (${produtos.length})`],
            ["ingredientes", `🧂 Ingredientes (${catalogo.length})`],
            ["config", "⚙️ Configurações"],
          ] as const).map(([key, label]) => (
            <button key={key} onClick={() => setAba(key)}
              className={`px-5 py-2 rounded-xl font-semibold text-sm transition-colors ${aba === key ? "bg-white shadow text-slate-800" : "text-slate-500 hover:bg-white/60"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* ABA: NOVO PRODUTO */}
        {aba === "form" && (
          <div className="space-y-6">
            {msgSalvo && <div className="bg-green-100 border border-green-300 text-green-700 rounded-xl px-4 py-3 font-semibold">✅ Produto {editandoProduto ? "atualizado" : "salvo"}!</div>}

            {editandoProduto && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-amber-800 font-semibold text-sm">✏️ Editando: <strong>{editandoProduto.nome}</strong></span>
                <button onClick={limparForm} className="text-amber-600 hover:text-amber-800 text-sm font-medium">Cancelar edição</button>
              </div>
            )}

            {/* Nome */}
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-lg font-bold text-slate-700 mb-4">📝 Nome do Produto</h2>
              <input value={nomeProd} onChange={(e) => setNomeProd(e.target.value)} placeholder="Ex: X-Burguer Especial"
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>

            {/* Ingredientes */}
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-lg font-bold text-slate-700 mb-1">🧂 Ingredientes</h2>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-xs text-blue-700">
                💡 <strong>g / ml:</strong> informe o preço por kg ou litro (convertemos automaticamente) &nbsp;|&nbsp; <strong>kg / L / un:</strong> preço direto
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
                {/* Nome com autocomplete */}
                <div className="col-span-2 relative">
                  <input
                    value={iNome}
                    onChange={(e) => {
                      setINome(e.target.value);
                      const q = e.target.value.trim().toLowerCase();
                      if (q.length >= 1) {
                        setSugestoes(catalogo.filter((c) => c.nome.toLowerCase().includes(q)));
                        setMostrarSugestoes(true);
                      } else {
                        setMostrarSugestoes(false);
                      }
                    }}
                    onBlur={() => setTimeout(() => setMostrarSugestoes(false), 150)}
                    placeholder="Nome do ingrediente"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  {mostrarSugestoes && sugestoes.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-20 bg-white border border-slate-200 rounded-xl shadow-lg mt-1 overflow-hidden">
                      {sugestoes.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onMouseDown={() => {
                            setINome(s.nome);
                            setICusto(String(s.custo_por_unidade));
                            setIUn(s.unidade);
                            setMostrarSugestoes(false);
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-blue-50 flex justify-between items-center gap-4 border-b border-slate-100 last:border-0"
                        >
                          <span className="font-medium text-slate-800">{s.nome}</span>
                          <span className="text-sm text-slate-400 shrink-0">{s.custo_por_unidade.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/{s.unidade}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input type="number" value={iCusto} onChange={(e) => setICusto(e.target.value)} placeholder="Custo R$" className="border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <input type="number" value={iQtd} onChange={(e) => setIQtd(e.target.value)} placeholder="Qtd" className="border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <select value={iUn} onChange={(e) => setIUn(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400">
                  {["kg","g","L","ml","un","cx","pc"].map((u) => <option key={u}>{u}</option>)}
                </select>
              </div>
              <button onClick={addIng} className={`bg-gradient-to-r ${empresa.cor} text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90`}>+ Adicionar</button>

              {ings.length > 0 && (
                <table className="w-full text-sm mt-4">
                  <thead><tr className="text-slate-500 border-b">
                    <th className="text-left py-2">Ingrediente</th>
                    <th className="text-right py-2">Custo base</th>
                    <th className="text-right py-2">Qtd</th>
                    <th className="text-right py-2">Subtotal</th>
                    <th></th>
                  </tr></thead>
                  <tbody>
                    {ings.map((i) => (
                      <tr key={i.localId} className="border-b hover:bg-slate-50">
                        <td className="py-2">{i.nome} <span className="text-slate-400">({i.unidade})</span>
                          {(i.unidade === "g" || i.unidade === "ml") && <span className="text-slate-400 text-xs ml-1">(R${i.custo_por_unidade.toFixed(2)}/{i.unidade === "g" ? "kg" : "L"})</span>}
                        </td>
                        <td className="text-right">R$ {i.custo_por_unidade.toFixed(2)}</td>
                        <td className="text-right">{i.quantidade}{i.unidade}</td>
                        <td className="text-right font-semibold">R$ {calcSub({ ...i, id: 0 }).toFixed(2)}</td>
                        <td className="text-right"><button onClick={() => setIngs((p) => p.filter((x) => x.localId !== i.localId))} className="text-red-400 hover:text-red-600 ml-2">✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Custos operacionais */}
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-lg font-bold text-slate-700 mb-1">🏭 Custos Operacionais</h2>
              <p className="text-slate-400 text-sm mb-4">Sincronizados das configurações. Edite aqui para ajustar só neste produto.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <label className="text-sm font-bold text-slate-700 block mb-2">👥 Funcionários por produto (R$)</label>
                  <input type="number" step="0.01" value={overFunc} onChange={(e) => setOverFunc(e.target.value)} placeholder="0,00"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  <p className="text-xs text-green-600 mt-1">Config: {fmt(funcPorProd)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <label className="text-sm font-bold text-slate-700 block mb-2">⚡ Gastos variáveis (R$/produto)</label>
                  <input type="number" step="0.01" value={overGv} onChange={(e) => setOverGv(e.target.value)} placeholder="0,00"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  <p className="text-xs text-yellow-600 mt-1">Config: {fmt(gastosPorProduto)}/prod · total {fmt(gastosMensal)}/mês</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <label className="text-sm font-bold text-slate-700 block mb-2">🗑️ Perdas (%)</label>
                  <input type="number" step="0.1" value={overPerdas} onChange={(e) => setOverPerdas(e.target.value)} placeholder="%"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  <p className="text-xs text-red-500 mt-1">Config: {config.perdas_pct}%</p>
                </div>
              </div>
            </div>

            {/* Margem / Preço de venda */}
            <div className="bg-white rounded-2xl shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-700">⚙️ Precificação</h2>
                <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
                  <button onClick={() => setModoCalc("margem")}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${modoCalc === "margem" ? "bg-white shadow text-slate-800" : "text-slate-500"}`}>
                    Margem %
                  </button>
                  <button onClick={() => setModoCalc("preco")}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${modoCalc === "preco" ? "bg-white shadow text-slate-800" : "text-slate-500"}`}>
                    Preço de venda
                  </button>
                </div>
              </div>

              {modoCalc === "margem" ? (
                <>
                  <label className="text-sm text-slate-600">Margem: <span className="font-bold text-slate-800">{margem}%</span></label>
                  <input type="range" min={0} max={200} value={margem} onChange={(e) => setMargem(Number(e.target.value))} className="w-full mt-2 accent-blue-600" />
                  <div className="flex justify-between text-xs text-slate-400 mt-1"><span>0%</span><span>100%</span><span>200%</span></div>
                </>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-slate-600 block mb-1">Quanto você quer vender? (R$)</label>
                    <input
                      type="number" step="0.01"
                      value={precoVenda}
                      onChange={(e) => setPrecoVenda(e.target.value)}
                      placeholder="Ex: 25,00"
                      className="w-full border border-slate-300 rounded-xl px-4 py-3 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  {parseFloat(precoVenda) > 0 && (
                    <div className={`rounded-xl p-3 text-sm font-semibold ${margemEfetiva >= 0 ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                      {margemEfetiva >= 0
                        ? `✅ Margem implícita: ${margemEfetiva.toFixed(1)}%`
                        : `⚠️ Preço abaixo do custo — margem negativa (${margemEfetiva.toFixed(1)}%)`}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Resultado */}
            {calc && (
              <div className="bg-white rounded-2xl shadow p-6">
                <h2 className="text-lg font-bold text-slate-700 mb-4">📊 Resultado</h2>
                <div className="space-y-1 mb-5">
                  {[
                    { l: "🧂 Insumos", v: calc.ins, cor: "" },
                    { l: "🗑️ Perdas", v: calc.perdas, cor: "text-red-500", prefix: "+ " },
                    { l: "👥 Funcionários", v: calc.func, cor: "text-red-500", prefix: "+ " },
                    { l: "⚡ Gastos Variáveis", v: calc.gv, cor: "text-red-500", prefix: "+ " },
                    { l: `🏛️ Imposto (${getRegLabel(config)} ${aliq.toFixed(1)}%)`, v: calc.imposto, cor: "text-red-500", prefix: "+ " },
                  ].map(({ l, v, cor, prefix }) => (
                    <div key={l} className="flex justify-between py-2 border-b border-slate-100">
                      <span className="text-sm text-slate-500">{l}</span>
                      <span className={`font-semibold ${cor}`}>{prefix}{fmt(v)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 border-b-2 border-slate-300">
                    <span className="text-sm font-bold text-slate-700">📦 Custo Total</span>
                    <span className="font-bold">{fmt(calc.custoTotal)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-sm font-bold text-green-600">💰 Lucro ({margemEfetiva.toFixed(1)}%)</span>
                    <span className="font-bold text-green-600">{fmt(calc.lucro)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-green-50 rounded-xl p-4 text-center">
                    <p className="text-xs text-slate-500 uppercase">Lucro</p>
                    <p className="text-3xl font-extrabold text-green-600 mt-1">{fmt(calc.lucro)}</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4 text-center border-2 border-blue-400">
                    <p className="text-xs text-blue-500 uppercase font-bold">💰 Preço de Venda</p>
                    <p className="text-4xl font-extrabold text-blue-700 mt-1">{fmt(calc.precoBase)}</p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 mb-4">
                  <p className="text-sm font-bold text-slate-700 mb-3">📊 Preço por forma de pagamento:</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      { l: `💳 Débito (${config.taxa_debito}%)`, v: calc.debito },
                      { l: `💳 Crédito (${config.taxa_credito}%)`, v: calc.credito },
                      { l: `💰 PIX (${config.taxa_pix}%)`, v: calc.pix },
                      { l: `💵 Dinheiro (${config.taxa_dinheiro}%)`, v: calc.dinheiro },
                    ].map(({ l, v }) => (
                      <div key={l} className="bg-white rounded-xl p-2 text-center border border-slate-200">
                        <p className="text-slate-500" style={{ fontSize: 10 }}>{l}</p>
                        <p className="font-bold text-blue-700 text-sm">{fmt(v)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={salvarProduto} disabled={salvando}
                    className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl">
                    {salvando ? "Salvando..." : editandoProduto ? "💾 Salvar alterações" : "💾 Salvar produto"}
                  </button>
                  <button onClick={() => gerarPDF()}
                    className="bg-red-500 hover:bg-red-600 text-white font-bold px-6 py-3 rounded-xl">
                    🖨️ PDF
                  </button>
                  {editandoProduto && (
                    <button onClick={limparForm} className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-6 py-3 rounded-xl">
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ABA: LISTA */}
        {aba === "lista" && (
          <div className="space-y-4">
            {produtos.length === 0 && (
              <div className="bg-white rounded-2xl shadow p-12 text-center">
                <p className="text-6xl mb-4">📭</p>
                <p className="text-slate-500">Nenhum produto salvo ainda.</p>
              </div>
            )}
            {produtos.map((p) => {
              const isOpen = prodDetail?.id === p.id;
              const ingList = prodDetail?.id === p.id ? (prodDetail.ingredientes ?? []) : [];
              const cProd = config ? calcular(ingList, p.margem, config, funcPorProd, gastosPorProduto, config.perdas_pct) : null;
              return (
                <div key={p.id} className="bg-white rounded-2xl shadow p-6">
                  <div className="flex justify-between items-start mb-4 flex-wrap gap-2">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">{p.nome}</h3>
                      <p className="text-slate-400 text-xs mt-1">Margem: {p.margem}% · {getRegLabel(config)}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => isOpen ? setProdDetail(null) : loadProdDetail(p)}
                        className="bg-slate-100 text-slate-600 hover:bg-slate-200 px-3 py-1 rounded-lg text-sm font-semibold">
                        {isOpen ? "Fechar" : "Ver detalhes"}
                      </button>
                      <button onClick={() => iniciarEdicao(p)}
                        className="bg-amber-100 text-amber-700 hover:bg-amber-200 px-3 py-1 rounded-lg text-sm font-semibold">✏️ Editar</button>
                      <button onClick={() => prodDetail?.id === p.id && prodDetail.ingredientes ? gerarPDF(prodDetail as Produto & { ingredientes: Ingrediente[] }) : undefined}
                        className="bg-red-100 text-red-600 hover:bg-red-200 px-3 py-1 rounded-lg text-sm font-semibold">🖨️</button>
                      <button onClick={() => deletarProduto(p.id)}
                        className="bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-500 px-3 py-1 rounded-lg text-sm font-semibold">🗑️</button>
                    </div>
                  </div>

                  {isOpen && cProd && (
                    <>
                      <div className="space-y-1 mb-4 text-sm">
                        {[
                          { l: "🧂 Insumos", v: cProd.ins, cor: "" },
                          { l: `🗑️ Perdas ${config.perdas_pct}%`, v: cProd.perdas, cor: "text-red-500", p: "+ " },
                          { l: "👥 Funcionários", v: cProd.func, cor: "text-red-500", p: "+ " },
                          { l: `⚡ Gastos Var.`, v: cProd.gv, cor: "text-red-500", p: "+ " },
                          { l: `🏛️ Imposto ${aliq.toFixed(1)}%`, v: cProd.imposto, cor: "text-red-500", p: "+ " },
                        ].map(({ l, v, cor, p: pr }) => (
                          <div key={l} className="flex justify-between py-1 border-b border-slate-100">
                            <span className="text-slate-500">{l}</span>
                            <span className={`font-semibold ${cor}`}>{pr}{fmt(v)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between py-1 border-b-2 border-slate-300">
                          <span className="font-bold text-slate-700">📦 Custo Total</span>
                          <span className="font-bold">{fmt(cProd.custoTotal)}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="font-bold text-green-600">💰 Lucro ({p.margem}%)</span>
                          <span className="font-bold text-green-600">{fmt(cProd.lucro)}</span>
                        </div>
                      </div>

                      <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-300 mb-4">
                        <p className="text-xs text-blue-500 font-semibold">💰 Preço Base de Venda</p>
                        <p className="font-extrabold text-blue-700 text-2xl">{fmt(cProd.precoBase)}</p>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                        {[
                          { l: `💳 Débito`, v: cProd.debito }, { l: `💳 Crédito`, v: cProd.credito },
                          { l: `💰 PIX`, v: cProd.pix }, { l: `💵 Dinheiro`, v: cProd.dinheiro },
                        ].map(({ l, v }) => (
                          <div key={l} className="bg-white rounded-xl p-2 text-center border border-slate-200">
                            <p className="text-slate-500 text-xs">{l}</p>
                            <p className="font-bold text-blue-700 text-sm">{fmt(v)}</p>
                          </div>
                        ))}
                      </div>

                      {/* Ingredientes do produto salvo */}
                      <details className="text-sm text-slate-400">
                        <summary className="cursor-pointer hover:text-slate-600 font-medium mb-2">
                          🧂 Ingredientes ({ingList.length})
                        </summary>
                        <table className="w-full mt-2">
                          <thead><tr className="text-slate-500 border-b">
                            <th className="text-left py-1">Nome</th><th className="text-right py-1">Qtd</th><th className="text-right py-1">Subtotal</th><th></th>
                          </tr></thead>
                          <tbody>
                            {ingList.map((i) => (
                              <tr key={i.id} className="border-b hover:bg-slate-50">
                                <td className="py-1 text-slate-700">{i.nome} <span className="text-slate-400">({i.unidade})</span></td>
                                <td className="text-right text-slate-600">{i.quantidade}{i.unidade}</td>
                                <td className="text-right font-semibold text-slate-700">R$ {calcSub(i).toFixed(2)}</td>
                                <td className="text-right"><button onClick={() => delIngProd(i.id)} className="text-red-400 hover:text-red-600 ml-2">✕</button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                          <input value={novoIngProd.nome} onChange={(e) => setNovoIngProd({ ...novoIngProd, nome: e.target.value })} placeholder="Nome" className="col-span-2 border border-slate-200 rounded-lg px-2 py-1 text-xs" />
                          <input type="number" value={novoIngProd.quantidade} onChange={(e) => setNovoIngProd({ ...novoIngProd, quantidade: e.target.value })} placeholder="Qtd" className="border border-slate-200 rounded-lg px-2 py-1 text-xs" />
                          <select value={novoIngProd.unidade} onChange={(e) => setNovoIngProd({ ...novoIngProd, unidade: e.target.value })} className="border border-slate-200 rounded-lg px-2 py-1 text-xs">
                            {["kg","g","L","ml","un","cx","pc"].map((u) => <option key={u}>{u}</option>)}
                          </select>
                          <input type="number" value={novoIngProd.custo_por_unidade} onChange={(e) => setNovoIngProd({ ...novoIngProd, custo_por_unidade: e.target.value })} placeholder="Custo R$" className="col-span-2 border border-slate-200 rounded-lg px-2 py-1 text-xs" />
                          <button onClick={addIngProd} className="col-span-2 bg-slate-700 text-white rounded-lg py-1 text-xs font-semibold">+ Adicionar</button>
                        </div>
                      </details>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ABA: INGREDIENTES */}
        {aba === "ingredientes" && (
          <div className="max-w-2xl space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <p className="font-bold text-blue-800 text-sm">Catálogo de ingredientes</p>
                <p className="text-blue-600 text-xs mt-1">Cadastre aqui os ingredientes com seus custos. Na hora de criar um produto, basta digitar o nome e os valores preenchem automaticamente.</p>
              </div>
            </div>

            {/* Formulário novo ingrediente */}
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-lg font-bold text-slate-700 mb-4">+ Novo ingrediente</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <input
                  value={novoCat.nome}
                  onChange={(e) => setNovoCat({ ...novoCat, nome: e.target.value })}
                  placeholder="Nome (ex: Farinha de trigo)"
                  className="col-span-2 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <input
                  type="number" step="0.01"
                  value={novoCat.custo_por_unidade}
                  onChange={(e) => setNovoCat({ ...novoCat, custo_por_unidade: e.target.value })}
                  placeholder="Custo R$"
                  className="border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <select
                  value={novoCat.unidade}
                  onChange={(e) => setNovoCat({ ...novoCat, unidade: e.target.value })}
                  className="border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {["kg","g","L","ml","un","cx","pc"].map((u) => <option key={u}>{u}</option>)}
                </select>
              </div>
              <button
                onClick={async () => {
                  if (!novoCat.nome.trim() || !novoCat.custo_por_unidade) return;
                  await fetch("/api/catalogo-ingredientes", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ empresa_id: Number(id), nome: novoCat.nome.trim(), unidade: novoCat.unidade, custo_por_unidade: parseFloat(novoCat.custo_por_unidade) }),
                  });
                  setNovoCat({ nome: "", unidade: "kg", custo_por_unidade: "" });
                  void load();
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2 rounded-xl text-sm transition-colors"
              >
                + Adicionar ao catálogo
              </button>
            </div>

            {/* Lista do catálogo */}
            <div className="bg-white rounded-2xl shadow overflow-hidden">
              {catalogo.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-5xl mb-3">🧂</p>
                  <p className="text-slate-500 font-medium">Nenhum ingrediente no catálogo ainda.</p>
                  <p className="text-slate-400 text-sm mt-1">Adicione acima para começar.</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ingrediente</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Unidade</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Custo</th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {catalogo.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        {editandoCat?.id === c.id ? (
                          <>
                            <td className="px-5 py-3">
                              <input
                                value={editandoCat.nome}
                                onChange={(e) => setEditandoCat({ ...editandoCat, nome: e.target.value })}
                                className="w-full border border-blue-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                              />
                            </td>
                            <td className="px-5 py-3 text-right">
                              <select
                                value={editandoCat.unidade}
                                onChange={(e) => setEditandoCat({ ...editandoCat, unidade: e.target.value })}
                                className="border border-blue-300 rounded-lg px-2 py-1 text-sm focus:outline-none"
                              >
                                {["kg","g","L","ml","un","cx","pc"].map((u) => <option key={u}>{u}</option>)}
                              </select>
                            </td>
                            <td className="px-5 py-3 text-right">
                              <input
                                type="number" step="0.01"
                                value={editandoCat.custo}
                                onChange={(e) => setEditandoCat({ ...editandoCat, custo: e.target.value })}
                                className="w-28 border border-blue-300 rounded-lg px-2 py-1 text-sm focus:outline-none text-right"
                              />
                            </td>
                            <td className="px-5 py-3 text-right">
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={async () => {
                                    await fetch(`/api/catalogo-ingredientes/${c.id}`, {
                                      method: "PATCH",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ nome: editandoCat.nome, unidade: editandoCat.unidade, custo_por_unidade: parseFloat(editandoCat.custo) || 0 }),
                                    });
                                    setEditandoCat(null);
                                    void load();
                                  }}
                                  className="bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-3 py-1 rounded-lg"
                                >
                                  Salvar
                                </button>
                                <button onClick={() => setEditandoCat(null)} className="text-slate-400 hover:text-slate-600 text-xs px-2 py-1">
                                  Cancelar
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-5 py-3 font-medium text-slate-800">{c.nome}</td>
                            <td className="px-5 py-3 text-right text-slate-500 text-sm">{c.unidade}</td>
                            <td className="px-5 py-3 text-right font-semibold text-slate-700">
                              {c.custo_por_unidade.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/{c.unidade}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => setEditandoCat({ id: c.id, nome: c.nome, unidade: c.unidade, custo: String(c.custo_por_unidade) })}
                                  className="text-slate-400 hover:text-blue-600 text-sm transition-colors"
                                  title="Editar"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={async () => {
                                    if (!confirm(`Remover "${c.nome}" do catálogo?`)) return;
                                    await fetch(`/api/catalogo-ingredientes/${c.id}`, { method: "DELETE" });
                                    void load();
                                  }}
                                  className="text-slate-300 hover:text-red-500 text-sm transition-colors"
                                  title="Excluir"
                                >
                                  ✕
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ABA: CONFIG */}
        {aba === "config" && cfgForm && (
          <div className="max-w-2xl space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <p className="font-bold text-blue-800 text-sm">Configurações exclusivas desta empresa</p>
                <p className="text-blue-600 text-xs mt-1">Aplicadas automaticamente no cálculo de todos os produtos.</p>
              </div>
            </div>

            {/* Regime */}
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-lg font-bold text-slate-700 mb-1">🏛️ Regime Tributário</h2>
              <p className="text-slate-400 text-sm mb-4">Regime fiscal desta empresa</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                {[
                  { v: "simples_nacional", l: "Simples Nacional", sub: "Até R$ 4,8M/ano" },
                  { v: "lucro_presumido", l: "Lucro Presumido", sub: "Até R$ 78M/ano · ~13,33%" },
                  { v: "lucro_real", l: "Lucro Real", sub: "Sem limite · ~34%" },
                  { v: "mei", l: "MEI", sub: "Até R$ 81k/ano · 0%" },
                  { v: "custom", l: "✏️ Personalizada", sub: "Informe a alíquota" },
                ].map(({ v, l, sub }) => (
                  <button key={v} onClick={() => setCfgForm({ ...cfgForm, regime: v })}
                    className={`border-2 rounded-xl p-4 text-left transition ${cfgForm.regime === v ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-400"}`}>
                    <p className="font-bold text-sm">{l}</p>
                    <p className="text-xs text-slate-500 mt-1">{sub}</p>
                  </button>
                ))}
              </div>

              {cfgForm.regime === "simples_nacional" && (
                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                  <p className="font-semibold text-sm text-slate-700">Selecione o Anexo:</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { v: "I", l: "Anexo I — Comércio", sub: "4,0%" },
                      { v: "II", l: "Anexo II — Indústria", sub: "4,5%" },
                      { v: "III", l: "Anexo III — Serviços", sub: "6,0%" },
                      { v: "custom", l: "✏️ Personalizada", sub: "Informe a alíquota" },
                    ].map(({ v, l, sub }) => (
                      <button key={v} onClick={() => setCfgForm({ ...cfgForm, anexo: v })}
                        className={`border-2 rounded-xl p-3 text-left transition ${cfgForm.anexo === v ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-400"}`}>
                        <p className="font-bold text-sm">{l}</p>
                        <p className="text-xs text-slate-500">{sub}</p>
                      </button>
                    ))}
                  </div>
                  {cfgForm.anexo === "custom" && (
                    <div>
                      <label className="text-sm text-slate-600">Alíquota (%):</label>
                      <input type="number" step="0.1" value={cfgForm.aliquota_custom}
                        onChange={(e) => setCfgForm({ ...cfgForm, aliquota_custom: Number(e.target.value) })}
                        className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                  )}
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-sm text-blue-700">Alíquota: <strong>{(ALIQ[`simples_nacional-${cfgForm.anexo}`] ?? cfgForm.aliquota_custom ?? 0).toFixed(1)}%</strong></p>
                  </div>
                </div>
              )}

              {(cfgForm.regime === "lucro_presumido" || cfgForm.regime === "lucro_real" || cfgForm.regime === "custom") && (
                <div className="bg-slate-50 rounded-xl p-4 mt-3">
                  <label className="text-sm text-slate-600">Alíquota total (%):</label>
                  <input type="number" step="0.1"
                    value={cfgForm.regime === "lucro_presumido" ? (cfgForm.aliquota_custom || 13.33) : cfgForm.regime === "lucro_real" ? (cfgForm.aliquota_custom || 34) : cfgForm.aliquota_custom}
                    onChange={(e) => setCfgForm({ ...cfgForm, aliquota_custom: Number(e.target.value) })}
                    className="mt-1 w-40 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none" />
                </div>
              )}
            </div>

            {/* Taxas pagamento */}
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-lg font-bold text-slate-700 mb-1">💳 Taxas de Pagamento</h2>
              <p className="text-slate-400 text-sm mb-4">Taxas cobradas por cada forma de recebimento</p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { l: "💳 Débito (%)", k: "taxa_debito" },
                  { l: "💳 Crédito à vista (%)", k: "taxa_credito" },
                  { l: "💰 PIX (%)", k: "taxa_pix" },
                  { l: "💵 Dinheiro (%)", k: "taxa_dinheiro" },
                ].map(({ l, k }) => (
                  <div key={k}>
                    <label className="text-sm text-slate-600">{l}</label>
                    <input type="number" step="0.01" value={cfgForm[k as keyof Config] as number}
                      onChange={(e) => setCfgForm({ ...cfgForm, [k]: Number(e.target.value) })}
                      className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                ))}
              </div>
            </div>

            {/* Funcionários */}
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-lg font-bold text-slate-700 mb-1">👥 Funcionários</h2>
              <p className="text-slate-400 text-sm mb-4">Custo mensal rateado pela produção</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-600">Custo mensal total (R$)</label>
                  <input type="number" value={cfgForm.funcionarios_custo}
                    onChange={(e) => setCfgForm({ ...cfgForm, funcionarios_custo: Number(e.target.value) })}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  <p className="text-xs text-slate-400 mt-1">Salários + INSS + FGTS + 13º</p>
                </div>
                <div>
                  <label className="text-sm text-slate-600">Qtd. produtos/mês</label>
                  <input type="number" value={cfgForm.funcionarios_qtd}
                    onChange={(e) => setCfgForm({ ...cfgForm, funcionarios_qtd: Number(e.target.value) })}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              </div>
              {cfgForm.funcionarios_custo > 0 && (
                <div className="mt-3 bg-green-50 rounded-lg p-3">
                  <p className="text-sm text-green-700">💡 Por produto: <strong>{fmt(cfgForm.funcionarios_custo / (cfgForm.funcionarios_qtd || 1))}</strong></p>
                </div>
              )}
            </div>

            {/* Gastos variáveis */}
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-lg font-bold text-slate-700 mb-1">⚡ Gastos Variáveis</h2>
              <p className="text-slate-400 text-sm mb-4">Adicione cada despesa mensal da empresa (energia, água, gás, embalagens etc.)</p>

              {/* Lista de itens */}
              <div className="space-y-2 mb-4">
                {gastosItens.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4 bg-slate-50 rounded-xl">Nenhum gasto cadastrado ainda.</p>
                )}
                {gastosItens.map((g) => (
                  <div key={g.id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                    <span className="flex-1 font-medium text-slate-700 text-sm">{g.nome}</span>
                    {editandoGasto?.id === g.id ? (
                      <input
                        type="number" step="0.01"
                        value={editandoGasto.valor}
                        onChange={(e) => setEditandoGasto({ ...editandoGasto, valor: e.target.value })}
                        onBlur={async () => {
                          await fetch(`/api/gastos-variaveis/${g.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ valor: parseFloat(editandoGasto.valor) || 0 }),
                          });
                          setEditandoGasto(null);
                          void load();
                        }}
                        className="w-32 border border-blue-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        autoFocus
                      />
                    ) : (
                      <button
                        onClick={() => setEditandoGasto({ id: g.id, valor: String(g.valor) })}
                        className="text-sm font-semibold text-slate-600 hover:text-blue-600 w-32 text-right"
                      >
                        {fmt(g.valor)}/mês
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        await fetch(`/api/gastos-variaveis/${g.id}`, { method: "DELETE" });
                        void load();
                      }}
                      className="text-slate-300 hover:text-red-500 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {/* Adicionar novo item */}
              <div className="flex gap-2 mb-4">
                <input
                  value={novoGasto.nome}
                  onChange={(e) => setNovoGasto({ ...novoGasto, nome: e.target.value })}
                  placeholder="Ex: Energia elétrica"
                  className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <input
                  type="number" step="0.01"
                  value={novoGasto.valor}
                  onChange={(e) => setNovoGasto({ ...novoGasto, valor: e.target.value })}
                  placeholder="R$/mês"
                  className="w-32 border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button
                  onClick={async () => {
                    if (!novoGasto.nome.trim() || !novoGasto.valor) return;
                    await fetch("/api/gastos-variaveis", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ empresa_id: Number(id), nome: novoGasto.nome.trim(), valor: parseFloat(novoGasto.valor) }),
                    });
                    setNovoGasto({ nome: "", valor: "" });
                    void load();
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
                >
                  + Adicionar
                </button>
              </div>

              {/* Resumo */}
              {gastosItens.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Total mensal</span>
                    <span className="font-bold text-slate-800">{fmt(gastosMensal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Produção mensal ({cfgForm.funcionarios_qtd} un.)</span>
                    <span className="text-slate-500">÷ {cfgForm.funcionarios_qtd}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-yellow-300 pt-1 mt-1">
                    <span className="font-bold text-yellow-800">⚡ Por produto</span>
                    <span className="font-bold text-yellow-800">{fmt(gastosPorProduto)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Perdas */}
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="text-lg font-bold text-slate-700 mb-1">🗑️ Perdas</h2>
              <p className="text-slate-400 text-sm mb-4">Vencimento, desperdício e quebras</p>
              <label className="text-sm text-slate-600">Taxa sobre insumos (%)</label>
              <input type="number" step="0.1" value={cfgForm.perdas_pct}
                onChange={(e) => setCfgForm({ ...cfgForm, perdas_pct: Number(e.target.value) })}
                className="mt-1 w-64 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>

            <button onClick={salvarConfig} disabled={salvandoCfg}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-lg transition-colors">
              {salvandoCfg ? "Salvando..." : "💾 Salvar Configurações desta Empresa"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
