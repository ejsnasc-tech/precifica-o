import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  produto_id: z.number(),
  nome: z.string().min(1),
  quantidade: z.number().min(0),
  unidade: z.string().default("kg"),
  custo_por_unidade: z.number().min(0),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const { produto_id, nome, quantidade, unidade, custo_por_unidade } = parsed.data;
  const db = await getDB();

  const owns = await db
    .prepare(`SELECT p.id FROM produtos p JOIN empresas e ON e.id = p.empresa_id WHERE p.id = ? AND e.user_id = ?`)
    .bind(produto_id, session.userId)
    .first();
  if (!owns) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  const result = await db
    .prepare("INSERT INTO ingredientes (produto_id, nome, quantidade, unidade, custo_por_unidade) VALUES (?, ?, ?, ?, ?)")
    .bind(produto_id, nome, quantidade, unidade, custo_por_unidade)
    .run();

  return NextResponse.json(
    await db.prepare("SELECT * FROM ingredientes WHERE id = ?").bind(result.meta.last_row_id).first(),
    { status: 201 }
  );
}
