import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";

function gerarCodigo(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${seg()}-${seg()}-${seg()}`;
}

export async function POST(req: NextRequest) {
  try {
    const { secret, nome_cliente, email_cliente, expira_em } =
      await req.json() as { secret?: string; nome_cliente?: string; email_cliente?: string; expira_em?: string };

    const adminSecret = process.env.ADMIN_SECRET;
    // trim() evita problema de newline no segredo armazenado
    if (!adminSecret || secret?.trim() !== adminSecret.trim()) {
      return NextResponse.json({ erro: "Senha incorreta." }, { status: 401 });
    }

    const db = await getDB();
    const codigo = gerarCodigo();
    await db
      .prepare("INSERT INTO codigos_acesso (codigo, nome_cliente, email_cliente, expira_em) VALUES (?, ?, ?, ?)")
      .bind(codigo, nome_cliente?.trim() || null, email_cliente?.trim() || null, expira_em || null)
      .run();

    return NextResponse.json({ codigo });
  } catch (e) {
    return NextResponse.json({ erro: String(e) }, { status: 500 });
  }
}
