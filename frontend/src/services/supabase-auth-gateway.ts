import {
  createClient,
  type SupabaseClient,
  type Session as SupabaseSession,
} from "@supabase/supabase-js";
import {
  type AuthGateway,
  AuthRequestError,
  type Session,
  type SessionListener,
} from "./auth-gateway";

export class SupabaseAuthGateway implements AuthGateway {
  private readonly client: SupabaseClient;

  constructor(url: string, publishableKey: string) {
    this.client = createClient(url, publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
    });
  }

  async currentSession(): Promise<Session | null> {
    const { data, error } = await this.client.auth.getSession();
    if (error) {
      throw new AuthRequestError(error.message);
    }
    return toSession(data.session);
  }

  onSessionChange(listener: SessionListener): () => void {
    const { data } = this.client.auth.onAuthStateChange((_event, session) => {
      listener(toSession(session));
    });
    return () => data.subscription.unsubscribe();
  }

  async sendSignInCode(email: string): Promise<void> {
    const { error } = await this.client.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) {
      throw new AuthRequestError(error.message);
    }
  }

  async verifySignInCode(email: string, code: string): Promise<void> {
    const { error } = await this.client.auth.verifyOtp({ email, token: code, type: "email" });
    if (error) {
      throw new AuthRequestError(error.message);
    }
  }

  async signInWithGoogle(): Promise<void> {
    const { error } = await this.client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      throw new AuthRequestError(error.message);
    }
  }

  hasRedirectSignInFailed(): boolean {
    return isFailedSignInRedirect(window.location.search, window.location.hash);
  }

  dismissRedirectSignInFailure(): void {
    if (this.hasRedirectSignInFailed()) {
      window.history.replaceState(window.history.state, "", window.location.pathname);
    }
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error) {
      throw new AuthRequestError(error.message);
    }
  }
}

export function isFailedSignInRedirect(search: string, hash: string): boolean {
  return (
    new URLSearchParams(search).has("error") ||
    new URLSearchParams(hash.replace(/^#/, "")).has("error")
  );
}

function toSession(session: SupabaseSession | null): Session | null {
  if (!session) {
    return null;
  }
  return { accessToken: session.access_token, email: session.user.email ?? "" };
}
