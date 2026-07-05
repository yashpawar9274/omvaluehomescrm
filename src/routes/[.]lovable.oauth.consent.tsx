import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

// Supabase's OAuth 2.1 authorization server redirects here to get the user
// to approve or deny an MCP client (e.g. ChatGPT, Claude) that asked to
// connect to this app.
//
// The Supabase JS oauth namespace is beta — cast a thin wrapper so this
// stays type-safe even if the SDK types haven't landed yet.
type OAuthApi = {
  getAuthorizationDetails(id: string): Promise<{
    data: {
      client?: { name?: string; client_uri?: string };
      redirect_url?: string;
      redirect_to?: string;
      scopes?: string[];
    } | null;
    error: { message: string } | null;
  }>;
  approveAuthorization(id: string): Promise<{
    data: { redirect_url?: string; redirect_to?: string } | null;
    error: { message: string } | null;
  }>;
  denyAuthorization(id: string): Promise<{
    data: { redirect_url?: string; redirect_to?: string } | null;
    error: { message: string } | null;
  }>;
};
function oauthApi(): OAuthApi {
  return (supabase.auth as unknown as { oauth: OAuthApi }).oauth;
}

function isSafeRelativePath(p: string) {
  return p.startsWith("/") && !p.startsWith("//");
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) {
      if (isSafeRelativePath(immediate)) throw redirect({ to: immediate });
      throw redirect({ href: immediate });
    }
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-md p-8 text-sm">
      <h1 className="text-lg font-semibold">Could not load this request</h1>
      <p className="mt-2 text-muted-foreground">{String((error as Error)?.message ?? error)}</p>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "an app";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const api = oauthApi();
    const { data, error } = approve
      ? await api.approveAuthorization(authorization_id)
      : await api.denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center p-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">
          Connect {clientName} to Om Value Homes CRM?
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {clientName} will be able to read and manage your leads, site visits, and follow-ups as you.
          You can revoke access anytime from your account.
        </p>
        {error && (
          <p role="alert" className="mt-3 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
            {error}
          </p>
        )}
        <div className="mt-6 flex gap-2">
          <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>
            Approve
          </Button>
          <Button variant="outline" className="flex-1" disabled={busy} onClick={() => decide(false)}>
            Deny
          </Button>
        </div>
      </div>
    </main>
  );
}