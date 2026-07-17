import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  dados: z.array(
    z.object({
      nome: z.string().min(1),
      percentual: z.number().min(0).max(100),
      retirada: z.number().min(0).optional(),
    })
  ),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ empresaId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { empresaId } = await params;
  const db = await getDB();

  const owns = await db
    .prepare("SELECT id FROM empresas WHERE id = ? AND user_id = ?")
    .bind(Number(empresaId), session.userId)
    .first();
  if (!owns) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  const row = await db
    .prepare("SELECT dados FROM socios WHERE empresa_id = ?")
    .bind(Number(empresaId))
    .first<{ dados: string }>();

  return NextResponse.json({ dados: row ? JSON.parse(row.dados) : [] });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ empresaId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { empresaId } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const db = await getDB();
  const owns = await db
    .prepare("SELECT id FROM empresas WHERE id = ? AND user_id = ?")
    .bind(Number(empresaId), session.userId)
    .first();
  if (!owns) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  await db
    .prepare(
      `INSERT INTO socios (empresa_id, dados) VALUES (?, ?)
       ON CONFLICT(empresa_id) DO UPDATE SET dados = excluded.dados`
    )
    .bind(Number(empresaId), JSON.stringify(parsed.data.dados))
    .run();

  return NextResponse.json({ dados: parsed.data.dados });
}
