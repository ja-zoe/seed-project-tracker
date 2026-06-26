"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { ArrowLeft, Loader2 } from "lucide-react";

/** A small spinner that inherits the current text color. */
export function Spinner({ size = 16 }: { size?: number }) {
  return <Loader2 size={size} className="spin" aria-hidden />;
}

/**
 * A link styled as a button that shows immediate loading feedback (spinner +
 * disabled look) while the navigation it triggers is in flight. Use for any
 * button whose job is to navigate to another page.
 */
export function LoadingLink({
  href,
  children,
  variant = "secondary",
  className = "",
  style,
  prefetch,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "accent" | "secondary" | "ghost" | "brand";
  className?: string;
  style?: React.CSSProperties;
  prefetch?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className={`btn btn-${variant} ${className}`}
      style={style}
      disabled={pending}
      aria-disabled={pending}
      aria-busy={pending}
      onClick={() => {
        if (prefetch) router.prefetch(href);
        startTransition(() => router.push(href));
      }}
    >
      {pending && <Spinner />}
      {children}
    </button>
  );
}

/**
 * Back arrow that navigates to a parent route, with the same in-flight spinner.
 * Defaults to `router.back()` when no explicit `href` is given.
 */
export function BackLink({ href, label = "Back" }: { href?: string; label?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      style={{ paddingLeft: 8, marginBottom: 12 }}
      disabled={pending}
      aria-busy={pending}
      onClick={() => startTransition(() => (href ? router.push(href) : router.back()))}
    >
      {pending ? <Spinner /> : <ArrowLeft />} {label}
    </button>
  );
}

/**
 * An icon-only submit button for inline forms (toggle, delete, etc.) that swaps
 * its icon for a spinner while the server action is pending. Pair with a `<form
 * action={...}>` — it reads `useFormStatus`, so it must be a descendant.
 */
export function IconSubmit({
  children,
  label,
  className = "btn btn-ghost btn-icon btn-sm",
  style,
}: {
  children: React.ReactNode;
  label: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} style={style} aria-label={label} disabled={pending} aria-busy={pending}>
      {pending ? <Spinner /> : children}
    </button>
  );
}

/**
 * A text submit button that shows a leading spinner (keeping its label) while
 * pending — for primary actions on forms that submit in place.
 */
export function SpinnerButton({
  children,
  variant = "brand",
  className = "",
  style,
}: {
  children: React.ReactNode;
  variant?: "brand" | "secondary" | "danger" | "success" | "ghost" | "primary";
  className?: string;
  style?: React.CSSProperties;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={`btn btn-${variant} ${className}`} style={style} disabled={pending} aria-busy={pending}>
      {pending && <Spinner />}
      {children}
    </button>
  );
}
