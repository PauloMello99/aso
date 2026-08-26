import * as React from "react"
import { Nav } from "./nav"
import { Hero } from "./hero"
import { CredibilityBar } from "./credibility-bar"
import { ProblemShift } from "./problem-shift"
import { FeaturesSection } from "./features-section"
import { ModuleSpotlight } from "./module-spotlight"
import { TeamPermissions } from "./team-permissions"
import { SecuritySection } from "./security-section"
import { Pricing } from "./pricing"
import { FaqSection } from "./faq-section"
import { FinalCta } from "./final-cta"
import { Footer } from "./footer"
import { Seo } from "@/shared/components/seo"
import { SITE_DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL } from "@/shared/config/site"
import { LEGAL_ENTITY } from "@/features/legal"
import type { PublicBillingPlan } from "@/features/billing/types"

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: SITE_URL,
      description: SITE_DEFAULT_DESCRIPTION,
      offers: {
        "@type": "Offer",
        category: "SaaS",
      },
    },
    {
      "@type": "Organization",
      name: LEGAL_ENTITY.razaoSocial,
      alternateName: SITE_NAME,
      url: SITE_URL,
      email: LEGAL_ENTITY.emailContato,
      address: {
        "@type": "PostalAddress",
        streetAddress: LEGAL_ENTITY.endereco,
      },
    },
  ],
}

interface LandingPageProps {
  plans: PublicBillingPlan[]
}

export function LandingPage({ plans }: LandingPageProps) {
  return (
    <div className="dark min-h-screen bg-background text-foreground antialiased">
      <Seo
        title="Gestão para estúdios de tatuagem"
        description={SITE_DEFAULT_DESCRIPTION}
        path="/"
        jsonLd={JSON_LD}
      />
      <Nav />
      <main>
        <Hero />
        <CredibilityBar />
        <ProblemShift />
        <FeaturesSection />
        <div className="bg-foreground/[0.02]">
          <ModuleSpotlight
            eyebrow="Anamnese"
            title="Anamnese assinada, não papel perdido"
            bullets={[
              "Link público por cliente, sem precisar imprimir nada",
              "Assinatura manuscrita direto na tela do cliente",
              "PDF com termo de consentimento anexado automaticamente",
              "Nova versão do formulário obriga refazer a ficha, nunca fica desatualizada",
            ]}
            imageSrc="/screenshots/anamnesis.webp"
            imageAlt="Ficha de anamnese respondida e assinada digitalmente pelo cliente"
            imageWidth={672}
            imageHeight={900}
          />
          <ModuleSpotlight
            layout="stacked"
            eyebrow="Caixa & margem"
            title="Caixa que mostra a margem real"
            bullets={[
              "Lançamentos imutáveis, correção sempre por errata rastreável",
              "Taxa de cada método de pagamento já descontada no líquido",
              "Custo do material consumido vs. receita, por serviço",
              "Filtros por período, método e categoria + exportação em CSV",
            ]}
            imageSrc="/screenshots/cashier.webp"
            imageAlt="Tela de caixa do ASO com lançamentos de entrada e saída"
            imageWidth={1280}
            imageHeight={900}
          />
          <ModuleSpotlight
            reverse
            eyebrow="Estoque"
            title="Estoque que se atualiza sozinho"
            bullets={[
              "Material consumível ou compartilhável, cada um com sua regra",
              "Baixa automática a cada serviço lançado, sem contagem manual",
              "Alerta quando um item bate o mínimo configurado",
              "Valor estimado para repor tudo que está em falta",
            ]}
            imageSrc="/screenshots/stock.webp"
            imageAlt="Tela de estoque do ASO com materiais, quantidade e custo unitário"
            imageWidth={1280}
            imageHeight={900}
          />
        </div>
        <TeamPermissions />
        <SecuritySection />
        <Pricing plans={plans} />
        <FaqSection />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}
