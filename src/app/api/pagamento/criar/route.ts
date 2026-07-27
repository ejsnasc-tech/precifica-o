import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json() as { email?: string };
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json({ erro: "Pagamento não configurado." }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://topprecificacao.com.br";

    const body = {
      items: [
        {
          id: "top-precificacao-acesso",
          title: "Top Precificação — Acesso Vitalício",
          description: "Acesso completo ao sistema de precificação, financeiro e estoque.",
          quantity: 1,
          currency_id: "BRL",
          unit_price: 29.9,
        },
      ],
      payer: email ? { email } : undefined,
      back_urls: {
        success: `${baseUrl}/ativar?status=sucesso`,
        failure: `${baseUrl}/?status=falha`,
        pending: `${baseUrl}/?status=pendente`,
      },
      auto_approve: false,
      notification_url: `${baseUrl}/api/pagamento/webhook`,
      statement_descriptor: "TOP PRECIFICACAO",
      external_reference: `acesso-${Date.now()}`,
    };

    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ erro: err }, { status: 500 });
    }

    const data = await res.json() as { init_point: string; id: string };
    return NextResponse.json({ url: data.init_point, id: data.id });
  } catch (e) {
    return NextResponse.json({ erro: String(e) }, { status: 500 });
  }
}
