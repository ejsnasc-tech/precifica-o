import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  nome: z.string().min(1).optional(),
  bandeira: z.string().optional(),
  limite: z.number().min(0).optional(),
  dia_fechamento: z.number().min(1).max(31).optional(),
  dia_vencimento: z.number().min(1).max(31).optional(),
  cor: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const db = await getDB();

  const owns = await db.prepare("SELECT id FROM pf_cartoes WHERE id = ? AND user_id = ?").bind(Number(id), session.userId).first();
  if (!owns) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const fields: string[] = [];
  const values: unknown[] = [];
  const d = parsed.data;

  if (d.nome !== undefined) { fields.push("nome = ?"); values.push(d.nome); }
  if (d.bandeira !== undefined) { fields.push("bandeira = ?"); values.push(d.bandeira); }
  if (d.limite !== undefined) { fields.push("limite = ?"); values.push(d.limite); }
  if (d.dia_fechamento !== undefined) { fields.push("dia_fechamento = ?"); values.push(d.dia_fechamento); }
  if (d.dia_vencimento !== undefined) { fields.push("dia_vencimento = ?"); values.push(d.dia_vencimento); }
  if (d.cor !== undefined) { fields.push("cor = ?"); values.push(d.cor); }

  if (!fields.length) return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });

  values.push(id);
  await db.prepare(`UPDATE pf_cartoes SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();

  const row = await db.prepare("SELECT * FROM pf_cartoes WHERE id = ?").bind(id).first();
  return NextResponse.json(row);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const db = await getDB();

  const owns = await db.prepare("SELECT id FROM pf_cartoes WHERE id = ? AND user_id = ?").bind(Number(id), session.userId).first();
  if (!owns) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  await db.prepare("DELETE FROM pf_cartoes WHERE id = ?").bind(id).run();
  return NextResponse.json({ ok: true });
}
