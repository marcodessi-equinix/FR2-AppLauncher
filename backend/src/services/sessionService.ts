export interface AdminSession {
  sessionId: string;
  lastHeartbeat: number;
}

export const HEARTBEAT_TIMEOUT_MS = 30 * 1000;

class SessionService {
  private activeSession: AdminSession | null = null;

  private isExpired(session: AdminSession | null): boolean {
    return !session || Date.now() - session.lastHeartbeat > HEARTBEAT_TIMEOUT_MS;
  }

  public getActiveSession(): AdminSession | null {
    if (this.isExpired(this.activeSession)) {
      this.activeSession = null;
    }
    return this.activeSession;
  }

  public claimSession(sessionId: string, force = false): boolean {
    const currentSession = this.getActiveSession();

    if (force || !currentSession || currentSession.sessionId === sessionId) {
      this.activeSession = { sessionId, lastHeartbeat: Date.now() };
      return true;
    }

    return false;
  }

  public setActiveSession(sessionId: string) {
    this.activeSession = { sessionId, lastHeartbeat: Date.now() };
  }

  public clearSession(sessionId?: string) {
    if (!sessionId || this.activeSession?.sessionId === sessionId) {
      this.activeSession = null;
    }
  }

  public heartbeat(sessionId: string): boolean {
    return this.claimSession(sessionId);
  }

  public isLockedFor(sessionId: string): boolean {
    const currentSession = this.getActiveSession();
    if (!currentSession) return false;
    if (currentSession.sessionId === sessionId) return false;
    return true;
  }
}

export const adminSessionService = new SessionService();
