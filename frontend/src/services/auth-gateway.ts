export interface Session {
  accessToken: string;
  email: string;
}

export type SessionListener = (session: Session | null) => void;

export interface AuthGateway {
  currentSession(): Promise<Session | null>;
  onSessionChange(listener: SessionListener): () => void;
  sendSignInCode(email: string): Promise<void>;
  verifySignInCode(email: string, code: string): Promise<void>;
  signInWithGoogle(): Promise<void>;
  hasRedirectSignInFailed(): boolean;
  dismissRedirectSignInFailure(): void;
  signOut(): Promise<void>;
}

export class AuthRequestError extends Error {
  override name = "AuthRequestError";
}
