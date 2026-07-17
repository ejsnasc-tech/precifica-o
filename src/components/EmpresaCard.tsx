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
      className={`relative bg-gradient-to-br ${empresa.cor} rounded-2xl overflow-hidden cursor-pointer group transition-all duration-200 hover:scale-[1.02] hover:shadow-xl`}
      onClick={onClick}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white" />
        <div className="absolute -right-2 -bottom-8 w-24 h-24 rounded-full bg-white" />
      </div>

      <div className="relative p-6">
        <div className="text-4xl mb-4 drop-shadow">{empresa.emoji}</div>
        <h3 className="font-bold text-white text-lg leading-tight mb-1">{empresa.nome}</h3>
        {empresa.descricao && (
          <p className="text-white/70 text-sm line-clamp-2">{empresa.descricao}</p>
        )}

        <div className="mt-4 flex items-center justify-between">
          <span className="text-white/50 text-xs font-medium">Ver detalhes →</span>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="bg-white/20 hover:bg-white/30 text-white rounded-lg p-1.5 transition-colors"
              title="Editar"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="bg-white/20 hover:bg-red-500/80 text-white rounded-lg p-1.5 transition-colors"
              title="Excluir"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
