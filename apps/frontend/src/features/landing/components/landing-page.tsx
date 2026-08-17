import * as React from "react"
import { Nav } from "./nav"
import { Hero } from "./hero"
import { FeaturesSection } from "./features-section"
import { Integrations } from "./integrations"
import { About } from "./about"
import { Pricing } from "./pricing"
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
        title="Gestão completa para estúdios criativos"
        description={SITE_DEFAULT_DESCRIPTION}
        path="/"
        jsonLd={JSON_LD}
      />
      <Nav />
      <main>
        <Hero />
        <FeaturesSection />
        <Integrations />
        <About />
        <Pricing plans={plans} />
      </main>
      <Footer />
    </div>
  )
}
