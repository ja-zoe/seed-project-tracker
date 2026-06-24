import { NextResponse } from "next/server";
import { casLoginUrl } from "@/lib/cas";

export const dynamic = "force-dynamic";

/**
 * Entry point for sign-in. Redirects the browser to CAS (real) or the mock CAS
 * screen (dev), with our callback set as the CAS `service`.
 */
export async function GET() {
  return NextResponse.redirect(casLoginUrl());
}
