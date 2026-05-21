import { NextRequest, NextResponse } from "next/server";

// Use Node.js runtime for better compatibility with large responses and encoding
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { method, url, headers, body, cookies: requestCookies } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Auto-prepend https:// if no protocol specified
    let normalizedUrl = url.trim();
    if (!normalizedUrl.match(/^https?:\/\//i)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    // Validate URL
    let targetUrl: URL;
    try {
      targetUrl = new URL(normalizedUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Build fetch options
    const fetchHeaders: Record<string, string> = { ...(headers || {}) };

    // Set a default User-Agent if not provided (some sites block requests without one)
    if (!fetchHeaders["User-Agent"] && !fetchHeaders["user-agent"]) {
      fetchHeaders["User-Agent"] = "Hantara/1.0";
    }

    // Apply cookies if provided
    if (requestCookies && Array.isArray(requestCookies) && requestCookies.length > 0) {
      const cookieString = requestCookies
        .map((c: { name: string; value: string }) => `${c.name}=${c.value}`)
        .join("; ");
      fetchHeaders["Cookie"] = cookieString;
    }

    const fetchOptions: RequestInit = {
      method: method || "GET",
      headers: fetchHeaders,
      redirect: "follow",
    };

    // Add body for non-GET/HEAD requests
    if (body && method !== "GET" && method !== "HEAD") {
      fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
    }

    // Make the actual request
    const startTime = Date.now();
    const response = await fetch(targetUrl.toString(), fetchOptions);
    const endTime = Date.now();

    // Read response as buffer first for accurate size
    // Cap at 25MB to prevent browser memory issues
    const MAX_RESPONSE_SIZE = 25 * 1024 * 1024;
    const responseBuffer = await response.arrayBuffer();
    const isTruncated = responseBuffer.byteLength > MAX_RESPONSE_SIZE;
    const safeBuffer = isTruncated ? responseBuffer.slice(0, MAX_RESPONSE_SIZE) : responseBuffer;
    const responseText = new TextDecoder("utf-8").decode(safeBuffer);
    let responseBody: any = isTruncated ? responseText + "\n\n[... Response truncated at 25MB]" : responseText;

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

    // Extract Set-Cookie headers for cookie management
    const setCookies: { name: string; value: string; domain: string; path: string; expires?: string; secure?: boolean; httpOnly?: boolean }[] = [];
    const setCookieHeader = response.headers.get("set-cookie");
    if (setCookieHeader) {
      const cookieParts = setCookieHeader.split(/,(?=\s*\w+=)/);
      for (const part of cookieParts) {
        const parsed = parseSetCookie(part.trim(), targetUrl.hostname);
        if (parsed) setCookies.push(parsed);
      }
    }

    return NextResponse.json({
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: responseBody,
      setCookies,
      timing: {
        total: endTime - startTime,
      },
      size: responseBuffer.byteLength,
      redirected: response.redirected,
      finalUrl: response.url,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: 0,
        statusText: "Error",
        headers: {},
        body: `Request failed: ${err.message}`,
        setCookies: [],
      },
      { status: 500 }
    );
  }
}

function parseSetCookie(
  cookieStr: string,
  defaultDomain: string
): { name: string; value: string; domain: string; path: string; expires?: string; secure?: boolean; httpOnly?: boolean } | null {
  const parts = cookieStr.split(";").map((s) => s.trim());
  if (parts.length === 0) return null;

  const [nameValue, ...attributes] = parts;
  const eqIndex = nameValue.indexOf("=");
  if (eqIndex === -1) return null;

  const name = nameValue.substring(0, eqIndex).trim();
  const value = nameValue.substring(eqIndex + 1).trim();

  const result: any = { name, value, domain: defaultDomain, path: "/" };

  for (const attr of attributes) {
    const [attrName, ...attrValueParts] = attr.split("=");
    const attrValue = attrValueParts.join("=").trim();
    const lowerName = attrName.trim().toLowerCase();

    switch (lowerName) {
      case "domain":
        result.domain = attrValue;
        break;
      case "path":
        result.path = attrValue;
        break;
      case "expires":
        result.expires = attrValue;
        break;
      case "secure":
        result.secure = true;
        break;
      case "httponly":
        result.httpOnly = true;
        break;
    }
  }

  return result;
}
