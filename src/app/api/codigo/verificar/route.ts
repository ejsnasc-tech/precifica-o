import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { codigo } = await req.json() as { codigo?: string };
    if (!codigo || typeof codigo !== "string") {
      return NextResponse.json({ erro: "Código inválido." }, { status: 400 });
    }

    const db = await getDB();
    const row = await db
      .prepare("SELECT id, usado FROM codigos_acesso WHERE codigo = ?")
      .bind(codigo.toUpperCase().trim())
      .first<{ id: number; usado: number }>();

    if (!row) {
      return NextResponse.json({ erro: "Código não encontrado." }, { status: 404 });
    }
    if (row.usado) {
      return NextResponse.json({ erro: "Este código já foi utilizado." }, { status: 409 });
    }

    await db
      .prepare("UPDATE codigos_acesso SET usado = 1, usado_em = datetime('now') WHERE id = ?")
      .bind(row.id)
      .run();

    const res = NextResponse.json({ ok: true });
    res.cookies.set("pp_licenca", "ok", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365 * 10, // 10 anos
      path: "/",
    });
    return res;
  } catch (e) {
    return NextResponse.json({ erro: String(e) }, { status: 500 });
  }
}
