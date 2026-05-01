"use client";

import { useState } from "react";

interface Empresa {
  id: number;
  nome: string;
  descricao: string;
  cor: string;
  emoji: string;
}

interface Props {
  inicial: Empresa | null;
  onClose: () => void;
  onSave: (data: Omit<Empresa, "id">) => void;
}

const EMOJIS = ["🏪", "🍔", "🍕", "🌮", "🍰", "☕", "🛒", "💇", "💅", "🧴", "👗", "🎨", "🔧", "📦", "🏋️", "🌿", "🐾", "📚"];
const CORES = [
  "from-blue-500 to-indigo-600",
  "from-purple-500 to-pink-600",
  "from-green-500 to-emerald-600",
  "from-orange-400 to-red-500",
  "from-yellow-400 to-orange-500",
  "from-teal-500 to-cyan-600",
  "from-rose-400 to-pink-500",
  "from-slate-500 to-zinc-600",
];

export default function EmpresaModal({ inicial, onClose, onSave }: Props) {
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [descricao, setDescricao] = useState(inicial?.descricao ?? "");
  const [cor, setCor] = useState(inicial?.cor ?? CORES[0]);
  const [emoji, setEmoji] = useState(inicial?.emoji ?? EMOJIS[0]);

  const handleSave = () => {
    if (!nome.trim()) return;
    onSave({ nome: nome.trim(), descricao, cor, emoji });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-zinc-800 mb-4">
          {inicial ? "Editar empresa" : "Nova empresa"}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-zinc-600 block mb-1">Nome</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome da empresa"
              maxLength={60}
              className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-600 block mb-1">Descrição (opcional)</label>
            <input
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Lanchonete, confeitaria..."
              maxLength={100}
              className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-600 block mb-2">Ícone</label>
            <div className="flex flex-wrap gap-2">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`text-xl p-2 rounded-xl transition-colors ${emoji === e ? "bg-indigo-100 ring-2 ring-indigo-400" : "hover:bg-zinc-100"}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-600 block mb-2">Cor</label>
            <div className="flex flex-wrap gap-2">
              {CORES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCor(c)}
                  className={`w-8 h-8 rounded-lg bg-gradient-to-br ${c} transition-transform ${cor === c ? "scale-125 ring-2 ring-offset-1 ring-zinc-400" : "hover:scale-110"}`}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className={`bg-gradient-to-br ${cor} rounded-xl p-4 text-white`}>
            <div className="text-3xl mb-1">{emoji}</div>
            <p className="font-bold">{nome || "Nome da empresa"}</p>
            {descricao && <p className="text-white/80 text-sm">{descricao}</p>}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 border border-zinc-200 text-zinc-600 font-semibold py-2.5 rounded-xl hover:bg-zinc-50">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!nome.trim()}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors"
          >
            {inicial ? "Salvar" : "Criar"}
          </button>
        </div>
      </div>
    </div>
  );
}
