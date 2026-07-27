import Dexie, { type Table } from "dexie";

export interface Empresa {
  id?: number;
  nome: string;
  descricao: string;
  cor: string;
  emoji: string;
  criado_em: string;
}

export interface ConfigEmpresa {
  id?: number;
  empresa_id: number;
  regime: string;
  anexo: string;
  aliquota_custom: number;
  taxa_debito: number;
  taxa_credito: number;
  taxa_pix: number;
  taxa_dinheiro: number;
  funcionarios_custo: number;
  funcionarios_qtd: number;
  gastos_variaveis: number;
  gastos_variaveis_tipo: string;
  perdas_pct: number;
}

export interface Produto {
  id?: number;
  empresa_id: number;
  nome: string;
  margem: number;
  criado_em: string;
}

export interface Ingrediente {
  id?: number;
  produto_id: number;
  nome: string;
  quantidade: number;
  unidade: string;
  custo_por_unidade: number;
}

export interface GastoVariavel {
  id?: number;
  empresa_id: number;
  nome: string;
  valor: number;
}

export interface CatalogoIngrediente {
  id?: number;
  empresa_id: number;
  nome: string;
  unidade: string;
  custo_por_unidade: number;
}

export interface Lancamento {
  id?: number;
  empresa_id: number;
  data: string;
  vendas: number;
  itens: string;
  itens_vendas: string;
  obs: string;
  criado_em: string;
}

export interface Socio {
  id?: number;
  empresa_id: number;
  dados: string; // JSON
}

export interface CargoFuncionario {
  id?: number;
  empresa_id: number;
  cargo: string;
  tipo: string;
  salario: number;
  custo_total: number;
}

export interface ItemEstoque {
  id?: number;
  empresa_id: number;
  nome: string;
  unidade: string;
  quantidade_atual: number;
  quantidade_minima: number;
  custo_unitario: number;
  criado_at: string;
  tem_validade: number;
  dias_alerta: number;
}

export interface MovimentoEstoque {
  id?: number;
  estoque_id: number;
  tipo: string;
  quantidade: number;
  observacao: string;
  criado_at: string;
  data_validade?: string;
}

export interface LancamentoPF {
  id?: number;
  data: string;
  tipo: string;
  categoria: string;
  descricao: string;
  valor: number;
  obs: string;
  criado_em: string;
}

export interface CartaoPF {
  id?: number;
  nome: string;
  bandeira: string;
  limite: number;
  limite_alerta?: number;
  dia_fechamento: number;
  dia_vencimento: number;
  cor: string;
  criado_em: string;
}

export interface LancamentoCartaoPF {
  id?: number;
  cartao_id: number;
  data: string;
  descricao: string;
  categoria: string;
  valor_total: number;
  parcelas: number;
  criado_em: string;
}

export interface MetaPF {
  id?: number;
  nome: string;
  emoji: string;
  valor_objetivo: number;
  valor_atual: number;
  prazo?: string;
  cor: string;
  criado_em: string;
}

class LocalDB extends Dexie {
  empresas!: Table<Empresa>;
  config_empresa!: Table<ConfigEmpresa>;
  produtos!: Table<Produto>;
  ingredientes!: Table<Ingrediente>;
  gastos_variaveis!: Table<GastoVariavel>;
  catalogo_ingredientes!: Table<CatalogoIngrediente>;
  lancamentos!: Table<Lancamento>;
  socios!: Table<Socio>;
  cargos_funcionarios!: Table<CargoFuncionario>;
  estoque!: Table<ItemEstoque>;
  estoque_movimentos!: Table<MovimentoEstoque>;
  pf_lancamentos!: Table<LancamentoPF>;
  pf_cartoes!: Table<CartaoPF>;
  pf_cartao_lancamentos!: Table<LancamentoCartaoPF>;
  pf_metas!: Table<MetaPF>;

  constructor() {
    super("TopPrecificacaoDB");
    this.version(1).stores({
      empresas: "++id, nome",
      config_empresa: "++id, empresa_id",
      produtos: "++id, empresa_id, nome",
      ingredientes: "++id, produto_id",
      gastos_variaveis: "++id, empresa_id",
      catalogo_ingredientes: "++id, empresa_id, nome",
      lancamentos: "++id, empresa_id, data",
      socios: "++id, empresa_id",
      cargos_funcionarios: "++id, empresa_id",
      estoque: "++id, empresa_id, nome",
      estoque_movimentos: "++id, estoque_id",
      pf_lancamentos: "++id, data, tipo",
      pf_cartoes: "++id",
      pf_cartao_lancamentos: "++id, cartao_id, data",
      pf_metas: "++id",
    });
  }
}

let dbInstance: LocalDB | null = null;

export function getLocalDB(): LocalDB {
  if (!dbInstance) dbInstance = new LocalDB();
  return dbInstance;
}
