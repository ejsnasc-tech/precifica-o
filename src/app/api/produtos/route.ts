import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  empresa_id: z.number(),
  nome: z.string().min(1),
  margem: z.number().min(0).max(100).default(30),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const empresaId = Number(req.nextUrl.searchParams.get("empresaId"));
  if (!empresaId) return NextResponse.json({ error: "empresaId obrigatório." }, { status: 400 });

  const db = await getDB();
  const empresa = await db
    .prepare("SELECT id FROM empresas WHERE id = ? AND user_id = ?")
    .bind(empresaId, session.userId)
    .first();
  if (!empresa) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  const { results } = await db
    .prepare("SELECT * FROM produtos WHERE empresa_id = ? ORDER BY criado_em DESC")
    .bind(empresaId)
    .all();

  return NextResponse.json(results);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const { empresa_id, nome, margem } = parsed.data;
  const db = await getDB();

  const empresa = await db
    .prepare("SELECT id FROM empresas WHERE id = ? AND user_id = ?")
    .bind(empresa_id, session.userId)
    .first();
  if (!empresa) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  const result = await db
    .prepare("INSERT INTO produtos (empresa_id, nome, margem) VALUES (?, ?, ?)")
    .bind(empresa_id, nome, margem)
    .run();

  const produto = await db
    .prepare("SELECT * FROM produtos WHERE id = ?")
    .bind(result.meta.last_row_id)
    .first();

  return NextResponse.json(produto, { status: 201 });
}
