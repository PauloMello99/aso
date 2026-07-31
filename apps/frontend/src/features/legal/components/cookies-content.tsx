import { LegalSection } from "./legal-layout"
import { LEGAL_ENTITY } from "../constants/entity"

export function CookiesContent() {
  return (
    <>
      <LegalSection heading="1. Não usamos cookies de rastreamento">
        <p>
          O ASO não grava cookies no seu navegador e não utiliza ferramentas de
          rastreamento publicitário, análise de terceiros (como Google
          Analytics), pixels ou redes sociais incorporadas. Não há banner de
          consentimento porque não há nada de opcional a consentir: apenas o
          armazenamento estritamente necessário abaixo é utilizado.
        </p>
      </LegalSection>

      <LegalSection heading="2. Armazenamento local utilizado">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Sessão de acesso</strong> — guarda o token que mantém você
            autenticado após o login. Estritamente necessário: sem ele, o ASO
            não funciona.
          </li>
          <li>
            <strong>Preferência de tema</strong> — lembra se você prefere o
            tema claro ou escuro. Funcional, não identifica você.
          </li>
        </ul>
        <p>
          Esses dados ficam apenas no seu navegador (armazenamento local) e não
          são enviados a terceiros para fins de publicidade.
        </p>
      </LegalSection>

      <LegalSection heading="3. Fontes e recursos externos">
        <p>
          As fontes utilizadas na interface são incorporadas no momento da
          construção do site (não carregadas do Google em tempo real). Os
          links de pagamento redirecionam para o ambiente seguro hospedado do
          Stripe, que segue sua própria política de cookies enquanto você
          estiver naquele domínio.
        </p>
      </LegalSection>

      <LegalSection heading="4. Alterações">
        <p>
          Se no futuro passarmos a usar cookies de análise ou marketing, esta
          página será atualizada e um mecanismo de consentimento apropriado
          será adicionado antes da ativação. Dúvidas: {LEGAL_ENTITY.emailContato}.
        </p>
      </LegalSection>
    </>
  )
}
