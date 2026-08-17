import type { GetStaticProps, NextPage } from "next"
import { LandingPage } from "@/features/landing"
import type { PublicBillingPlan } from "@/features/billing/types"

interface HomeProps {
  plans: PublicBillingPlan[]
}

const Home: NextPage<HomeProps> = ({ plans }) => <LandingPage plans={plans} />

export default Home

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"

export const getStaticProps: GetStaticProps<HomeProps> = async () => {
  try {
    const res = await fetch(`${API_URL}/public/billing/plans`)

    if (!res.ok) {
      return { props: { plans: [] }, revalidate: 21600 }
    }

    const data: unknown = await res.json()
    const plans = Array.isArray(data) ? (data as PublicBillingPlan[]) : []

    return { props: { plans }, revalidate: 21600 }
  } catch {
    return { props: { plans: [] }, revalidate: 21600 }
  }
}
