import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";

async function sign(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(req: NextRequest) {
  try {
    const { codigo, nome, email } = await req.json() as { codigo?: string; nome?: string; email?: string };
    if (!codigo || typeof codigo !== "string") {
      return NextResponse.json({ erro: "Código inválido." }, { status: 400 });
    }
    if (!email || !email.includes("@")) {
      return NextResponse.json({ erro: "E-mail obrigatório." }, { status: 400 });
    }

    const code = codigo.toUpperCase().trim();
    const db = await getDB();
    const row = await db
      .prepare("SELECT id, usado, revogado, expira_em FROM codigos_acesso WHERE codigo = ?")
      .bind(code)
      .first<{ id: number; usado: number; revogado: number; expira_em: string | null }>();

    if (!row) return NextResponse.json({ erro: "Código não encontrado." }, { status: 404 });
    if (row.revogado) return NextResponse.json({ erro: "Este código foi revogado." }, { status: 410 });
    if (row.usado) return NextResponse.json({ erro: "Este código já foi utilizado." }, { status: 409 });

    // Verificar se o código ainda não expirou antes mesmo de ser ativado
    if (row.expira_em && new Date(row.expira_em) < new Date()) {
      return NextResponse.json({ erro: "Este código expirou." }, { status: 410 });
    }

    await db
      .prepare("UPDATE codigos_acesso SET usado = 1, usado_em = datetime('now'), nome_cliente = ?, email_cliente = ? WHERE id = ?")
      .bind(nome?.trim() || null, email.trim().toLowerCase(), row.id)
      .run();

    // Payload do cookie inclui o prazo para o middleware verificar sem consultar o banco
    const expira = row.expira_em ?? "vitalicio";
    const payload = `${code}|${expira}`;

    const secret = process.env.COOKIE_SECRET ?? "dev-insecure-secret";
    const mac = await sign(payload, secret);
    const cookieValue = `${payload}.${mac}`;

    // maxAge: vitalício = 10 anos; prazo definido = até a data de expiração
    let maxAge = 60 * 60 * 24 * 365 * 10;
    if (row.expira_em) {
      const secsLeft = Math.floor((new Date(row.expira_em).getTime() - Date.now()) / 1000);
      maxAge = Math.max(secsLeft, 0);
    }

    const res = NextResponse.json({ ok: true, expira_em: row.expira_em });
    res.cookies.set("pp_licenca", cookieValue, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge,
      path: "/",
    });
    return res;
  } catch (e) {
    return NextResponse.json({ erro: String(e) }, { status: 500 });
  }
}
