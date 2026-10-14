import { createFileRoute, Link } from "@tanstack/react-router";
import { Mark } from "@/components/dalala/chrome";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";
import { dict } from "@/lib/i18n";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — DALALA" }] }),
  component: Login,
});

function Login() {
  const copy = dict("en");
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-5 py-10">
      <Link to="/" className="flex items-center gap-3">
        <Mark />
        <span className="font-display text-2xl">{copy.brand.name}</span>
      </Link>
      <div className="space-y-2">
        <h1 className="font-display text-4xl">{copy.login.title}</h1>
        <p className="text-muted">{copy.login.lede}</p>
      </div>
      {authEnabled ? (
        <div className="flex flex-col gap-2">
          {GROK_PROVIDERS.map((provider) => (
            <button
              key={provider.providerId}
              type="button"
              className="min-h-12 rounded-full bg-ink px-5 text-sm font-semibold text-ivory"
              onClick={() => signIn(provider.providerId, { callbackURL: "/en" })}
            >
              {copy.login.continue} {provider.label}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">{copy.common.error}</p>
      )}
    </main>
  );
}
