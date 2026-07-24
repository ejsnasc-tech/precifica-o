import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade — Precificação Pro",
  description: "Política de privacidade do app Precificação Pro",
};

export default function PrivacidadePage() {
  const updated = "23 de julho de 2026";

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm p-8 md:p-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Política de Privacidade</h1>
        <p className="text-sm text-gray-500 mb-8">Atualizado em {updated}</p>

        <Section title="1. Visão geral">
          O Precificação Pro é um aplicativo desenvolvido pela Ejsnasc Tech. Esta política
          descreve como tratamos as informações dos usuários do app para iOS e Android.
        </Section>

        <Section title="2. Dados coletados">
          O app Precificação Pro <strong>não coleta, transmite nem armazena dados pessoais
          em servidores externos</strong>. Todos os dados inseridos no app — precificações,
          lançamentos financeiros, itens de estoque e demais informações — ficam
          armazenados exclusivamente no dispositivo do usuário.
        </Section>

        <Section title="3. Sem rastreamento">
          O app não utiliza ferramentas de análise, rastreamento ou publicidade de terceiros.
          Nenhuma informação é compartilhada com terceiros.
        </Section>

        <Section title="4. Permissões do dispositivo">
          O app não solicita acesso à câmera, microfone, localização, contatos ou qualquer
          outro recurso sensível do dispositivo.
        </Section>

        <Section title="5. Exclusão de dados">
          Como todos os dados ficam no dispositivo, o usuário pode removê-los a qualquer
          momento desinstalando o app ou limpando os dados do aplicativo nas configurações
          do sistema operacional.
        </Section>

        <Section title="6. Contato">
          Dúvidas sobre esta política? Entre em contato:{" "}
          <a href="mailto:edu31nasc@icloud.com" className="text-indigo-600 underline">
            edu31nasc@icloud.com
          </a>
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-gray-800 mb-2">{title}</h2>
      <p className="text-gray-600 leading-relaxed">{children}</p>
    </section>
  );
}
