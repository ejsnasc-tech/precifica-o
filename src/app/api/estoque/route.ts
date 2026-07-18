import { getDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const empresaId = req.nextUrl.searchParams.get("empresaId");
  if (!empresaId) return NextResponse.json([], { status: 200 });
  const db = await getDB();
  const rows = await db.prepare("SELECT * FROM estoque WHERE empresa_id = ? ORDER BY nome").bind(Number(empresaId)).all();
  return NextResponse.json(rows.results);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json() as { empresa_id: number; nome: string; unidade: string; quantidade_atual: number; quantidade_minima: number; custo_unitario: number };
  const db = await getDB();
  const result = await db.prepare(
    "INSERT INTO estoque (empresa_id, nome, unidade, quantidade_atual, quantidade_minima, custo_unitario) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(body.empresa_id, body.nome, body.unidade ?? "un", body.quantidade_atual ?? 0, body.quantidade_minima ?? 0, body.custo_unitario ?? 0).run();
  return NextResponse.json({ id: result.meta.last_row_id }, { status: 201 });
}
