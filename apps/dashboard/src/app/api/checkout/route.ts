import { PLANS, getDiscount } from "@/utils/plans";
import { api } from "@/utils/polar";
import { getSession, getUser } from "@midday/supabase/cached-queries";
import { geolocation } from "@vercel/functions";
import { type NextRequest, NextResponse } from "next/server";

export const GET = async (req: NextRequest) => {
  const {
    data: { session },
  } = await getSession();

  if (!session?.user?.id) {
    throw new Error("You must be logged in");
  }

  const plan = req.nextUrl.searchParams.get("plan");
  const redirectPath = req.nextUrl.searchParams.get("redirectPath") ?? "/";
  const teamId = req.nextUrl.searchParams.get("teamId");
  const isDesktop = req.nextUrl.searchParams.get("isDesktop") === "true";

  const selectedPlan = PLANS[plan as keyof typeof PLANS];

  if (!selectedPlan) {
    throw new Error("Invalid plan");
  }

  const userData = await getUser();

  if (!userData?.data?.team) {
    throw new Error("Team not found");
  }

  const discountId = getDiscount(userData.data.team.created_at);

  const { country } = geolocation(req);

  const successUrl = new URL(redirectPath, req.nextUrl.origin);

  if (isDesktop) {
    successUrl.searchParams.set("isDesktop", "true");
  }

  const checkout = await api.checkouts.create({
    productId: selectedPlan.id,
    successUrl: successUrl.toString(),
    customerExternalId: teamId,
    customerEmail: userData.data.email ?? undefined,
    customerName: userData.data.full_name ?? undefined,
    discountId: discountId?.id,
    customerBillingAddress: {
      country: country ?? "US",
    },
  });

  return NextResponse.redirect(checkout.url);
};
