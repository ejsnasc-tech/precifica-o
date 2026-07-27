import { NextRequest, NextResponse } from "next/server";

const PUBLIC = [
  "/",
  "/ativar",
  "/admin",
  "/privacidade",
  "/api/codigo/verificar",
  "/api/pagamento",
  "/api/admin",
];

// Cookie format: "CODE|expira_em.HMAC"  ou  "CODE|vitalicio.HMAC"
async function verificarLicenca(cookieValue: string, secret: string): Promise<boolean> {
  const dot = cookieValue.lastIndexOf(".");
  if (dot === -1) return false;

  const payload = cookieValue.slice(0, dot);   // "CODE|expira_em"
  const mac = cookieValue.slice(dot + 1);      // 64 hex chars

  if (!payload || mac.length !== 64) return false;

  // 1. Verificar assinatura HMAC (impede cookie forjado)
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  const expected = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");

  // Comparação em tempo constante (evita timing attacks)
  if (expected.length !== mac.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ mac.charCodeAt(i);
  }
  if (diff !== 0) return false;

  // 2. Verificar expiração (se houver prazo no payload)
  const partes = payload.split("|");
  if (partes.length < 2) return false;
  const expira = partes[partes.length - 1]; // último segmento

  if (expira !== "vitalicio") {
    const dataExpiracao = new Date(expira);
    if (isNaN(dataExpiracao.getTime()) || dataExpiracao < new Date()) {
      return false; // acesso expirado
    }
  }

  return true;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p + "?"));

  if (isPublic) return NextResponse.next();

  if (pathname.startsWith("/_next") || pathname.startsWith("/api/") || pathname.includes(".")) {
    return NextResponse.next();
  }

  const cookieValue = req.cookies.get("pp_licenca")?.value ?? "";
  const secret = process.env.COOKIE_SECRET ?? "dev-insecure-secret";

  const valido = await verificarLicenca(cookieValue, secret);
  if (!valido) {
    return NextResponse.redirect(new URL("/ativar", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)"],
};
