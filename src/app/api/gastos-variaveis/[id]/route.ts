import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { z } from "zod";

async function checkOwnership(itemId: number, userId: number) {
  const db = await getDB();
  const row = await db
    .prepare(`SELECT g.id FROM gastos_variaveis_itens g
              JOIN empresas e ON e.id = g.empresa_id
              WHERE g.id = ? AND e.user_id = ?`)
    .bind(itemId, userId)
    .first();
  return { db, owns: !!row };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const { db, owns } = await checkOwnership(Number(id), session.userId);
  if (!owns) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  const schema = z.object({ nome: z.string().min(1).optional(), valor: z.number().min(0).optional() });
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const fields: string[] = [];
  const values: unknown[] = [];
  if (parsed.data.nome !== undefined) { fields.push("nome = ?"); values.push(parsed.data.nome); }
  if (parsed.data.valor !== undefined) { fields.push("valor = ?"); values.push(parsed.data.valor); }
  if (!fields.length) return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });

  values.push(id);
  await db.prepare(`UPDATE gastos_variaveis_itens SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
  return NextResponse.json(await db.prepare("SELECT * FROM gastos_variaveis_itens WHERE id = ?").bind(id).first());
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const { db, owns } = await checkOwnership(Number(id), session.userId);
  if (!owns) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  await db.prepare("DELETE FROM gastos_variaveis_itens WHERE id = ?").bind(id).run();
  return NextResponse.json({ ok: true });
}
