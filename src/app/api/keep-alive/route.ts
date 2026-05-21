import { NextResponse } from "next/server";

/**
 * Supabase Keep-Alive Endpoint
 * 
 * Prevents Supabase free tier database from sleeping (pauses after 7 days of inactivity).
 * 
 * Strategies:
 * 1. Vercel Cron (vercel.json) - runs every 5 days automatically
 * 2. GitHub Actions (.github/workflows/keep-alive.yml) - backup cron
 * 3. Manual ping - GET /api/keep-alive
 * 
 * The endpoint performs a lightweight query to keep the connection active.
 */

export const runtime = "edge";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      {
        status: "skipped",
        message: "Supabase credentials not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  }

  try {
    // Strategy 1: Simple HEAD request to REST API
    const restPing = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: "HEAD",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });

    // Strategy 2: Query profiles table (lightweight read)
    const queryPing = await fetch(
      `${supabaseUrl}/rest/v1/profiles?select=id&limit=1`,
      {
        method: "GET",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const isAlive = restPing.ok || queryPing.ok;

    if (isAlive) {
      return NextResponse.json({
        status: "alive",
        message: "Supabase database pinged successfully",
        checks: {
          rest: restPing.ok,
          query: queryPing.ok,
        },
        timestamp: new Date().toISOString(),
        nextPing: getNextPingDate(),
      });
    } else {
      return NextResponse.json(
        {
          status: "warning",
          message: "Ping completed but with issues",
          checks: {
            rest: { ok: restPing.ok, status: restPing.status },
            query: { ok: queryPing.ok, status: queryPing.status },
          },
          timestamp: new Date().toISOString(),
        },
        { status: 207 }
      );
    }
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "error",
        message: err.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

function getNextPingDate(): string {
  const next = new Date();
  next.setDate(next.getDate() + 5);
  return next.toISOString();
}
