import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDB } from "@/lib/db";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { id } = await params;
  const db = await getDB();

  const owns = await db.prepare("SELECT id FROM pf_cartao_lancamentos WHERE id = ? AND user_id = ?").bind(Number(id), session.userId).first();
  if (!owns) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  await db.prepare("DELETE FROM pf_cartao_lancamentos WHERE id = ?").bind(id).run();
  return NextResponse.json({ ok: true });
}
