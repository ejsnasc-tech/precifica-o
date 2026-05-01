import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  nome: z.string().min(1),
  descricao: z.string().default(""),
  cor: z.string().default("from-blue-500 to-indigo-600"),
  emoji: z.string().default("🏪"),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const db = await getDB();
  const { results } = await db
    .prepare("SELECT * FROM empresas WHERE user_id = ? ORDER BY criado_em DESC")
    .bind(session.userId)
    .all();

  return NextResponse.json(results);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const { nome, descricao, cor, emoji } = parsed.data;
  const db = await getDB();

  const result = await db
    .prepare("INSERT INTO empresas (user_id, nome, descricao, cor, emoji) VALUES (?, ?, ?, ?, ?)")
    .bind(session.userId, nome, descricao, cor, emoji)
    .run();

  const empresa = await db
    .prepare("SELECT * FROM empresas WHERE id = ?")
    .bind(result.meta.last_row_id)
    .first();

  await db
    .prepare("INSERT INTO configuracoes_empresa (empresa_id) VALUES (?)")
    .bind(result.meta.last_row_id)
    .run();

  return NextResponse.json(empresa, { status: 201 });
}
