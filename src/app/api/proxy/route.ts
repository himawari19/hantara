import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  try {
    const { method, url, headers, body } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Validate URL
    let targetUrl: URL;
    try {
      targetUrl = new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Build fetch options
    const fetchOptions: RequestInit = {
      method: method || "GET",
      headers: headers || {},
    };

    // Add body for non-GET/HEAD requests
    if (body && method !== "GET" && method !== "HEAD") {
      fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
    }

    // Make the actual request
    const response = await fetch(targetUrl.toString(), fetchOptions);

    // Read response
    const responseText = await response.text();
    let responseBody: any = responseText;

    // Try to parse as JSON
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      // Keep as text
    }

    // Collect response headers
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return NextResponse.json({
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: responseBody,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: 0,
        statusText: "Error",
        headers: {},
        body: `Request failed: ${err.message}`,
      },
      { status: 500 }
    );
  }
}
