import * as React from "react"
import { Nav } from "./nav"
import { Hero } from "./hero"
import { FeaturesSection } from "./features-section"
import { Integrations } from "./integrations"
import { About } from "./about"
import { Pricing } from "./pricing"
import { Footer } from "./footer"

export function LandingPage() {
  return (
    <div className="dark min-h-screen bg-background text-foreground antialiased">
      <Nav />
      <main>
        <Hero />
        <FeaturesSection />
        <Integrations />
        <About />
        <Pricing />
      </main>
      <Footer />
    </div>
  )
}
