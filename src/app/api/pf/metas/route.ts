import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  nome: z.string().min(1),
  emoji: z.string().default("🎯"),
  valor_objetivo: z.number().min(0),
  valor_atual: z.number().min(0).default(0),
  prazo: z.string().optional(),
  cor: z.string().default("#6366f1"),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const db = await getDB();
  const { results } = await db.prepare("SELECT * FROM pf_metas WHERE user_id = ? ORDER BY criado_em ASC").bind(session.userId).all();
  return NextResponse.json(results);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const { nome, emoji, valor_objetivo, valor_atual, prazo, cor } = parsed.data;
  const db = await getDB();

  const result = await db
    .prepare("INSERT INTO pf_metas (user_id, nome, emoji, valor_objetivo, valor_atual, prazo, cor) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(session.userId, nome, emoji, valor_objetivo, valor_atual, prazo ?? null, cor)
    .run();

  const row = await db.prepare("SELECT * FROM pf_metas WHERE id = ?").bind(result.meta.last_row_id).first();
  return NextResponse.json(row, { status: 201 });
}
