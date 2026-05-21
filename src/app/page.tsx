import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Navbar */}
      <nav className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <h1 className="text-lg font-bold text-[var(--accent)] sm:text-xl">Hantara</h1>
          <Link
            href="/app"
            className="shrink-0 rounded bg-[var(--accent)] px-3 py-2 text-xs font-medium text-white hover:bg-[var(--accent-hover)] sm:px-4 sm:text-sm"
          >
            Open App
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="mx-auto w-full max-w-6xl px-4 py-14 text-center sm:px-6 sm:py-18 lg:py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-4 text-3xl font-bold leading-tight text-[var(--text-primary)] sm:mb-6 sm:text-4xl lg:text-5xl">
            API Testing Made
            <span className="text-[var(--accent)]"> Fast</span> &
            <span className="text-[var(--accent)]"> Collaborative</span>
          </h2>
          <p className="mb-8 text-base text-[var(--text-secondary)] sm:mb-10 sm:text-lg">
            Open-source API client with collections, folders, environment variables, and real-time collaboration. Like Postman, but free and blazing fast.
          </p>
          <Link
            href="/app"
            className="inline-block rounded-lg bg-[var(--accent)] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[var(--accent-hover)] sm:px-8 sm:text-base"
          >
            Start Using — It&apos;s Free
          </Link>
        </div>

        {/* Preview */}
        <div className="mx-auto mt-10 max-w-4xl overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] shadow-2xl sm:mt-14 lg:mt-16">
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2 sm:px-4 sm:py-3">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500 sm:h-3 sm:w-3" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-500 sm:h-3 sm:w-3" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-500 sm:h-3 sm:w-3" />
            <span className="ml-2 truncate text-[10px] text-[var(--text-secondary)] sm:ml-3 sm:text-xs">Hantara — API Client</span>
          </div>
          <div className="flex min-h-56 items-center justify-center px-3 py-5 sm:h-64 sm:px-6">
            <div className="flex w-full max-w-3xl flex-wrap items-center justify-center gap-2 sm:gap-3">
              <span className="rounded bg-green-900/30 px-2 py-1 text-[10px] font-bold text-green-400 sm:text-xs">GET</span>
              <span className="max-w-full break-all text-xs text-[var(--text-secondary)] sm:text-sm">https://api.example.com/users</span>
              <span className="rounded bg-[var(--accent)] px-3 py-1 text-[10px] font-bold text-white sm:text-xs">Send</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-[var(--border)] bg-[var(--bg-secondary)] py-14 sm:py-16 lg:py-20">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <h3 className="mb-8 text-center text-2xl font-bold text-[var(--text-primary)] sm:mb-10 sm:text-3xl lg:mb-12">
            Everything you need to test APIs
          </h3>
          <div className="grid gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
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
      <footer className="border-t border-[var(--border)] py-6 sm:py-8">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <span className="text-xs text-[var(--text-secondary)] sm:text-sm">
            © 2025 Hantara. Open source under MIT License.
          </span>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] p-5 sm:p-6">
      <div className="mb-3 text-2xl sm:text-3xl">{icon}</div>
      <h4 className="mb-2 text-base font-bold text-[var(--text-primary)] sm:text-lg">{title}</h4>
      <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{description}</p>
    </div>
  );
}
