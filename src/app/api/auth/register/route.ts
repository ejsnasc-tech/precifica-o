import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDB } from "@/lib/db";
import { signToken, tokenCookieOptions } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  senha: z.string().min(6),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const { nome, email, senha } = parsed.data;
  const db = await getDB();

  const existing = await db
    .prepare("SELECT id FROM users WHERE email = ?")
    .bind(email)
    .first();
  if (existing) {
    return NextResponse.json({ error: "E-mail já cadastrado." }, { status: 409 });
  }

  const hash = await bcrypt.hash(senha, 10);
  const result = await db
    .prepare("INSERT INTO users (nome, email, senha_hash) VALUES (?, ?, ?)")
    .bind(nome, email, hash)
    .run();

  const userId = result.meta.last_row_id as number;
  const token = await signToken({ userId, email });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(tokenCookieOptions(token));
  return res;
}
