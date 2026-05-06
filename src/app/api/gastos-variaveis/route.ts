import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  empresa_id: z.number(),
  nome: z.string().min(1),
  valor: z.number().min(0),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const empresaId = Number(req.nextUrl.searchParams.get("empresaId"));
  if (!empresaId) return NextResponse.json({ error: "empresaId obrigatório." }, { status: 400 });

  const db = await getDB();
  const owns = await db.prepare("SELECT id FROM empresas WHERE id = ? AND user_id = ?").bind(empresaId, session.userId).first();
  if (!owns) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  const { results } = await db
    .prepare("SELECT * FROM gastos_variaveis_itens WHERE empresa_id = ? ORDER BY id")
    .bind(empresaId)
    .all();

  return NextResponse.json(results);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const { empresa_id, nome, valor } = parsed.data;
  const db = await getDB();

  const owns = await db.prepare("SELECT id FROM empresas WHERE id = ? AND user_id = ?").bind(empresa_id, session.userId).first();
  if (!owns) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  const result = await db
    .prepare("INSERT INTO gastos_variaveis_itens (empresa_id, nome, valor) VALUES (?, ?, ?)")
    .bind(empresa_id, nome, valor)
    .run();

  return NextResponse.json(
    await db.prepare("SELECT * FROM gastos_variaveis_itens WHERE id = ?").bind(result.meta.last_row_id).first(),
    { status: 201 }
  );
}
