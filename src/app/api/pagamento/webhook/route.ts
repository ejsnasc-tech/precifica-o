import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";

function gerarCodigo(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${seg()}-${seg()}-${seg()}`;
}

interface MPPayment { status: string; payer?: { email?: string } }

async function buscarPagamento(id: string, token: string): Promise<MPPayment | null> {
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok ? (res.json() as Promise<MPPayment>) : null;
}

async function enviarEmail(email: string, codigo: string, resendKey: string) {
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
      <h1 style="color:#4f46e5;margin-bottom:8px">Top Precificação</h1>
      <p style="color:#374151">Obrigado pela sua compra! Seu código de acesso está abaixo:</p>
      <div style="background:#f5f3ff;border:2px dashed #4f46e5;border-radius:12px;padding:24px;text-align:center;margin:24px 0">
        <p style="font-size:28px;font-weight:900;letter-spacing:4px;color:#4f46e5;margin:0;font-family:monospace">${codigo}</p>
      </div>
      <p style="color:#374151">Para ativar:</p>
      <ol style="color:#374151;line-height:1.8">
        <li>Acesse <a href="https://topprecificacao.com.br/ativar" style="color:#4f46e5">topprecificacao.com.br/ativar</a></li>
        <li>Digite o código acima</li>
        <li>Clique em <strong>Ativar</strong></li>
      </ol>
      <p style="color:#6b7280;font-size:12px;margin-top:32px">
        Este código é de uso único e pessoal. Guarde-o em lugar seguro.<br>
        Dúvidas? Entre em contato: contato@topprecificacao.com.br
      </p>
    </div>
  `;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Top Precificação <noreply@topprecificacao.com.br>",
      to: [email],
      subject: "Seu código de acesso — Top Precificação",
      html,
    }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { type?: string; data?: { id?: string }; status?: string; payer?: { email?: string } };
    const accessToken = process.env.MP_ACCESS_TOKEN;
    const resendKey = process.env.RESEND_API_KEY;

    if (!accessToken || !resendKey) {
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    // MP envia topic=payment com data.id
    if (body.type !== "payment" || !body.data?.id) {
      return NextResponse.json({ ok: true }); // ignora outros eventos
    }

    const pagamento = await buscarPagamento(String(body.data.id), accessToken);
    if (!pagamento || pagamento.status !== "approved") {
      return NextResponse.json({ ok: true }); // aguarda aprovação
    }

    const email = pagamento.payer?.email;
    if (!email) return NextResponse.json({ ok: true });

    const db = await getDB();
    const codigo = gerarCodigo();

    await db
      .prepare("INSERT INTO codigos_acesso (codigo) VALUES (?)")
      .bind(codigo)
      .run();

    await enviarEmail(email, codigo, resendKey);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Webhook erro:", e);
    return NextResponse.json({ erro: String(e) }, { status: 500 });
  }
}
