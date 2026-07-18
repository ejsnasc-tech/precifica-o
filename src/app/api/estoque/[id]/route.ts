import { getDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json() as Partial<{ nome: string; unidade: string; quantidade_atual: number; quantidade_minima: number; custo_unitario: number }>;
  const db = getDB();
  const fields = Object.keys(body).map((k) => `${k} = ?`).join(", ");
  const values = Object.values(body);
  await db.prepare(`UPDATE estoque SET ${fields} WHERE id = ?`).bind(...values, Number(id)).run();
  const row = await db.prepare("SELECT * FROM estoque WHERE id = ?").bind(Number(id)).first();
  return NextResponse.json(row);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const db = getDB();
  await db.prepare("DELETE FROM estoque_movimentos WHERE estoque_id = ?").bind(Number(id)).run();
  await db.prepare("DELETE FROM estoque WHERE id = ?").bind(Number(id)).run();
  return new NextResponse(null, { status: 204 });
}
