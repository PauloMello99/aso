import { LegalSection } from "./legal-layout"
import { LEGAL_ENTITY } from "../constants/entity"

export function PrivacyContent() {
  return (
    <>
      <LegalSection heading="1. Escopo desta política">
        <p>
          Esta Política de Privacidade descreve como {LEGAL_ENTITY.razaoSocial}{" "}
          ({LEGAL_ENTITY.cnpj}), operadora do ASO, trata dados pessoais na
          condição de <strong>controladora</strong> — ou seja, os dados de quem
          usa diretamente a plataforma: donos e funcionários de estúdio,
          visitantes do site.
        </p>
        <p>
          Os dados de clientes e pacientes cadastrados por um estúdio dentro do
          ASO (nome, contato, respostas de anamnese, assinatura) são de
          responsabilidade do próprio estúdio como controlador; o ASO atua
          apenas como operador desses dados, conforme o Adendo de Tratamento de
          Dados. Se você é cliente de um estúdio que usa o ASO, procure
          diretamente o estúdio para exercer seus direitos sobre esses dados.
        </p>
      </LegalSection>

      <LegalSection heading="2. Dados que coletamos (usuários da plataforma)">
        <ul className="list-disc space-y-1 pl-5">
          <li>Cadastro: nome, e-mail, senha (armazenada com hash).</li>
          <li>Perfil (opcional): telefone, data de nascimento, gênero, foto.</li>
          <li>
            Faturamento: e-mail e nome da organização enviados ao Stripe para
            processar assinaturas; dados de cartão nunca passam pelos nossos
            servidores.
          </li>
          <li>
            Uso e diagnóstico: registros técnicos de erro (telemetria) para
            manter a plataforma estável.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="3. Finalidades e bases legais">
        <ul className="list-disc space-y-1 pl-5">
          <li>Execução do contrato: criar e manter sua conta, faturar o plano.</li>
          <li>
            Cumprimento de obrigação legal: emissão de documentos fiscais,
            atendimento a autoridades.
          </li>
          <li>
            Legítimo interesse: prevenção a fraude e abuso, diagnóstico técnico.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="4. Com quem compartilhamos (suboperadores)">
        <p>Utilizamos os seguintes prestadores para operar o ASO:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Supabase</strong> — banco de dados, autenticação e
            armazenamento de arquivos.
          </li>
          <li>
            <strong>Stripe</strong> — processamento de pagamentos e assinaturas.
          </li>
          <li>
            <strong>Resend</strong> — envio de e-mails transacionais.
          </li>
          <li>
            <strong>Better Stack</strong> — monitoramento e registro de erros.
          </li>
          <li>Provedor de hospedagem da aplicação.</li>
        </ul>
        <p>
          Não vendemos dados pessoais nem os compartilhamos para fins
          publicitários de terceiros.
        </p>
      </LegalSection>

      <LegalSection heading="5. Transferência internacional">
        <p>
          Alguns dos prestadores listados acima podem processar ou armazenar
          dados fora do Brasil. Nesses casos, exigimos que adotem salvaguardas
          compatíveis com a LGPD (cláusulas contratuais, certificações ou
          equivalentes) para proteger os dados transferidos.
        </p>
      </LegalSection>

      <LegalSection heading="6. Retenção">
        <p>
          Mantemos os dados enquanto sua conta estiver ativa e pelo prazo
          adicional necessário para cumprir obrigações legais (ex.: fiscais) ou
          resolver disputas. Após esse período, os dados são eliminados ou
          anonimizados.
        </p>
      </LegalSection>

      <LegalSection heading="7. Seus direitos e como exercê-los">
        <p>
          Nos termos da LGPD, você pode solicitar confirmação de tratamento,
          acesso, correção, portabilidade, anonimização ou eliminação dos seus
          dados, e informação sobre com quem os compartilhamos.
        </p>
        <p>
          Solicitações podem ser feitas por e-mail ao nosso encarregado (DPO),{" "}
          {LEGAL_ENTITY.encarregado.nome} —{" "}
          <a
            href={`mailto:${LEGAL_ENTITY.encarregado.email}`}
            className="text-primary hover:underline"
          >
            {LEGAL_ENTITY.encarregado.email}
          </a>
          . Hoje esse atendimento é feito manualmente por e-mail; respondemos
          em até 15 (quinze) dias corridos.
        </p>
      </LegalSection>

      <LegalSection heading="8. Segurança">
        <p>
          Os dados de cada estúdio são isolados por controle de acesso em
          nível de banco (Row Level Security), tráfego criptografado (TLS) e
          armazenamento de arquivos privado por padrão.
        </p>
      </LegalSection>

      <LegalSection heading="9. Alterações e contato">
        <p>
          Podemos atualizar esta política; a data de “última atualização”
          no topo reflete a versão vigente. Dúvidas: {LEGAL_ENTITY.emailContato}.
        </p>
      </LegalSection>
    </>
  )
}
