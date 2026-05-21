import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleMockRequest(request, await params, "GET");
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleMockRequest(request, await params, "POST");
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleMockRequest(request, await params, "PUT");
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleMockRequest(request, await params, "PATCH");
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleMockRequest(request, await params, "DELETE");
}

async function handleMockRequest(
  request: NextRequest,
  params: { path: string[] },
  method: string
) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const pathSegments = params.path;

    // First segment is the mock server ID or base path
    const serverIdentifier = pathSegments[0];
    const routePath = "/" + pathSegments.slice(1).join("/");

    // Find the mock server
    const { data: server } = await supabase
      .from("mock_servers")
      .select("id, is_active")
      .eq("id", serverIdentifier)
      .single();

    if (!server || !server.is_active) {
      return NextResponse.json(
        { error: "Mock server not found or inactive" },
        { status: 404 }
      );
    }

    // Find matching route
    const { data: route } = await supabase
      .from("mock_routes")
      .select("*")
      .eq("mock_server_id", server.id)
      .eq("method", method)
      .eq("path", routePath)
      .eq("is_active", true)
      .single();

    if (!route) {
      return NextResponse.json(
        { error: `No mock route found for ${method} ${routePath}` },
        { status: 404 }
      );
    }

    // Apply delay if configured
    if (route.delay_ms > 0) {
      await new Promise((resolve) => setTimeout(resolve, route.delay_ms));
    }

    // Build response headers
    const responseHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...(route.response_headers || {}),
    };

    // Try to parse body as JSON
    let body = route.response_body;
    try {
      body = JSON.parse(route.response_body);
    } catch {
      // Keep as string
    }

    return NextResponse.json(body, {
      status: route.response_status || 200,
      headers: responseHeaders,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Mock server error: " + err.message },
      { status: 500 }
    );
  }
}
