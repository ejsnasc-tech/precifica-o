import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { secret } = await req.json() as { secret?: string };
    const adminSecret = process.env.ADMIN_SECRET;

    if (!adminSecret || secret?.trim() !== adminSecret.trim()) {
      return NextResponse.json({ erro: "Senha incorreta." }, { status: 401 });
    }

    const db = await getDB();
    const { results } = await db
      .prepare(`SELECT codigo, nome_cliente, email_cliente, usado, revogado, criado_em, usado_em, expira_em
                FROM codigos_acesso ORDER BY criado_em DESC LIMIT 100`)
      .all<{
        codigo: string; nome_cliente: string | null; email_cliente: string | null;
        usado: number; revogado: number; criado_em: string; usado_em: string | null; expira_em: string | null;
      }>();

    return NextResponse.json({ codigos: results });
  } catch (e) {
    return NextResponse.json({ erro: String(e) }, { status: 500 });
  }
}
