import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  nome: z.string().min(1).optional(),
  emoji: z.string().optional(),
  valor_objetivo: z.number().min(0).optional(),
  valor_atual: z.number().min(0).optional(),
  prazo: z.string().nullable().optional(),
  cor: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const db = await getDB();

  const owns = await db.prepare("SELECT id FROM pf_metas WHERE id = ? AND user_id = ?").bind(Number(id), session.userId).first();
  if (!owns) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const fields: string[] = [];
  const values: unknown[] = [];
  const d = parsed.data;

  if (d.nome !== undefined) { fields.push("nome = ?"); values.push(d.nome); }
  if (d.emoji !== undefined) { fields.push("emoji = ?"); values.push(d.emoji); }
  if (d.valor_objetivo !== undefined) { fields.push("valor_objetivo = ?"); values.push(d.valor_objetivo); }
  if (d.valor_atual !== undefined) { fields.push("valor_atual = ?"); values.push(d.valor_atual); }
  if (d.prazo !== undefined) { fields.push("prazo = ?"); values.push(d.prazo); }
  if (d.cor !== undefined) { fields.push("cor = ?"); values.push(d.cor); }

  if (!fields.length) return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });

  values.push(id);
  await db.prepare(`UPDATE pf_metas SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();

  const row = await db.prepare("SELECT * FROM pf_metas WHERE id = ?").bind(id).first();
  return NextResponse.json(row);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const db = await getDB();

  const owns = await db.prepare("SELECT id FROM pf_metas WHERE id = ? AND user_id = ?").bind(Number(id), session.userId).first();
  if (!owns) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  await db.prepare("DELETE FROM pf_metas WHERE id = ?").bind(id).run();
  return NextResponse.json({ ok: true });
}
