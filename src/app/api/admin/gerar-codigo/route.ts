import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";

function gerarCodigo(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${seg()}-${seg()}-${seg()}`;
}

export async function POST(req: NextRequest) {
  try {
    const { secret } = await req.json() as { secret?: string };
    const adminSecret = process.env.ADMIN_SECRET;

    if (!adminSecret || secret !== adminSecret) {
      return NextResponse.json({ erro: "Senha incorreta." }, { status: 401 });
    }

    const db = await getDB();
    const codigo = gerarCodigo();
    await db.prepare("INSERT INTO codigos_acesso (codigo) VALUES (?)").bind(codigo).run();

    return NextResponse.json({ codigo });
  } catch (e) {
    return NextResponse.json({ erro: String(e) }, { status: 500 });
  }
}
