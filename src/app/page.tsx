import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Navbar */}
      <nav className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-bold text-[var(--accent)]">Hantara</h1>
          <Link
            href="/app"
            className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
          >
            Open App
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-6 text-5xl font-bold leading-tight text-[var(--text-primary)]">
            API Testing Made
            <span className="text-[var(--accent)]"> Fast</span> &
            <span className="text-[var(--accent)]"> Collaborative</span>
          </h2>
          <p className="mb-10 text-lg text-[var(--text-secondary)]">
            Open-source API client with collections, folders, environment variables, and real-time collaboration. Like Postman, but free and blazing fast.
          </p>
          <Link
            href="/app"
            className="inline-block rounded-lg bg-[var(--accent)] px-8 py-3 text-base font-bold text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            Start Using — It&apos;s Free
          </Link>
        </div>

        {/* Preview */}
        <div className="mx-auto mt-16 max-w-4xl overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] shadow-2xl">
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <div className="h-3 w-3 rounded-full bg-yellow-500" />
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <span className="ml-3 text-xs text-[var(--text-secondary)]">Hantara — API Client</span>
          </div>
          <div className="flex h-64 items-center justify-center">
            <div className="flex items-center gap-3">
              <span className="rounded bg-green-900/30 px-2 py-1 text-xs font-bold text-green-400">GET</span>
              <span className="text-sm text-[var(--text-secondary)]">https://api.example.com/users</span>
              <span className="rounded bg-[var(--accent)] px-3 py-1 text-xs font-bold text-white">Send</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-[var(--border)] bg-[var(--bg-secondary)] py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h3 className="mb-12 text-center text-3xl font-bold text-[var(--text-primary)]">
            Everything you need to test APIs
          </h3>
          <div className="grid gap-8 md:grid-cols-3">
            <FeatureCard icon="📁" title="Collections & Folders" description="Organize requests into collections with nested folders. Manage your API workspace effortlessly." />
            <FeatureCard icon="⚡" title="Blazing Fast" description="Built with Next.js and Edge Functions. Requests are proxied through edge network for zero CORS issues." />
            <FeatureCard icon="🔐" title="Environment Variables" description="Define variables per environment and use {{variable}} syntax anywhere — URLs, headers, and body." />
            <FeatureCard icon="🎨" title="Beautiful Dark UI" description="Designed for developers who spend hours testing APIs. Easy on the eyes with a modern dark interface." />
            <FeatureCard icon="📜" title="Request History" description="Every request is logged. Replay any previous request with one click." />
            <FeatureCard icon="🆓" title="Free & Open Source" description="No limits, no paywalls. Deploy your own instance or use our hosted version." />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <span className="text-sm text-[var(--text-secondary)]">
            © 2025 Hantara. Open source under MIT License.
          </span>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] p-6">
      <div className="mb-3 text-3xl">{icon}</div>
      <h4 className="mb-2 text-lg font-bold text-[var(--text-primary)]">{title}</h4>
      <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{description}</p>
    </div>
  );
}
