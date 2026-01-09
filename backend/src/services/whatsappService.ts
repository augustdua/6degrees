import pino from 'pino';
import {
  BufferJSON,
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  initAuthCreds,
  makeCacheableSignalKeyStore,
  makeWASocket,
  type Chat,
  type ChatUpdate,
  type AuthenticationState,
  type Contact,
  type WASocket,
  type SignalDataTypeMap,
} from '@whiskeysockets/baileys';
import { supabase } from '../config/supabase';

type StoredAuthState = {
  creds: any;
  keys: Record<string, Record<string, any>>;
};

type WhatsAppUserMetadata = {
  auth?: any; // serialized StoredAuthState
  connected?: boolean;
  connected_at?: string;
  last_qr_at?: string;
  last_sync_at?: string;
  contacts?: Array<{
    jid: string;
    name?: string | null;
    notify?: string | null;
    verifiedName?: string | null;
    phone?: string | null;
  }>;
};

type UserMetadata = {
  whatsapp?: WhatsAppUserMetadata;
  [k: string]: any;
};

type Session = {
  userId: string;
  sock: WASocket;
  contacts: Map<string, Contact>;
  chats: Map<string, Chat>;
  qr: string | null;
  status: 'connecting' | 'qr' | 'connected' | 'disconnected' | 'error';
  lastError?: string;
  updatedAt: number;
};

const sessions = new Map<string, Session>();

function safeJsonCloneWithBufferReplacer<T>(obj: T): any {
  return JSON.parse(JSON.stringify(obj, BufferJSON.replacer));
}

function reviveWithBufferReviver<T>(obj: any): T {
  return JSON.parse(JSON.stringify(obj), BufferJSON.reviver);
}

async function getUserMetadata(userId: string): Promise<UserMetadata> {
  const { data, error } = await supabase
    .from('users')
    .select('metadata')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return (data?.metadata as UserMetadata) || {};
}

async function patchUserMetadata(userId: string, patch: Partial<UserMetadata>): Promise<void> {
  const existing = await getUserMetadata(userId);
  const next = { ...(existing || {}), ...(patch || {}) } as UserMetadata;
  const { error } = await supabase.from('users').update({ metadata: next }).eq('id', userId);
  if (error) throw error;
}

async function setWhatsAppMetadata(userId: string, patch: Partial<WhatsAppUserMetadata>): Promise<void> {
  const existing = await getUserMetadata(userId);
  const next: UserMetadata = {
    ...(existing || {}),
    whatsapp: {
      ...(existing?.whatsapp || {}),
      ...(patch || {}),
    },
  };
  const { error } = await supabase.from('users').update({ metadata: next }).eq('id', userId);
  if (error) throw error;
}

async function loadStoredAuth(userId: string): Promise<StoredAuthState> {
  const meta = await getUserMetadata(userId);
  const raw = meta?.whatsapp?.auth;
  if (!raw) {
    return { creds: initAuthCreds(), keys: {} };
  }
  return reviveWithBufferReviver<StoredAuthState>(raw);
}

async function saveStoredAuth(userId: string, state: StoredAuthState): Promise<void> {
  const serialized = safeJsonCloneWithBufferReplacer(state);
  await setWhatsAppMetadata(userId, { auth: serialized });
}

async function useDbAuthState(userId: string): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
}> {
  const stored = await loadStoredAuth(userId);

  const state: AuthenticationState = {
    creds: stored.creds,
    keys: {
      get: async (type: keyof SignalDataTypeMap, ids: string[]) => {
        const typeKey = String(type);
        const out: any = {};
        for (const id of ids) {
          const v = stored.keys?.[typeKey]?.[id];
          if (v) {
            out[id] = v;
          }
        }
        return out;
      },
      set: async (data: any) => {
        for (const [type, entries] of Object.entries<any>(data || {})) {
          if (!stored.keys[type]) stored.keys[type] = {};
          for (const [id, value] of Object.entries<any>(entries || {})) {
            if (value) stored.keys[type][id] = value;
            else delete stored.keys[type][id];
          }
        }
        // Persist eagerly; you can debounce later if needed.
        await saveStoredAuth(userId, stored);
      },
    },
  };

  const saveCreds = async () => {
    await saveStoredAuth(userId, stored);
  };

  return { state, saveCreds };
}

function endSessionWithoutLogout(session: Session) {
  try {
    // Baileys exposes `end` for terminating the socket without logging out.
    session.sock.end(undefined);
  } catch {
    // ignore
  }
  sessions.delete(session.userId);
}

export async function ensureWhatsAppSession(userId: string): Promise<Session> {
  const existing = sessions.get(userId);
  if (existing && existing.status !== 'disconnected') return existing;

  const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'silent' });
  const { state, saveCreds } = await useDbAuthState(userId);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    logger,
    version,
    // Desktop browser helps receive more history/contacts (per Baileys docs).
    browser: Browsers.macOS('Desktop'),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    printQRInTerminal: false,
    generateHighQualityLinkPreview: false,
    // We need contacts to be available for "sync contacts" UX.
    // Baileys emits them via `messaging-history.set` / `contacts.upsert`.
    syncFullHistory: true,
    markOnlineOnConnect: false,
  });

  const session: Session = {
    userId,
    sock,
    contacts: new Map<string, Contact>(),
    chats: new Map<string, Chat>(),
    qr: null,
    status: 'connecting',
    updatedAt: Date.now(),
  };
  sessions.set(userId, session);

  // Track contacts without relying on makeInMemoryStore (Baileys typings don't export it in v7).
  sock.ev.on('messaging-history.set', (h) => {
    try {
      const contacts = Array.isArray((h as any)?.contacts) ? ((h as any).contacts as Contact[]) : [];
      for (const c of contacts) {
        if (c && (c as any).id) session.contacts.set((c as any).id, c);
      }

      const chats = Array.isArray((h as any)?.chats) ? ((h as any).chats as Chat[]) : [];
      for (const ch of chats) {
        const id = (ch as any)?.id;
        if (typeof id === 'string' && id) session.chats.set(id, ch);
      }
    } catch {
      // ignore
    }
  });
  sock.ev.on('contacts.upsert', (contacts) => {
    for (const c of contacts || []) {
      if (c && (c as any).id) session.contacts.set((c as any).id, c);
    }
  });
  sock.ev.on('contacts.update', (updates) => {
    for (const u of updates || []) {
      const id = (u as any)?.id;
      if (!id) continue;
      const prev = session.contacts.get(id) || ({ id } as any);
      session.contacts.set(id, { ...(prev as any), ...(u as any) });
    }
  });

  // Track chats as a fallback source for "invite list" when contacts are not available.
  sock.ev.on('chats.upsert', (chats) => {
    for (const ch of chats || []) {
      const id = (ch as any)?.id;
      if (typeof id === 'string' && id) session.chats.set(id, ch);
    }
  });
  sock.ev.on('chats.update', (updates: ChatUpdate[]) => {
    for (const u of updates || []) {
      const id = (u as any)?.id;
      if (!id) continue;
      const prev = session.chats.get(id) || ({ id } as any);
      session.chats.set(id, { ...(prev as any), ...(u as any) });
    }
  });

  sock.ev.on('creds.update', async () => {
    try {
      await saveCreds();
    } catch (e: any) {
      session.lastError = `Failed to save WhatsApp creds: ${e?.message || e}`;
      session.status = 'error';
      session.updatedAt = Date.now();
    }
  });

  sock.ev.on('connection.update', async (u) => {
    const { connection, lastDisconnect, qr } = u as any;
    if (qr) {
      session.qr = qr;
      session.status = 'qr';
      session.updatedAt = Date.now();
      try {
        await setWhatsAppMetadata(userId, { last_qr_at: new Date().toISOString(), connected: false });
      } catch (e: any) {
        session.lastError = `Failed to persist WhatsApp QR meta: ${e?.message || e}`;
      }
    }
    if (connection === 'open') {
      session.status = 'connected';
      session.qr = null;
      session.updatedAt = Date.now();
      try {
        await setWhatsAppMetadata(userId, { connected: true, connected_at: new Date().toISOString() });
      } catch (e: any) {
        session.lastError = `Connected, but failed to persist WhatsApp meta: ${e?.message || e}`;
      }
    }
    if (connection === 'close') {
      session.status = 'disconnected';
      session.updatedAt = Date.now();
      const code = (lastDisconnect?.error as any)?.output?.statusCode;
      const reason = code ? String(code) : 'unknown';
      if (code === DisconnectReason.loggedOut) {
        // Clear stored auth on logout so we require QR next time.
        try {
          await setWhatsAppMetadata(userId, { connected: false, auth: null });
        } catch (e: any) {
          session.lastError = `Logged out; failed to clear WhatsApp meta: ${e?.message || e}`;
        }
      } else {
        try {
          await setWhatsAppMetadata(userId, { connected: false });
        } catch (e: any) {
          session.lastError = `Disconnected; failed to persist WhatsApp meta: ${e?.message || e}`;
        }
      }
      session.lastError = `Disconnected (${reason})`;
    }
  });

  return session;
}

export function getWhatsAppSession(userId: string): Session | null {
  return sessions.get(userId) || null;
}

export async function getWhatsAppStatus(userId: string) {
  const meta = await getUserMetadata(userId);
  const session = sessions.get(userId);
  const sessionConnected = session?.status === 'connected';
  const metaConnected = meta?.whatsapp?.connected === true;
  return {
    // Source of truth during runtime is the in-memory session; metadata is best-effort persistence.
    connected: sessionConnected || metaConnected,
    connectedAt: meta?.whatsapp?.connected_at || null,
    hasAuth: Boolean(meta?.whatsapp?.auth),
    sessionStatus: session?.status || 'none',
    hasQr: Boolean(session?.qr),
    lastError: session?.lastError || null,
  };
}

export async function getLatestQr(userId: string): Promise<string | null> {
  const session = await ensureWhatsAppSession(userId);
  return session.qr;
}

function jidFromPhone(phone: string): string {
  const digits = String(phone || '').replace(/[^\d]/g, '');
  if (!digits) throw new Error('Invalid phone number');
  return `${digits}@s.whatsapp.net`;
}

export async function syncWhatsAppContacts(userId: string) {
  let session = await ensureWhatsAppSession(userId);
  if (session.status !== 'connected') {
    throw new Error('WhatsApp not connected');
  }

  // Actively trigger an app-state resync to pull chats/contacts when initial history sync doesn't arrive.
  // This is the supported on-demand mechanism in Baileys v7 (see socket typings: resyncAppState).
  try {
    await (session.sock as any).resyncAppState(
      ['critical_block', 'critical_unblock_low', 'regular_high', 'regular_low', 'regular'],
      true
    );
  } catch (e: any) {
    // Not fatal — WhatsApp may deny/ignore, but we still attempt to use what we have.
    session.lastError = `resyncAppState failed: ${e?.message || e}`;
  }

  // If we haven't received contacts yet, restart the socket (without logout)
  // so init queries/history sync can populate contacts.
  if (session.contacts.size === 0) {
    endSessionWithoutLogout(session);
    session = await ensureWhatsAppSession(userId);
  }

  // Wait briefly for contacts to arrive.
  const startedAt = Date.now();
  while (session.contacts.size === 0 && session.chats.size === 0 && Date.now() - startedAt < 12_000) {
    await new Promise((r) => setTimeout(r, 300));
  }

  const selfJid = (session.sock as any)?.user?.id as string | undefined;

  const contacts = Array.from(session.contacts.values()) as any[];
  let simplified = contacts
    .filter((c) => c && typeof c.id === 'string' && c.id.endsWith('@s.whatsapp.net') && c.id !== selfJid && c.id !== '0@s.whatsapp.net')
    .slice(0, 2000)
    .map((c) => ({
      jid: c.id,
      name: c.name || null,
      notify: c.notify || null,
      verifiedName: c.verifiedName || null,
      phone: typeof c.id === 'string' ? c.id.split('@')[0] : null,
    }));

  let source: 'contacts' | 'chats' = 'contacts';
  if (simplified.length === 0) {
    // Fallback: derive "invite list" from chat list (people you've chatted with).
    // This is reliable even when WhatsApp doesn't share address book contacts.
    const chats = Array.from(session.chats.values()) as any[];
    simplified = chats
      .filter((ch) => {
        const id = ch?.id;
        return typeof id === 'string' && id.endsWith('@s.whatsapp.net') && id !== selfJid;
      })
      .slice(0, 2000)
      .map((ch) => {
        const jid = ch.id;
        const name =
          ch.name ||
          ch.subject ||
          ch.verifiedName ||
          ch.pushName ||
          null;
        return {
          jid,
          name,
          notify: null,
          verifiedName: null,
          phone: typeof jid === 'string' ? jid.split('@')[0] : null,
        };
      });
    source = 'chats';
  }

  // Enrich missing names using chat metadata (pushName/subject).
  // WhatsApp often does NOT provide address-book names to WhatsApp Web; this is best-effort.
  if (simplified.length > 0) {
    simplified = simplified.map((c) => {
      if (c?.name || c?.notify || c?.verifiedName) return c;
      const ch: any = session.chats.get(c.jid);
      const fallback =
        ch?.name ||
        ch?.subject ||
        ch?.verifiedName ||
        ch?.pushName ||
        null;
      return { ...c, name: fallback };
    });
  }

  await setWhatsAppMetadata(userId, {
    contacts: simplified,
    last_sync_at: new Date().toISOString(),
  });

  return { count: simplified.length, contacts: simplified, source };
}

export async function sendWhatsAppInvites(userId: string, phones: string[], message: string) {
  const session = await ensureWhatsAppSession(userId);
  if (session.status !== 'connected') {
    throw new Error('WhatsApp not connected');
  }
  const text = String(message || '').trim();
  if (!text) throw new Error('Message is required');
  const unique = Array.from(new Set((phones || []).map((p) => String(p || '').trim()).filter(Boolean))).slice(0, 50);
  const results: Array<{ phone: string; ok: boolean; error?: string }> = [];

  for (const phone of unique) {
    try {
      const jid = jidFromPhone(phone);
      await session.sock.sendMessage(jid, { text });
      results.push({ phone, ok: true });
    } catch (e: any) {
      results.push({ phone, ok: false, error: e?.message || String(e) });
    }
  }

  return { sent: results.filter((r) => r.ok).length, results };
}

export async function disconnectWhatsApp(userId: string) {
  const session = sessions.get(userId);
  try {
    if (session) {
      await session.sock.logout();
    }
  } finally {
    sessions.delete(userId);
    await setWhatsAppMetadata(userId, { connected: false, auth: null, contacts: [] });
  }
  return { ok: true };
}


