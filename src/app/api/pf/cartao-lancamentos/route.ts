import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  cartao_id: z.number(),
  data: z.string(),
  descricao: z.string().min(1),
  categoria: z.string().default("outros"),
  valor_total: z.number().min(0),
  parcelas: z.number().min(1).default(1),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const cartaoId = req.nextUrl.searchParams.get("cartaoId");
  const db = await getDB();

  let query = "SELECT cl.* FROM pf_cartao_lancamentos cl JOIN pf_cartoes c ON c.id = cl.cartao_id WHERE cl.user_id = ?";
  const params: unknown[] = [session.userId];

  if (cartaoId) {
    query += " AND cl.cartao_id = ?";
    params.push(Number(cartaoId));
  }

  query += " ORDER BY cl.data DESC";
  const { results } = await db.prepare(query).bind(...params).all();
  return NextResponse.json(results);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const { cartao_id, data, descricao, categoria, valor_total, parcelas } = parsed.data;
  const db = await getDB();

  const ownsCard = await db.prepare("SELECT id FROM pf_cartoes WHERE id = ? AND user_id = ?").bind(cartao_id, session.userId).first();
  if (!ownsCard) return NextResponse.json({ error: "Cartão não encontrado." }, { status: 404 });

  const result = await db
    .prepare("INSERT INTO pf_cartao_lancamentos (cartao_id, user_id, data, descricao, categoria, valor_total, parcelas) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(cartao_id, session.userId, data, descricao, categoria, valor_total, parcelas)
    .run();

  const row = await db.prepare("SELECT * FROM pf_cartao_lancamentos WHERE id = ?").bind(result.meta.last_row_id).first();
  return NextResponse.json(row, { status: 201 });
}
