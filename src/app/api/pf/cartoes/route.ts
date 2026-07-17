import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  nome: z.string().min(1),
  bandeira: z.string().default("outros"),
  limite: z.number().min(0).default(0),
  dia_fechamento: z.number().min(1).max(31).default(20),
  dia_vencimento: z.number().min(1).max(31).default(10),
  cor: z.string().default("#6366f1"),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const db = await getDB();
  const { results } = await db.prepare("SELECT * FROM pf_cartoes WHERE user_id = ? ORDER BY criado_em ASC").bind(session.userId).all();
  return NextResponse.json(results);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const { nome, bandeira, limite, dia_fechamento, dia_vencimento, cor } = parsed.data;
  const db = await getDB();

  const result = await db
    .prepare("INSERT INTO pf_cartoes (user_id, nome, bandeira, limite, dia_fechamento, dia_vencimento, cor) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(session.userId, nome, bandeira, limite, dia_fechamento, dia_vencimento, cor)
    .run();

  const row = await db.prepare("SELECT * FROM pf_cartoes WHERE id = ?").bind(result.meta.last_row_id).first();
  return NextResponse.json(row, { status: 201 });
}
