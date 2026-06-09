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
    <div className="min-h-screen bg-[#0d0d0f] text-white antialiased">
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
