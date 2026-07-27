import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { secret, codigo } = await req.json() as { secret?: string; codigo?: string };
    const adminSecret = process.env.ADMIN_SECRET;

    if (!adminSecret || secret !== adminSecret) {
      return NextResponse.json({ erro: "Senha incorreta." }, { status: 401 });
    }
    if (!codigo) {
      return NextResponse.json({ erro: "Código obrigatório." }, { status: 400 });
    }

    const db = await getDB();
    const row = await db
      .prepare("SELECT id FROM codigos_acesso WHERE codigo = ?")
      .bind(codigo.toUpperCase().trim())
      .first<{ id: number }>();

    if (!row) return NextResponse.json({ erro: "Código não encontrado." }, { status: 404 });

    await db
      .prepare("UPDATE codigos_acesso SET revogado = 1 WHERE id = ?")
      .bind(row.id)
      .run();

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ erro: String(e) }, { status: 500 });
  }
}
