import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="glass glass-card text-center" style={{ maxWidth: 420, padding: 32 }}>
        <div aria-hidden style={{ fontSize: 36, marginBottom: 8 }}>🍃</div>
        <h1 style={{ fontSize: 24 }}>Not found</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          This page doesn&apos;t exist, or you don&apos;t have access to it.
        </p>
        <Link href="/dashboard" className="btn btn-brand" style={{ marginTop: 20 }}>Back to dashboard</Link>
      </div>
    </main>
  );
}
