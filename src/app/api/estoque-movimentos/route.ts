import { getDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const estoqueId = req.nextUrl.searchParams.get("estoqueId");
  if (!estoqueId) return NextResponse.json([]);
  const db = getDB();
  const rows = await db.prepare(
    "SELECT * FROM estoque_movimentos WHERE estoque_id = ? ORDER BY criado_at DESC LIMIT 50"
  ).bind(Number(estoqueId)).all();
  return NextResponse.json(rows.results);
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json() as { estoque_id: number; tipo: "entrada" | "saida" | "ajuste"; quantidade: number; observacao?: string };
  const db = getDB();
  await db.prepare(
    "INSERT INTO estoque_movimentos (estoque_id, tipo, quantidade, observacao) VALUES (?, ?, ?, ?)"
  ).bind(body.estoque_id, body.tipo, body.quantidade, body.observacao ?? null).run();

  const delta = body.tipo === "saida" ? -body.quantidade : body.quantidade;
  await db.prepare("UPDATE estoque SET quantidade_atual = quantidade_atual + ? WHERE id = ?")
    .bind(delta, body.estoque_id).run();

  const item = await db.prepare("SELECT * FROM estoque WHERE id = ?").bind(body.estoque_id).first();
  return NextResponse.json(item, { status: 201 });
}
