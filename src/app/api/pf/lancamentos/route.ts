import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  data: z.string(),
  tipo: z.enum(["receita", "despesa"]),
  categoria: z.string().default("outros"),
  descricao: z.string().min(1),
  valor: z.number().min(0),
  obs: z.string().default(""),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const ano = req.nextUrl.searchParams.get("ano");
  const mes = req.nextUrl.searchParams.get("mes");

  const db = await getDB();
  let query = "SELECT * FROM pf_lancamentos WHERE user_id = ?";
  const params: unknown[] = [session.userId];

  if (ano && mes) {
    query += " AND data LIKE ?";
    params.push(`${ano}-${String(mes).padStart(2, "0")}-%`);
  } else if (ano) {
    query += " AND data LIKE ?";
    params.push(`${ano}-%`);
  }

  query += " ORDER BY data DESC";
  const { results } = await db.prepare(query).bind(...params).all();
  return NextResponse.json(results);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const { data, tipo, categoria, descricao, valor, obs } = parsed.data;
  const db = await getDB();

  const result = await db
    .prepare("INSERT INTO pf_lancamentos (user_id, data, tipo, categoria, descricao, valor, obs) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(session.userId, data, tipo, categoria, descricao, valor, obs)
    .run();

  const row = await db.prepare("SELECT * FROM pf_lancamentos WHERE id = ?").bind(result.meta.last_row_id).first();
  return NextResponse.json(row, { status: 201 });
}
