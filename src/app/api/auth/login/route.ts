import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDB } from "@/lib/db";
import { signToken, tokenCookieOptions } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const { email, senha } = parsed.data;
  const db = await getDB();

  const user = await db
    .prepare("SELECT id, senha_hash FROM users WHERE email = ?")
    .bind(email)
    .first<{ id: number; senha_hash: string }>();

  if (!user || !(await bcrypt.compare(senha, user.senha_hash))) {
    return NextResponse.json({ error: "E-mail ou senha incorretos." }, { status: 401 });
  }

  const token = await signToken({ userId: user.id, email });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(tokenCookieOptions(token));
  return res;
}
