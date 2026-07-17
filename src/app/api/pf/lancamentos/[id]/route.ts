import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  data: z.string().optional(),
  tipo: z.enum(["receita", "despesa"]).optional(),
  categoria: z.string().optional(),
  descricao: z.string().min(1).optional(),
  valor: z.number().min(0).optional(),
  obs: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const db = await getDB();

  const owns = await db.prepare("SELECT id FROM pf_lancamentos WHERE id = ? AND user_id = ?").bind(Number(id), session.userId).first();
  if (!owns) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const fields: string[] = [];
  const values: unknown[] = [];
  const d = parsed.data;

  if (d.data !== undefined) { fields.push("data = ?"); values.push(d.data); }
  if (d.tipo !== undefined) { fields.push("tipo = ?"); values.push(d.tipo); }
  if (d.categoria !== undefined) { fields.push("categoria = ?"); values.push(d.categoria); }
  if (d.descricao !== undefined) { fields.push("descricao = ?"); values.push(d.descricao); }
  if (d.valor !== undefined) { fields.push("valor = ?"); values.push(d.valor); }
  if (d.obs !== undefined) { fields.push("obs = ?"); values.push(d.obs); }

  if (!fields.length) return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });

  values.push(id);
  await db.prepare(`UPDATE pf_lancamentos SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();

  const row = await db.prepare("SELECT * FROM pf_lancamentos WHERE id = ?").bind(id).first();
  return NextResponse.json(row);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const db = await getDB();

  const owns = await db.prepare("SELECT id FROM pf_lancamentos WHERE id = ? AND user_id = ?").bind(Number(id), session.userId).first();
  if (!owns) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  await db.prepare("DELETE FROM pf_lancamentos WHERE id = ?").bind(id).run();
  return NextResponse.json({ ok: true });
}
