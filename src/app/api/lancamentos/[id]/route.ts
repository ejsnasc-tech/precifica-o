import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { z } from "zod";

async function checkOwnership(itemId: number, userId: number) {
  const db = await getDB();
  const row = await db
    .prepare(
      `SELECT l.id FROM lancamentos l
       JOIN empresas e ON e.id = l.empresa_id
       WHERE l.id = ? AND e.user_id = ?`
    )
    .bind(itemId, userId)
    .first();
  return { db, owns: !!row };
}

const itemSchema = z.object({
  categoria: z.string(),
  descricao: z.string(),
  valor: z.number().min(0),
});

const updateSchema = z.object({
  data: z.string().optional(),
  vendas: z.number().min(0).optional(),
  itens: z.array(itemSchema).optional(),
  obs: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const { db, owns } = await checkOwnership(Number(id), session.userId);
  if (!owns) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const fields: string[] = [];
  const values: unknown[] = [];

  if (parsed.data.data !== undefined) { fields.push("data = ?"); values.push(parsed.data.data); }
  if (parsed.data.vendas !== undefined) { fields.push("vendas = ?"); values.push(parsed.data.vendas); }
  if (parsed.data.itens !== undefined) { fields.push("itens = ?"); values.push(JSON.stringify(parsed.data.itens)); }
  if (parsed.data.obs !== undefined) { fields.push("obs = ?"); values.push(parsed.data.obs); }

  if (!fields.length) return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });

  values.push(id);
  await db.prepare(`UPDATE lancamentos SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();

  const row = await db
    .prepare("SELECT * FROM lancamentos WHERE id = ?")
    .bind(id)
    .first<Record<string, unknown>>();

  return NextResponse.json({ ...row, itens: JSON.parse((row?.itens as string) || "[]") });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const { db, owns } = await checkOwnership(Number(id), session.userId);
  if (!owns) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  await db.prepare("DELETE FROM lancamentos WHERE id = ?").bind(id).run();
  return NextResponse.json({ ok: true });
}
