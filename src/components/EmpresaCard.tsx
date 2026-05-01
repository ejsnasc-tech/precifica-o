"use client";

interface Empresa {
  id: number;
  nome: string;
  descricao: string;
  cor: string;
  emoji: string;
}

interface Props {
  empresa: Empresa;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function EmpresaCard({ empresa, onClick, onEdit, onDelete }: Props) {
  return (
    <div
      className={`bg-gradient-to-br ${empresa.cor} rounded-2xl p-6 text-white cursor-pointer hover:scale-[1.02] transition-transform relative group`}
      onClick={onClick}
    >
      <div className="text-4xl mb-3">{empresa.emoji}</div>
      <h3 className="font-bold text-lg leading-tight">{empresa.nome}</h3>
      {empresa.descricao && (
        <p className="text-white/80 text-sm mt-1 line-clamp-2">{empresa.descricao}</p>
      )}

      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="bg-white/20 hover:bg-white/30 rounded-lg p-1.5"
          title="Editar"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="bg-white/20 hover:bg-red-500/80 rounded-lg p-1.5"
          title="Excluir"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
