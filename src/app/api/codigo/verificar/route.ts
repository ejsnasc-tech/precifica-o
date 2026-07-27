import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";

async function signCode(code: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(code));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(req: NextRequest) {
  try {
    const { codigo } = await req.json() as { codigo?: string };
    if (!codigo || typeof codigo !== "string") {
      return NextResponse.json({ erro: "Código inválido." }, { status: 400 });
    }

    const code = codigo.toUpperCase().trim();
    const db = await getDB();
    const row = await db
      .prepare("SELECT id, usado, revogado FROM codigos_acesso WHERE codigo = ?")
      .bind(code)
      .first<{ id: number; usado: number; revogado: number }>();

    if (!row) return NextResponse.json({ erro: "Código não encontrado." }, { status: 404 });
    if (row.revogado) return NextResponse.json({ erro: "Este código foi revogado." }, { status: 410 });
    if (row.usado) return NextResponse.json({ erro: "Este código já foi utilizado." }, { status: 409 });

    await db
      .prepare("UPDATE codigos_acesso SET usado = 1, usado_em = datetime('now') WHERE id = ?")
      .bind(row.id)
      .run();

    const secret = process.env.COOKIE_SECRET ?? "dev-insecure-secret";
    const mac = await signCode(code, secret);
    const cookieValue = `${code}.${mac}`;

    const res = NextResponse.json({ ok: true });
    res.cookies.set("pp_licenca", cookieValue, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365 * 10,
      path: "/",
    });
    return res;
  } catch (e) {
    return NextResponse.json({ erro: String(e) }, { status: 500 });
  }
}
