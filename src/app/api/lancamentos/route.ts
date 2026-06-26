import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { z } from "zod";

const itemSchema = z.object({
  categoria: z.string(),
  descricao: z.string(),
  valor: z.number().min(0),
});

const schema = z.object({
  empresa_id: z.number(),
  data: z.string(),
  vendas: z.number().min(0),
  itens: z.array(itemSchema).default([]),
  obs: z.string().default(""),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const empresaId = Number(req.nextUrl.searchParams.get("empresaId"));
  if (!empresaId) return NextResponse.json({ error: "empresaId obrigatório." }, { status: 400 });

  const db = await getDB();
  const owns = await db
    .prepare("SELECT id FROM empresas WHERE id = ? AND user_id = ?")
    .bind(empresaId, session.userId)
    .first();
  if (!owns) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  const ano = req.nextUrl.searchParams.get("ano");
  const mes = req.nextUrl.searchParams.get("mes");

  let query = "SELECT * FROM lancamentos WHERE empresa_id = ?";
  const params: unknown[] = [empresaId];

  if (ano && mes) {
    query += " AND data LIKE ?";
    params.push(`${ano}-${String(mes).padStart(2, "0")}-%`);
  } else if (ano) {
    query += " AND data LIKE ?";
    params.push(`${ano}-%`);
  }

  query += " ORDER BY data DESC";
  const { results } = await db.prepare(query).bind(...params).all<Record<string, unknown>>();

  return NextResponse.json(
    results.map((r) => ({ ...r, itens: JSON.parse((r.itens as string) || "[]") }))
  );
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const { empresa_id, data, vendas, itens, obs } = parsed.data;
  const db = await getDB();

  const owns = await db
    .prepare("SELECT id FROM empresas WHERE id = ? AND user_id = ?")
    .bind(empresa_id, session.userId)
    .first();
  if (!owns) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  const result = await db
    .prepare("INSERT INTO lancamentos (empresa_id, data, vendas, itens, obs) VALUES (?, ?, ?, ?, ?)")
    .bind(empresa_id, data, vendas, JSON.stringify(itens), obs)
    .run();

  const row = await db
    .prepare("SELECT * FROM lancamentos WHERE id = ?")
    .bind(result.meta.last_row_id)
    .first<Record<string, unknown>>();

  return NextResponse.json(
    { ...row, itens: JSON.parse((row?.itens as string) || "[]") },
    { status: 201 }
  );
}
