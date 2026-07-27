import { NextRequest, NextResponse } from "next/server";

// Rotas que não precisam de licença
const PUBLIC = [
  "/",
  "/ativar",
  "/admin",
  "/privacidade",
  "/api/codigo/verificar",
  "/api/pagamento",
  "/api/admin",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p + "?"));

  if (isPublic) return NextResponse.next();

  // Rotas de API internas e assets do Next.js passam direto
  if (pathname.startsWith("/_next") || pathname.startsWith("/api/") || pathname.includes(".")) {
    return NextResponse.next();
  }

  // Verificação de licença via cookie (setado pelo /ativar após validar o código)
  const licenca = req.cookies.get("pp_licenca")?.value;
  if (!licenca || licenca !== "ok") {
    return NextResponse.redirect(new URL("/ativar", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)"],
};
