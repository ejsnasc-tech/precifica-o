import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { z } from "zod";

async function checkOwnership(ingredienteId: number, userId: number) {
  const db = await getDB();
  const row = await db
    .prepare(`SELECT i.id FROM ingredientes i
              JOIN produtos p ON p.id = i.produto_id
              JOIN empresas e ON e.id = p.empresa_id
              WHERE i.id = ? AND e.user_id = ?`)
    .bind(ingredienteId, userId)
    .first();
  return { db, owns: !!row };
}

const schema = z.object({
  nome: z.string().min(1).optional(),
  quantidade: z.number().min(0).optional(),
  unidade: z.string().optional(),
  custo_por_unidade: z.number().min(0).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const { db, owns } = await checkOwnership(Number(id), session.userId);
  if (!owns) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const fields: string[] = [];
  const values: unknown[] = [];
  const d = parsed.data;
  if (d.nome !== undefined) { fields.push("nome = ?"); values.push(d.nome); }
  if (d.quantidade !== undefined) { fields.push("quantidade = ?"); values.push(d.quantidade); }
  if (d.unidade !== undefined) { fields.push("unidade = ?"); values.push(d.unidade); }
  if (d.custo_por_unidade !== undefined) { fields.push("custo_por_unidade = ?"); values.push(d.custo_por_unidade); }
  if (!fields.length) return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });

  values.push(id);
  await db.prepare(`UPDATE ingredientes SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
  return NextResponse.json(await db.prepare("SELECT * FROM ingredientes WHERE id = ?").bind(id).first());
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const { db, owns } = await checkOwnership(Number(id), session.userId);
  if (!owns) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  await db.prepare("DELETE FROM ingredientes WHERE id = ?").bind(id).run();
  return NextResponse.json({ ok: true });
}
