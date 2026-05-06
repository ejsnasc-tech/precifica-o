import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { z } from "zod";

async function checkOwnership(produtoId: number, userId: number) {
  const db = await getDB();
  const row = await db
    .prepare(`SELECT p.id FROM produtos p
              JOIN empresas e ON e.id = p.empresa_id
              WHERE p.id = ? AND e.user_id = ?`)
    .bind(produtoId, userId)
    .first();
  return { db, owns: !!row };
}

const schema = z.object({
  nome: z.string().min(1).optional(),
  margem: z.number().min(0).max(100).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const { db, owns } = await checkOwnership(Number(id), session.userId);
  if (!owns) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  const produto = await db.prepare("SELECT * FROM produtos WHERE id = ?").bind(id).first();
  const { results: ingredientes } = await db
    .prepare("SELECT * FROM ingredientes WHERE produto_id = ? ORDER BY id")
    .bind(id)
    .all();

  return NextResponse.json({ ...produto, ingredientes });
}

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
  if (parsed.data.nome !== undefined) { fields.push("nome = ?"); values.push(parsed.data.nome); }
  if (parsed.data.margem !== undefined) { fields.push("margem = ?"); values.push(parsed.data.margem); }
  if (!fields.length) return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });

  values.push(id);
  await db.prepare(`UPDATE produtos SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
  return NextResponse.json(await db.prepare("SELECT * FROM produtos WHERE id = ?").bind(id).first());
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const { db, owns } = await checkOwnership(Number(id), session.userId);
  if (!owns) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  await db.prepare("DELETE FROM produtos WHERE id = ?").bind(id).run();
  return NextResponse.json({ ok: true });
}
