import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  regime: z.enum(["simples_nacional", "lucro_presumido", "mei", "custom"]).optional(),
  anexo: z.string().optional(),
  aliquota_custom: z.number().min(0).max(100).optional(),
  taxa_debito: z.number().min(0).optional(),
  taxa_credito: z.number().min(0).optional(),
  taxa_pix: z.number().min(0).optional(),
  taxa_dinheiro: z.number().min(0).optional(),
  funcionarios_custo: z.number().min(0).optional(),
  funcionarios_qtd: z.number().min(1).optional(),
  gastos_variaveis: z.number().min(0).optional(),
  gastos_variaveis_tipo: z.enum(["percent", "fixed"]).optional(),
  perdas_pct: z.number().min(0).max(100).optional(),
});

async function checkOwnership(empresaId: number, userId: number) {
  const db = await getDB();
  const row = await db
    .prepare("SELECT id FROM empresas WHERE id = ? AND user_id = ?")
    .bind(empresaId, userId)
    .first();
  return { db, owns: !!row };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ empresaId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { empresaId } = await params;
  const { db, owns } = await checkOwnership(Number(empresaId), session.userId);
  if (!owns) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  const config = await db
    .prepare("SELECT * FROM configuracoes_empresa WHERE empresa_id = ?")
    .bind(empresaId)
    .first();

  return NextResponse.json(config);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ empresaId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { empresaId } = await params;
  const { db, owns } = await checkOwnership(Number(empresaId), session.userId);
  if (!owns) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const fields: string[] = [];
  const values: unknown[] = [];
  const d = parsed.data;

  const cols = ["regime","anexo","aliquota_custom","taxa_debito","taxa_credito","taxa_pix","taxa_dinheiro",
    "funcionarios_custo","funcionarios_qtd","gastos_variaveis","gastos_variaveis_tipo","perdas_pct"] as const;

  for (const col of cols) {
    if (d[col] !== undefined) { fields.push(`${col} = ?`); values.push(d[col]); }
  }

  if (!fields.length) return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });

  values.push(empresaId);
  await db.prepare(`UPDATE configuracoes_empresa SET ${fields.join(", ")} WHERE empresa_id = ?`).bind(...values).run();

  return NextResponse.json(
    await db.prepare("SELECT * FROM configuracoes_empresa WHERE empresa_id = ?").bind(empresaId).first()
  );
}
