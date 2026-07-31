import { LegalSection } from "./legal-layout"
import { LEGAL_ENTITY } from "../constants/entity"

export function DpaContent() {
  return (
    <>
      <LegalSection heading="1. Objeto">
        <p>
          Este Adendo de Tratamento de Dados (“Adendo”) integra os Termos de
          Uso e regula o tratamento, por {LEGAL_ENTITY.razaoSocial} ({LEGAL_ENTITY.cnpj}),
          na qualidade de <strong>operadora</strong>, dos dados pessoais que o
          Estúdio, na qualidade de <strong>controlador</strong>, insere na
          plataforma ASO sobre seus próprios clientes, pacientes e demais
          titulares.
        </p>
      </LegalSection>

      <LegalSection heading="2. Natureza e categorias de dados">
        <p>
          O tratamento pode envolver: dados cadastrais de clientes (nome,
          e-mail, telefone, endereço, data de nascimento); respostas de fichas
          de anamnese, que podem incluir <strong>dados sensíveis de saúde</strong>{" "}
          (art. 5º, II e art. 11 da LGPD); assinatura eletrônica e evidências
          técnicas de sua captura (data/hora, endereço IP, identificação do
          navegador); documentos anexados pelo Estúdio.
        </p>
      </LegalSection>

      <LegalSection heading="3. Instruções do controlador">
        <p>
          O ASO trata esses dados exclusivamente para viabilizar as
          funcionalidades da plataforma conforme configuradas e operadas pelo
          Estúdio (agendamento, ficha de anamnese, histórico de atendimento,
          faturamento interno do Estúdio), e não os utiliza para finalidade
          própria ou de terceiros.
        </p>
      </LegalSection>

      <LegalSection heading="4. Confidencialidade e segurança">
        <p>
          O acesso aos dados de cada organização é isolado por controle de
          acesso em nível de linha no banco de dados (Row Level Security),
          restrito a usuários autorizados daquela organização. Arquivos
          (assinaturas, PDFs, anexos) são armazenados em bucket privado, com
          acesso mediado por URLs assinadas e com prazo de expiração. Todo
          tráfego é criptografado em trânsito (TLS).
        </p>
      </LegalSection>

      <LegalSection heading="5. Suboperadores">
        <p>
          O Estúdio autoriza o ASO a utilizar os seguintes suboperadores, sob
          obrigações de proteção de dados equivalentes às deste Adendo:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Supabase (banco de dados, autenticação, armazenamento de arquivos);</li>
          <li>Resend (envio de e-mails transacionais em nome do Estúdio, ex.: link de anamnese);</li>
          <li>Stripe (processamento de pagamentos, dados restritos ao faturamento do Estúdio com o ASO);</li>
          <li>Better Stack (monitoramento técnico e registro de erros);</li>
          <li>provedor de hospedagem da aplicação.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="6. Transferência internacional">
        <p>
          Alguns suboperadores podem processar dados fora do Brasil. O ASO
          exige desses suboperadores salvaguardas compatíveis com a LGPD para
          essa transferência.
        </p>
      </LegalSection>

      <LegalSection heading="7. Cooperação com o controlador">
        <p>
          O ASO cooperará com o Estúdio para atender solicitações de titulares
          (acesso, correção, eliminação) e para apurar e comunicar incidentes
          de segurança que afetem os dados tratados sob este Adendo, dentro de
          prazo razoável a partir de sua ciência.
        </p>
      </LegalSection>

      <LegalSection heading="8. Retenção, devolução e eliminação">
        <p>
          Ao término do contrato, os dados permanecem disponíveis por prazo
          razoável para exportação pelo Estúdio, findo o qual são eliminados
          ou anonimizados, ressalvada a retenção exigida por obrigação legal.
        </p>
      </LegalSection>

      <LegalSection heading="9. Vigência">
        <p>
          Este Adendo vigora enquanto durar a relação contratual entre o
          Estúdio e o ASO regida pelos Termos de Uso.
        </p>
      </LegalSection>
    </>
  )
}
