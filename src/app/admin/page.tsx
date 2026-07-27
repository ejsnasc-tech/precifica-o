"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

interface CodigoRow {
  codigo: string;
  nome_cliente: string | null;
  email_cliente: string | null;
  usado: number;
  revogado: number;
  criado_em: string;
  usado_em: string | null;
  expira_em: string | null;
}

const PRAZO_OPCOES = [
  { label: "Vitalício", value: "" },
  { label: "7 dias", value: "7" },
  { label: "30 dias", value: "30" },
  { label: "90 dias", value: "90" },
  { label: "180 dias", value: "180" },
  { label: "1 ano", value: "365" },
];

function statusCodigo(c: CodigoRow): { label: string; cor: string } {
  if (c.revogado) return { label: "Revogado", cor: "text-rose-400 bg-rose-950/50" };
  if (c.expira_em && new Date(c.expira_em) < new Date()) return { label: "Expirado", cor: "text-orange-400 bg-orange-950/50" };
  if (c.usado) return { label: "Ativo", cor: "text-emerald-400 bg-emerald-950/50" };
  return { label: "Não usado", cor: "text-slate-400 bg-slate-800" };
}

function fmtData(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [autenticado, setAutenticado] = useState(false);
  const [erro, setErro] = useState("");

  // Form gerar
  const [nomeCliente, setNomeCliente] = useState("");
  const [emailCliente, setEmailCliente] = useState("");
  const [prazo, setPrazo] = useState("");
  const [codigoGerado, setCodigoGerado] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Revogar
  const [codigoRevogar, setCodigoRevogar] = useState("");
  const [msgRevogar, setMsgRevogar] = useState("");

  // Lista
  const [codigos, setCodigos] = useState<CodigoRow[]>([]);
  const [carregandoLista, setCarregandoLista] = useState(false);

  async function autenticar() {
    if (!secret.trim()) return;
    setSalvando(true);
    setErro("");
    try {
      const res = await fetch("/api/admin/listar-codigos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });
      const data = await res.json() as { codigos?: CodigoRow[]; erro?: string };
      if (!res.ok || data.erro) {
        setErro(data.erro ?? "Senha incorreta.");
      } else {
        setCodigos(data.codigos ?? []);
        setAutenticado(true);
      }
    } catch {
      setErro("Falha na conexão.");
    } finally {
      setSalvando(false);
    }
  }

  const carregarLista = useCallback(async () => {
    setCarregandoLista(true);
    try {
      const res = await fetch("/api/admin/listar-codigos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });
      const data = await res.json() as { codigos?: CodigoRow[] };
      setCodigos(data.codigos ?? []);
    } finally {
      setCarregandoLista(false);
    }
  }, [secret]);

  async function gerarCodigo() {
    setSalvando(true);
    setCodigoGerado("");
    setErro("");
    try {
      let expira_em: string | undefined;
      if (prazo) {
        const d = new Date();
        d.setDate(d.getDate() + Number(prazo));
        expira_em = d.toISOString().slice(0, 10);
      }
      const res = await fetch("/api/admin/gerar-codigo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, nome_cliente: nomeCliente, email_cliente: emailCliente, expira_em }),
      });
      const data = await res.json() as { codigo?: string; erro?: string };
      if (!res.ok || data.erro) {
        setErro(data.erro ?? "Erro.");
      } else {
        setCodigoGerado(data.codigo ?? "");
        setNomeCliente("");
        setEmailCliente("");
        setPrazo("");
        void carregarLista();
      }
    } finally {
      setSalvando(false);
    }
  }

  async function revogarCodigo() {
    if (!codigoRevogar.trim()) return;
    if (!confirm(`Revogar ${codigoRevogar.toUpperCase()}? O acesso será encerrado.`)) return;
    setMsgRevogar("");
    try {
      const res = await fetch("/api/admin/revogar-codigo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, codigo: codigoRevogar.trim() }),
      });
      const data = await res.json() as { ok?: boolean; erro?: string };
      if (data.erro) setMsgRevogar("❌ " + data.erro);
      else {
        setMsgRevogar("✅ Código revogado com sucesso.");
        setCodigoRevogar("");
        void carregarLista();
      }
    } catch {
      setMsgRevogar("❌ Falha na conexão.");
    }
  }

  async function copiar() {
    await navigator.clipboard.writeText(codigoGerado);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  // ── Tela de login ──────────────────────────────────────────────────────────

  if (!autenticado) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-xs">
          <div className="text-center mb-6">
            <p className="text-3xl mb-2">🔐</p>
            <h1 className="text-xl font-extrabold text-white">Admin</h1>
            <p className="text-slate-500 text-xs mt-1">Top Precificação — área restrita</p>
          </div>
          <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 space-y-3">
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && autenticar()}
              placeholder="Senha admin"
              autoFocus
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {erro && <p className="text-rose-400 text-sm">{erro}</p>}
            <button onClick={autenticar} disabled={salvando || !secret.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition">
              {salvando ? "Verificando..." : "Entrar"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Painel principal ───────────────────────────────────────────────────────

  const ativos = codigos.filter((c) => c.usado && !c.revogado && (!c.expira_em || new Date(c.expira_em) >= new Date())).length;
  const total = codigos.length;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-extrabold text-white">🔐 Admin — Top Precificação</h1>
          <p className="text-slate-500 text-xs mt-0.5">{ativos} cliente{ativos !== 1 ? "s" : ""} ativos · {total} código{total !== 1 ? "s" : ""} no total</p>
        </div>
        <button onClick={() => setAutenticado(false)} className="text-slate-600 hover:text-slate-400 text-xs transition">Sair</button>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-6">

        {/* Gerar código */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h2 className="font-bold text-white text-sm">✨ Gerar novo código de acesso</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Nome do cliente <span className="text-slate-600">(opcional)</span></label>
              <input value={nomeCliente} onChange={(e) => setNomeCliente(e.target.value)}
                placeholder="Ex: João Silva"
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">E-mail <span className="text-slate-600">(opcional)</span></label>
              <input value={emailCliente} onChange={(e) => setEmailCliente(e.target.value)}
                placeholder="cliente@email.com"
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Validade do acesso</label>
            <div className="flex flex-wrap gap-2">
              {PRAZO_OPCOES.map((o) => (
                <button key={o.value} onClick={() => setPrazo(o.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${prazo === o.value ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <button onClick={gerarCodigo} disabled={salvando}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm transition">
            {salvando ? "Gerando..." : "Gerar código"}
          </button>

          {codigoGerado && (
            <div className="bg-slate-800 rounded-xl p-4 text-center border border-indigo-500/30">
              <p className="text-xs text-slate-400 mb-1">Código gerado</p>
              <p className="text-2xl font-extrabold tracking-widest text-indigo-300 font-mono mb-3">{codigoGerado}</p>
              <div className="flex gap-2">
                <button onClick={copiar}
                  className="flex-1 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg transition">
                  {copiado ? "✅ Copiado!" : "📋 Copiar código"}
                </button>
                <Link href="/ativar"
                  className="flex-1 text-sm bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 rounded-lg transition text-center">
                  Ativar agora →
                </Link>
              </div>
            </div>
          )}
          {erro && <p className="text-rose-400 text-sm">{erro}</p>}
        </div>

        {/* Revogar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h2 className="font-bold text-white text-sm">🚫 Revogar acesso <span className="text-slate-500 font-normal text-xs">(reembolso / cancelamento)</span></h2>
          <div className="flex gap-2">
            <input value={codigoRevogar} onChange={(e) => setCodigoRevogar(e.target.value.toUpperCase())}
              placeholder="XXXX-XXXX-XXXX"
              className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-500 placeholder-slate-600" />
            <button onClick={revogarCodigo} disabled={!codigoRevogar.trim()}
              className="bg-rose-700 hover:bg-rose-800 disabled:opacity-40 text-white font-bold px-4 py-2 rounded-xl text-sm transition">
              Revogar
            </button>
          </div>
          {msgRevogar && <p className="text-sm text-slate-300">{msgRevogar}</p>}
        </div>

        {/* Lista de clientes */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <h2 className="font-bold text-white text-sm">📋 Todos os códigos</h2>
            <button onClick={carregarLista} disabled={carregandoLista}
              className="text-xs text-slate-500 hover:text-slate-300 transition">
              {carregandoLista ? "Atualizando..." : "↻ Atualizar"}
            </button>
          </div>
          {codigos.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-10">Nenhum código gerado ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-left">
                    <th className="px-5 py-3 text-slate-500 font-semibold text-xs">Código</th>
                    <th className="px-5 py-3 text-slate-500 font-semibold text-xs">Cliente</th>
                    <th className="px-5 py-3 text-slate-500 font-semibold text-xs">Gerado em</th>
                    <th className="px-5 py-3 text-slate-500 font-semibold text-xs">Expira</th>
                    <th className="px-5 py-3 text-slate-500 font-semibold text-xs">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {codigos.map((c) => {
                    const st = statusCodigo(c);
                    return (
                      <tr key={c.codigo} className="hover:bg-slate-800/40">
                        <td className="px-5 py-3 font-mono text-xs text-indigo-300 whitespace-nowrap">
                          <button onClick={() => { setCodigoRevogar(c.codigo); }} title="Clique para revogar"
                            className="hover:text-indigo-200 transition">
                            {c.codigo}
                          </button>
                        </td>
                        <td className="px-5 py-3">
                          <p className="text-white text-xs">{c.nome_cliente ?? <span className="text-slate-600">—</span>}</p>
                          <p className="text-slate-500 text-xs">{c.email_cliente ?? ""}</p>
                        </td>
                        <td className="px-5 py-3 text-slate-400 text-xs whitespace-nowrap">{fmtData(c.criado_em)}</td>
                        <td className="px-5 py-3 text-slate-400 text-xs whitespace-nowrap">
                          {c.expira_em ? fmtData(c.expira_em) : <span className="text-slate-600">Vitalício</span>}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${st.cor}`}>{st.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
