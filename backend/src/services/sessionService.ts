import db from '../db/index';

export interface AdminSession {
  sessionId: string;
  lastHeartbeat: number;
}

export const HEARTBEAT_TIMEOUT_MS = 30 * 1000;
const SESSION_CONFIG_KEY = 'admin_session_lock';

class SessionService {
  private readSession(): AdminSession | null {
    try {
      const row = db.prepare('SELECT value FROM config WHERE key = ?').get(SESSION_CONFIG_KEY) as { value: string } | undefined;
      if (!row?.value) {
        return null;
      }

      const parsed = JSON.parse(row.value) as Partial<AdminSession>;
      if (typeof parsed.sessionId !== 'string' || typeof parsed.lastHeartbeat !== 'number') {
        this.clearSession();
        return null;
      }

      return { sessionId: parsed.sessionId, lastHeartbeat: parsed.lastHeartbeat };
    } catch {
      return null;
    }
  }

  private writeSession(session: AdminSession) {
    db.prepare(
      'INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    ).run(SESSION_CONFIG_KEY, JSON.stringify(session));
  }

  private isExpired(session: AdminSession | null): boolean {
    return !session || Date.now() - session.lastHeartbeat > HEARTBEAT_TIMEOUT_MS;
  }

  public getActiveSession(): AdminSession | null {
    const currentSession = this.readSession();
    if (this.isExpired(currentSession)) {
      this.clearSession();
      return null;
    }

    return currentSession;
  }

  public claimSession(sessionId: string, force = false): boolean {
    const currentSession = this.getActiveSession();

    if (force || !currentSession || currentSession.sessionId === sessionId) {
      this.writeSession({ sessionId, lastHeartbeat: Date.now() });
      return true;
    }

    return false;
  }

  public setActiveSession(sessionId: string) {
    this.writeSession({ sessionId, lastHeartbeat: Date.now() });
  }

  public clearSession(sessionId?: string) {
    const currentSession = this.readSession();
    if (!sessionId || currentSession?.sessionId === sessionId) {
      db.prepare('DELETE FROM config WHERE key = ?').run(SESSION_CONFIG_KEY);
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
