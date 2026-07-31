import Link from "next/link"
import { LegalSection } from "./legal-layout"
import { LEGAL_ENTITY, LEGAL_ROUTES } from "../constants/entity"

export function TermsContent() {
  return (
    <>
      <LegalSection heading="1. Quem somos e o que é o ASO">
        <p>
          O ASO é uma plataforma de gestão operacional para estúdios e negócios de
          serviço (agendamento, clientes, estoque e caixa), fornecida por{" "}
          {LEGAL_ENTITY.razaoSocial} ({LEGAL_ENTITY.cnpj}), com sede em{" "}
          {LEGAL_ENTITY.endereco} (“ASO”, “nós”).
        </p>
        <p>
          Estes Termos de Uso regem a contratação e utilização do ASO por
          estúdios, profissionais autônomos e demais organizações (“Estúdio”,
          “você”) que criem uma conta na plataforma.
        </p>
      </LegalSection>

      <LegalSection heading="2. Conta e cadastro">
        <p>
          O cadastro exige informações verdadeiras, completas e atualizadas. Você
          é responsável pela guarda de suas credenciais e por toda atividade
          realizada com sua conta. Cada organização (estúdio) criada na
          plataforma é isolada das demais.
        </p>
      </LegalSection>

      <LegalSection heading="3. Planos, cobrança e cancelamento">
        <p>
          Os planos pagos são processados via Stripe. Ao contratar um plano
          pago, você autoriza a cobrança recorrente conforme a periodicidade
          escolhida. O cancelamento pode ser feito a qualquer momento pelo
          portal de faturamento; o acesso permanece ativo até o fim do período
          já pago.
        </p>
        <p>
          <strong>Direito de arrependimento:</strong> nos termos do art. 49 do
          Código de Defesa do Consumidor, você pode desistir da contratação em
          até 7 (sete) dias corridos a contar da assinatura, com reembolso
          integral, mediante solicitação para {LEGAL_ENTITY.emailContato}.
        </p>
        <p>
          Em caso de inadimplência, o acesso a funcionalidades pode ser
          restringido até a regularização do pagamento, sem exclusão imediata
          dos dados.
        </p>
      </LegalSection>

      <LegalSection heading="4. Dados tratados por sua conta (papel de operador)">
        <p>
          Ao usar o ASO para gerenciar clientes, fichas de anamnese e demais
          registros de sua operação, você (“Estúdio”) figura como{" "}
          <strong>controlador</strong> desses dados perante a Lei Geral de
          Proteção de Dados (LGPD), e o ASO atua como <strong>operador</strong>,
          tratando os dados apenas conforme suas instruções. As condições
          específicas desse tratamento estão no{" "}
          <Link href={LEGAL_ROUTES.dpa} className="text-primary hover:underline">
            Adendo de Tratamento de Dados
          </Link>
          , parte integrante destes Termos.
        </p>
      </LegalSection>

      <LegalSection heading="5. Propriedade e uso do conteúdo">
        <p>
          Os dados inseridos por você (clientes, fichas, registros financeiros)
          pertencem a você. O ASO não utiliza esses dados para finalidade
          diversa da prestação do serviço contratado.
        </p>
      </LegalSection>

      <LegalSection heading="6. Limitação de responsabilidade">
        <p>
          O ASO é fornecido “como está”. Envidamos esforços razoáveis para
          manter a disponibilidade e a integridade dos dados, mas não
          garantimos operação ininterrupta. Nossa responsabilidade, quando
          aplicável, limita-se aos valores pagos nos últimos 12 (doze) meses.
        </p>
      </LegalSection>

      <LegalSection heading="7. Rescisão e exclusão de dados">
        <p>
          Você pode encerrar sua conta a qualquer momento. Após o encerramento,
          os dados são retidos pelo prazo necessário ao cumprimento de
          obrigações legais e, decorrido esse prazo, eliminados ou
          anonimizados.
        </p>
      </LegalSection>

      <LegalSection heading="8. Alterações e foro">
        <p>
          Podemos atualizar estes Termos; alterações relevantes serão
          comunicadas por e-mail ou aviso na plataforma. Fica eleito o foro da
          comarca da sede do ASO para dirimir eventuais controvérsias.
        </p>
      </LegalSection>

      <LegalSection heading="9. Contato">
        <p>Dúvidas sobre estes Termos: {LEGAL_ENTITY.emailContato}.</p>
      </LegalSection>
    </>
  )
}
