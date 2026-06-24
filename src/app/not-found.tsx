import Link from "next/link";
import { Leaf } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="panel-light text-center" style={{ maxWidth: 420, padding: 32 }}>
        <span style={{ display: "inline-flex", width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 10, background: "var(--on-track-tint)", color: "var(--on-track)" }}>
          <Leaf size={24} />
        </span>
        <h1 className="display" style={{ fontSize: 26 }}>Not found</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          This page doesn&apos;t exist, or you don&apos;t have access to it.
        </p>
        <Link href="/dashboard" className="btn btn-brand" style={{ marginTop: 20 }}>Back to dashboard</Link>
      </div>
    </main>
  );
}
