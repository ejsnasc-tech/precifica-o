import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { z } from "zod";

async function checkOwnership(empresaId: number, userId: number) {
  const db = await getDB();
  const empresa = await db
    .prepare("SELECT id FROM empresas WHERE id = ? AND user_id = ?")
    .bind(empresaId, userId)
    .first();
  return { db, owns: !!empresa };
}

const schema = z.object({
  nome: z.string().min(1).optional(),
  descricao: z.string().optional(),
  cor: z.string().optional(),
  emoji: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const empresaId = Number(id);
  const { db, owns } = await checkOwnership(empresaId, session.userId);
  if (!owns) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const { nome, descricao, cor, emoji } = parsed.data;
  const fields: string[] = [];
  const values: unknown[] = [];

  if (nome !== undefined) { fields.push("nome = ?"); values.push(nome); }
  if (descricao !== undefined) { fields.push("descricao = ?"); values.push(descricao); }
  if (cor !== undefined) { fields.push("cor = ?"); values.push(cor); }
  if (emoji !== undefined) { fields.push("emoji = ?"); values.push(emoji); }

  if (fields.length === 0) return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });

  values.push(empresaId);
  await db.prepare(`UPDATE empresas SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();

  const updated = await db.prepare("SELECT * FROM empresas WHERE id = ?").bind(empresaId).first();
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const empresaId = Number(id);
  const { db, owns } = await checkOwnership(empresaId, session.userId);
  if (!owns) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  await db.prepare("DELETE FROM empresas WHERE id = ?").bind(empresaId).run();
  return NextResponse.json({ ok: true });
}
