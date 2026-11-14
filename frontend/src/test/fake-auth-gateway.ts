import {
  type AuthGateway,
  AuthRequestError,
  type Session,
  type SessionListener,
} from "../services/auth-gateway";

export const VALID_CODE = "123456";

export class FakeAuthGateway implements AuthGateway {
  readonly requestedCodes: string[] = [];
  private session: Session | null;
  private readonly listeners = new Set<SessionListener>();

  constructor(session: Session | null = null) {
    this.session = session;
  }

  async currentSession(): Promise<Session | null> {
    return this.session;
  }

  onSessionChange(listener: SessionListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async sendSignInCode(email: string): Promise<void> {
    this.requestedCodes.push(email);
  }

  async verifySignInCode(email: string, code: string): Promise<void> {
    if (code !== VALID_CODE) {
      throw new AuthRequestError("invalid code");
    }
    this.change({ accessToken: "test-token", email });
  }

  async signOut(): Promise<void> {
    this.change(null);
  }

  private change(session: Session | null) {
    this.session = session;
    for (const listener of this.listeners) {
      listener(session);
    }
  }
}

export const SIGNED_IN: Session = { accessToken: "test-token", email: "persona@correo.test" };
