import { NextRequest, NextResponse } from "next/server";

/**
 * OAuth 2.0 Callback Handler
 * Receives the authorization code from the OAuth provider and passes it back to the opener window.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const html = `<!DOCTYPE html>
<html>
<head><title>OAuth Callback</title></head>
<body>
<script>
  // Pass the auth code back to the opener
  if (window.opener) {
    // The opener will read the URL params via polling
    // Just display a message while it processes
    document.body.innerHTML = '${error ? `<p>Error: ${error}</p>` : "<p>Authorization successful. This window will close automatically.</p>"}';
  } else {
    document.body.innerHTML = '<p>OAuth callback received. You can close this window.</p>';
  }
</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}
