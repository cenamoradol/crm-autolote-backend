import { Client, LocalAuth, Message, Chat, MessageMedia } from 'whatsapp-web.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const SESSION_DIR = process.env.WHATSAPP_SESSION_DIR || './whatsapp-sessions';
const QR_TIMEOUT_MS = parseInt(process.env.WHATSAPP_QR_TIMEOUT_MS || '300000', 10);

function getPuppeteerArgs(): string[] {
  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',
    '--disable-background-networking',
    '--disable-background-timer-throttling',
    '--disable-default-apps',
    '--disable-extensions',
    '--disable-renderer-backgrounding',
    '--disable-sync',
    '--disable-translate',
    '--no-first-run',
    '--renderer-process-limit=2',
    '--memory-model=low',
    '--max_old_space_size=512',
    '--disable-features=site-per-process,TranslateUI',
    '--disable-blink-features=AutomationControlled',
    '--window-size=1280,720',
  ];

  // --single-process saves memory but is unstable; enable only via env var.
  if (process.env.PUPPETEER_SINGLE_PROCESS === 'true') {
    args.push('--single-process', '--no-zygote');
  }

  return args;
}

function getClientOptions(sessionDir: string) {
  return {
    authStrategy: new LocalAuth({
      dataPath: sessionDir,
    }),
    puppeteer: {
      headless: true,
      executablePath: findChromeExecutable(),
      args: getPuppeteerArgs(),
      dumpio: process.env.PUPPETEER_DUMPIO === 'true',
    },
    takeoverOnConflict: true,
    takeoverTimeoutMs: 0,
  };
}

function findChromeExecutable(): string | undefined {
  console.log('[ChromeFinder] Starting Chrome executable search...');
  console.log(`[ChromeFinder] Platform: ${os.platform()}`);
  console.log(`[ChromeFinder] PUPPETEER_CACHE_DIR: ${process.env.PUPPETEER_CACHE_DIR || '(not set)'}`);
  console.log(`[ChromeFinder] CHROME_PATH: ${process.env.CHROME_PATH || '(not set)'}`);

  // 1. Prefer the Chromium downloaded by puppeteer during npm install / build
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const puppeteer = require('puppeteer');
    const puppeteerPath = puppeteer.executablePath();
    console.log(`[ChromeFinder] Puppeteer executablePath: ${puppeteerPath}`);
    if (puppeteerPath && fs.existsSync(puppeteerPath)) {
      console.log(`[ChromeFinder] Using Puppeteer Chrome: ${puppeteerPath}`);
      return puppeteerPath;
    }
    console.log('[ChromeFinder] Puppeteer Chrome not found at expected path.');
  } catch (err) {
    console.log('[ChromeFinder] Puppeteer package not available:', (err as Error).message);
  }

  // 2. Explicit environment override
  if (process.env.CHROME_PATH) {
    console.log(`[ChromeFinder] Using CHROME_PATH: ${process.env.CHROME_PATH}`);
    if (fs.existsSync(process.env.CHROME_PATH)) {
      return process.env.CHROME_PATH;
    }
    console.log('[ChromeFinder] CHROME_PATH file does not exist.');
  }

  const platform = os.platform();
  let candidates: string[] = [];

  if (platform === 'win32') {
    candidates = [
      path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(process.env.PROGRAMFILES || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(process.env['PROGRAMFILES(X86)'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(process.env.LOCALAPPDATA || '', 'Chromium', 'Application', 'chrome.exe'),
      path.join(process.env.PROGRAMFILES || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(process.env['PROGRAMFILES(X86)'] || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    ];
  } else if (platform === 'darwin') {
    candidates = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ];
  } else {
    candidates = [
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/snap/bin/chromium',
    ];
  }

  console.log(`[ChromeFinder] Checking OS candidates: ${candidates.join(', ')}`);
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      console.log(`[ChromeFinder] Using OS Chrome: ${candidate}`);
      return candidate;
    }
  }

  console.error('[ChromeFinder] No Chrome executable found. WhatsApp Web will not work.');
  console.error('[ChromeFinder] On Render, ensure build command includes: npx puppeteer browsers install chrome');
  console.error('[ChromeFinder] On Render, set env var: PUPPETEER_CACHE_DIR=/opt/render/project/src/.cache/puppeteer');
  return undefined;
}

export function parseMessage(text: string): { brand?: string; model?: string; year?: string } {
  const n = text.trim().toLowerCase();
  if (n.includes('/')) {
    const p = n.split('/').map(s => s.trim());
    return { brand: p[0] || undefined, model: p[1] || undefined, year: p[2] || undefined };
  }
  const match = n.match(/(\w+)\s*[\/\-]?\s*(\w+)?\s*[\/\-]?\s*(\d{4})?/i);
  if (match) {
    const parts = [match[1], match[2], match[3]].filter(Boolean);
    let brand: string | undefined, model: string | undefined, year: string | undefined;
    for (const p of parts) {
      if (/\d{4}/.test(p)) year = p;
      else if (!brand) brand = p;
      else if (!model) model = p;
    }
    return { brand, model, year };
  }
  return { brand: n.split(/\s+/)[0], year: n.match(/\d{4}/)?.[0] };
}

export function formatWhatsAppLink(phone: string, message?: string): string {
  const clean = phone.replace(/\D/g, '');
  return message ? `https://wa.me/${clean}?text=${encodeURIComponent(message)}` : `https://wa.me/${clean}`;
}

export function formatPhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

export interface WhatsAppQR { qr: string; expiresAt: number; }
export interface ConnectionCallbacks { 
  onConnected?: (phone: string) => void; 
  onDisconnected?: () => void; 
  onQRUpdated?: (qr: string) => void;
  onError?: (error: string) => void;
  onMessage?: (from: string, text: string, timestamp: Date, rawFrom?: string) => void;
}

export class WWebJSManager {
  private clients: Map<string, Client> = new Map();
  private callbacks: Map<string, ConnectionCallbacks> = new Map();
  private qrCodes: Map<string, string> = new Map();
  private messageHandlers: Map<string, (from: string, text: string, timestamp: Date, rawFrom?: string) => void> = new Map();

  async createSession(storeId: string, callbacks?: ConnectionCallbacks): Promise<{ qr?: WhatsAppQR; error?: string }> {
    const maxAttempts = parseInt(process.env.WHATSAPP_CREATE_SESSION_RETRIES || '2', 10);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`[WWebJS] Creating session for ${storeId} (attempt ${attempt}/${maxAttempts})`);
      const result = await this.tryCreateSession(storeId, callbacks);

      if (!result.error) {
        return result;
      }

      console.log(`[WWebJS] Session creation attempt ${attempt} failed for ${storeId}: ${result.error}`);

      if (attempt < maxAttempts) {
        const delayMs = 2000 * attempt;
        console.log(`[WWebJS] Retrying session creation for ${storeId} in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    return { error: `Failed to create session after ${maxAttempts} attempts` };
  }

  private async tryCreateSession(storeId: string, callbacks?: ConnectionCallbacks): Promise<{ qr?: WhatsAppQR; error?: string }> {
    const sessionDir = path.join(SESSION_DIR, storeId);

    if (this.clients.has(storeId)) {
      await this.forceDisconnect(storeId);
    }

    if (!fs.existsSync(SESSION_DIR)) {
      fs.mkdirSync(SESSION_DIR, { recursive: true });
    }

    if (callbacks) {
      this.callbacks.set(storeId, callbacks);
    }

    const client = new Client(getClientOptions(sessionDir));

    this.clients.set(storeId, client);

    client.on('message', async (msg: Message) => {
      console.log(`[WWebJS] Message received: from=${msg.from}, body=${msg.body?.substring(0, 50)}`);

      if (msg.fromMe) {
        console.log(`[WWebJS] Ignoring own message`);
        return;
      }

      if (msg.from.includes('status@broadcast')) {
        console.log(`[WWebJS] Ignoring status broadcast`);
        return;
      }

      const text = msg.body;
      if (!text || !text.trim()) {
        console.log(`[WWebJS] Ignoring empty message`);
        return;
      }

      const from = msg.from;
      let fromNumber = from.replace('@c.us', '').replace('@g.us', '').replace('@lid', '').replace(/\D/g, '');

      if (!fromNumber || fromNumber.length < 8) {
        console.log(`[WWebJS] Ignoring invalid contact: ${from}`);
        return;
      }

      const timestamp = msg.timestamp ? new Date(msg.timestamp * 1000) : new Date();

      console.log(`[WWebJS] Processing message from ${fromNumber} (raw: ${from}): ${text?.substring(0, 50)}`);

      const handler = this.messageHandlers.get(storeId);
      if (handler) {
        handler(fromNumber, text, timestamp, from);
      }

      const cb = this.callbacks.get(storeId);
      if (cb?.onMessage) {
        cb.onMessage(fromNumber, text, timestamp, from);
      }
    });

    return new Promise((resolve) => {
      let resolved = false;
      const timeoutMs = QR_TIMEOUT_MS;

      const cleanupTimeout = () => {
        clearTimeout(timeoutHandle);
      };

      const safeResolve = (value: { qr?: WhatsAppQR; error?: string }) => {
        if (!resolved) {
          resolved = true;
          cleanupTimeout();
          resolve(value);
        }
      };

      client.on('qr', (qr) => {
        console.log(`[WWebJS] QR received for ${storeId}`);
        this.qrCodes.set(storeId, qr);
        callbacks?.onQRUpdated?.(qr);
        safeResolve({ qr: { qr, expiresAt: Date.now() + 120000 } });
      });

      client.on('ready', () => {
        console.log(`[WWebJS] Ready for ${storeId}`);
        const phone = client.info?.wid?.user || '';
        callbacks?.onConnected?.(phone);
      });

      client.on('authenticated', () => {
        console.log(`[WWebJS] Authenticated for ${storeId}`);
      });

      client.on('auth_failure', (error) => {
        console.error(`[WWebJS] Auth failure for ${storeId}:`, error);
        callbacks?.onError?.(error as string);
        this.forceDisconnect(storeId);
        safeResolve({ error: `Auth failure: ${error}` });
      });

      client.on('disconnected', (reason) => {
        console.log(`[WWebJS] Disconnected for ${storeId}:`, reason);
        this.clients.delete(storeId);
        this.qrCodes.delete(storeId);
        callbacks?.onDisconnected?.();
        safeResolve({ error: `Disconnected: ${reason}` });
      });

      client.on('change_state', (state) => {
        console.log(`[WWebJS] State change for ${storeId}:`, state);
      });

      const timeoutHandle = setTimeout(() => {
        if (!resolved && !this.qrCodes.has(storeId) && !this.clients.get(storeId)?.info) {
          console.log(`[WWebJS] Timeout waiting for QR for ${storeId} after ${timeoutMs}ms`);
          this.forceDisconnect(storeId);
          safeResolve({ error: 'Timeout waiting for QR' });
        }
      }, timeoutMs);

      client.initialize().catch((error) => {
        console.error(`[WWebJS] Initialize error for ${storeId}:`, error);
        this.forceDisconnect(storeId);
        safeResolve({ error: (error as Error).message });
      });
    });
  }

  async restoreSession(storeId: string, callbacks?: ConnectionCallbacks): Promise<void> {
    if (this.clients.has(storeId)) {
      console.log(`[WWebJS] Session already exists for ${storeId}`);
      return;
    }

    if (!fs.existsSync(SESSION_DIR)) {
      fs.mkdirSync(SESSION_DIR, { recursive: true });
    }

    const sessionDir = path.join(SESSION_DIR, storeId);
    if (!fs.existsSync(sessionDir)) {
      console.log(`[WWebJS] No session files found for ${storeId}`);
      return;
    }

    console.log(`[WWebJS] Restoring session for ${storeId}`);

    if (callbacks) {
      this.callbacks.set(storeId, callbacks);
    }

    const client = new Client(getClientOptions(sessionDir));

    this.clients.set(storeId, client);

    client.on('message', async (msg: Message) => {
      console.log(`[WWebJS] Message received: from=${msg.from}, body=${msg.body?.substring(0, 50)}`);

      if (msg.fromMe) {
        console.log(`[WWebJS] Ignoring own message`);
        return;
      }

      if (msg.from.includes('status@broadcast')) {
        console.log(`[WWebJS] Ignoring status broadcast`);
        return;
      }

      const text = msg.body;
      if (!text || !text.trim()) {
        console.log(`[WWebJS] Ignoring empty message`);
        return;
      }

      const from = msg.from;
      const fromNumber = from.replace('@c.us', '').replace('@g.us', '').replace('@lid', '').replace(/\D/g, '');

      if (!fromNumber || fromNumber.length < 8) {
        console.log(`[WWebJS] Ignoring invalid contact: ${msg.from}`);
        return;
      }

      const timestamp = msg.timestamp ? new Date(msg.timestamp * 1000) : new Date();

      console.log(`[WWebJS] Processing message from ${fromNumber} (raw: ${from}): ${text?.substring(0, 50)}`);

      const handler = this.messageHandlers.get(storeId);
      if (handler) {
        handler(fromNumber, text, timestamp, from);
      }

      const cb = this.callbacks.get(storeId);
      if (cb?.onMessage) {
        cb.onMessage(fromNumber, text, timestamp, from);
      }
    });

    client.on('ready', () => {
      console.log(`[WWebJS] Restored session ready for ${storeId}`);
      const phone = client.info?.wid?.user || '';
      callbacks?.onConnected?.(phone);
    });

    client.on('authenticated', () => {
      console.log(`[WWebJS] Restored session authenticated for ${storeId}`);
    });

    client.on('auth_failure', (error) => {
      console.error(`[WWebJS] Auth failure for ${storeId}:`, error);
      callbacks?.onError?.(error as string);
    });

    client.on('disconnected', (reason) => {
      console.log(`[WWebJS] Restored session disconnected for ${storeId}:`, reason);
      this.clients.delete(storeId);
      this.qrCodes.delete(storeId);
      callbacks?.onDisconnected?.();
    });

    client.on('change_state', (state) => {
      console.log(`[WWebJS] State change for ${storeId}:`, state);
    });

    client.initialize().catch((error) => {
      console.error(`[WWebJS] Initialize error for ${storeId}:`, error);
    });
  }

  setMessageHandler(storeId: string, handler: (from: string, text: string, timestamp: Date, rawFrom?: string) => void) {
    this.messageHandlers.set(storeId, handler);
  }

  async forceDisconnect(storeId: string): Promise<void> {
    const client = this.clients.get(storeId);
    if (client) {
      try {
        await client.destroy();
      } catch (e) {
        console.log(`[WWebJS] Destroy error for ${storeId}:`, e);
      }
      this.clients.delete(storeId);
      this.qrCodes.delete(storeId);
      this.messageHandlers.delete(storeId);
    }
  }

  async disconnect(storeId: string): Promise<void> {
    await this.forceDisconnect(storeId);
    this.callbacks.delete(storeId);
    const sessionPath = path.join(SESSION_DIR, storeId);
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
      console.log(`[WWebJS] Session deleted for ${storeId}`);
    }
  }

  isConnected(storeId: string): boolean {
    const client = this.clients.get(storeId);
    return client?.info ? true : false;
  }

  getQR(storeId: string): string | null {
    return this.qrCodes.get(storeId) || null;
  }

  async sendMessage(storeId: string, to: string, text: string): Promise<boolean> {
    const client = this.clients.get(storeId);
    if (!client || !client.info) {
      console.log(`[WWebJS] No client or not ready for ${storeId}`);
      return false;
    }
    try {
      let chatId = to.replace('@lid', '');
      if (!chatId.includes('@')) {
        chatId = `${chatId}@c.us`;
      }
      console.log(`[WWebJS] Sending to ${chatId} (original: ${to})`);
      await client.sendMessage(chatId, text);
      console.log(`[WWebJS] Message sent to ${to}`);
      return true;
    } catch (error) {
      console.error(`[WWebJS] Send error:`, error);
      return false;
    }
  }

  async sendReplyToChat(storeId: string, chatId: string, text: string): Promise<boolean> {
    const client = this.clients.get(storeId);
    if (!client || !client.info) {
      console.log(`[WWebJS] No client or not ready for ${storeId}`);
      return false;
    }
    try {
      const chat = await client.getChatById(chatId);
      if (!chat) {
        console.error(`[WWebJS] Chat not found: ${chatId}`);
        return false;
      }
      console.log(`[WWebJS] Sending reply to chat ${chatId} (name: ${chat.name})`);
      await chat.sendMessage(text);
      console.log(`[WWebJS] Reply sent to ${chatId}`);
      return true;
    } catch (error) {
      console.error(`[WWebJS] Send reply error:`, error);
      return false;
    }
  }

  async sendImageToChat(storeId: string, chatId: string, imageUrl: string, caption: string): Promise<boolean> {
    const client = this.clients.get(storeId);
    if (!client || !client.info) {
      console.log(`[WWebJS] No client or not ready for ${storeId}`);
      return false;
    }
    try {
      const chat = await client.getChatById(chatId);
      if (!chat) {
        console.error(`[WWebJS] Chat not found: ${chatId}`);
        return false;
      }
      console.log(`[WWebJS] Sending image to chat ${chatId}`);
      const media = await MessageMedia.fromUrl(imageUrl, { unsafeMime: true });
      await chat.sendMessage(media, { caption });
      console.log(`[WWebJS] Image sent to ${chatId}`);
      return true;
    } catch (error) {
      console.error(`[WWebJS] Send image error:`, error);
      return false;
    }
  }
}

export const wwebjsManager = new WWebJSManager();
