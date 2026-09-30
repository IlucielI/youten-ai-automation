import * as http from 'http';
import { URL } from 'url';
import Logger from '../../utils/logger';

export interface PlaywrightProxyConfig {
  server: string;
  bypass?: string;
  username?: string;
  password?: string;
}

export interface ProxyTestResult {
  ok: boolean;
  error?: string | null;
  latencyMs?: number;
}

export interface ProxyAdapterConfig {
  proxyUrl?: string;
  proxyList?: string[];
  strategy?: 'round-robin' | 'random';
  timeoutMs?: number;
}

export interface ProxyAdapter {
  /**
   * Parses raw proxy strings into standard Playwright proxy configurations.
   * Supports: http://user:pass@host:port, socks5://host:port, and host:port:user:pass
   */
  parseProxy(raw: string): PlaywrightProxyConfig | null;

  /**
   * Masks sensitive credentials in proxy connection strings for secure logging.
   */
  maskProxy(proxyStrOrConfig: string | PlaywrightProxyConfig): string;

  /**
   * Retrieves the current or active proxy configuration.
   */
  selectProxy(): PlaywrightProxyConfig | null;

  /**
   * Rotates to the next healthy proxy in the pool.
   */
  rotateProxy(): PlaywrightProxyConfig | null;

  /**
   * Pre-flight healthcheck: verifies HTTP CONNECT tunnel availability and measures latency.
   */
  quickTestProxy(
    proxyConfig: PlaywrightProxyConfig | string,
    options?: { timeoutMs?: number; targetHost?: string; targetPort?: number },
  ): Promise<ProxyTestResult>;

  /**
   * Identifies whether a thrown runtime error is related to proxy or network tunnel failures.
   */
  isProxyError(error: any): boolean;

  /**
   * Marks a failing proxy as dead/blacklisted to prevent reuse during the test run.
   */
  markProxyDead(proxyConfig: PlaywrightProxyConfig | string, reason?: string): boolean;

  /**
   * Returns standard Playwright proxy options for browser.newContext() or browserType.launch().
   * Returns undefined if direct connection mode is active.
   */
  getPlaywrightProxy(): PlaywrightProxyConfig | undefined;

  /**
   * Returns current statistics of the proxy pool.
   */
  getPoolStatus(): { total: number; active: number; dead: number };
}

/**
 * StandardProxyAdapter manages outbound test traffic routing, rotation, and healthchecks.
 * Implements resilient self-healing patterns inspired by super-power-automation.
 */
export class StandardProxyAdapter implements ProxyAdapter {
  private readonly proxyPool: PlaywrightProxyConfig[] = [];
  private readonly deadProxies = new Set<string>();
  private currentIndex: number = 0;
  private readonly strategy: 'round-robin' | 'random';
  private activeProxy: PlaywrightProxyConfig | null = null;

  constructor(customConfig?: ProxyAdapterConfig) {
    this.strategy = customConfig?.strategy || 'round-robin';

    const envProxy = process.env.PROXY_URL || process.env.PROXY || '';
    const envList = process.env.PROXY_LIST ? process.env.PROXY_LIST.split(',') : [];

    const rawSources: string[] = [
      ...(customConfig?.proxyUrl ? [customConfig.proxyUrl] : []),
      ...(customConfig?.proxyList || []),
      ...(envProxy ? [envProxy] : []),
      ...envList,
    ];

    for (const raw of rawSources) {
      const parsed = this.parseProxy(raw.trim());
      if (
        parsed &&
        !this.proxyPool.some((p) => p.server === parsed.server && p.username === parsed.username)
      ) {
        this.proxyPool.push(parsed);
      }
    }

    if (this.proxyPool.length > 0) {
      this.activeProxy = this.proxyPool[0];
      Logger.debug(
        `[PROXY] Initialized pool with ${this.proxyPool.length} proxies (Strategy: ${this.strategy})`,
      );
    } else {
      Logger.debug('[PROXY] Direct connection mode active (no proxy configured)');
    }
  }

  /**
   * Parses raw strings in various formats into PlaywrightProxyConfig
   */
  parseProxy(raw: string): PlaywrightProxyConfig | null {
    if (!raw || typeof raw !== 'string') return null;
    const clean = raw.trim();
    if (!clean || clean.startsWith('#') || clean.startsWith('//')) return null;

    // 1. Standard URL scheme (http://, https://, socks5://)
    if (clean.includes('://')) {
      try {
        const parsed = new URL(clean);
        const server = `${parsed.protocol}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ''}`;
        return {
          server,
          username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
          password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
        };
      } catch {
        return null;
      }
    }

    // 2. Format: host:port:username:password
    const parts = clean.split(':');
    if (parts.length === 4) {
      const [host, port, user, pass] = parts;
      return {
        server: `http://${host}:${port}`,
        username: user,
        password: pass,
      };
    }

    // 3. Format: host:port
    if (parts.length === 2 && /^\d+$/.test(parts[1])) {
      const [host, port] = parts;
      return {
        server: `http://${host}:${port}`,
      };
    }

    // 4. Fallback: prepend http://
    try {
      const fallbackUrl = new URL(`http://${clean}`);
      return {
        server: `http://${fallbackUrl.hostname}${fallbackUrl.port ? `:${fallbackUrl.port}` : ''}`,
        username: fallbackUrl.username ? decodeURIComponent(fallbackUrl.username) : undefined,
        password: fallbackUrl.password ? decodeURIComponent(fallbackUrl.password) : undefined,
      };
    } catch {
      return null;
    }
  }

  /**
   * Masks proxy credentials for secure terminal logs
   */
  maskProxy(proxyStrOrConfig: string | PlaywrightProxyConfig): string {
    if (!proxyStrOrConfig) return 'DIRECT';

    let config: PlaywrightProxyConfig | null = null;
    if (typeof proxyStrOrConfig === 'string') {
      config = this.parseProxy(proxyStrOrConfig);
    } else {
      config = proxyStrOrConfig;
    }

    if (!config) return 'INVALID_PROXY';

    if (config.username) {
      const maskedUser =
        config.username.length > 2 ? `${config.username.substring(0, 2)}***` : '***';
      return `${config.server.replace('://', `://${maskedUser}:***@`)}`;
    }

    return config.server;
  }

  /**
   * Selects an active healthy proxy from the pool
   */
  selectProxy(): PlaywrightProxyConfig | null {
    const healthy = this.proxyPool.filter((p) => !this.deadProxies.has(this.getProxyKey(p)));
    if (healthy.length === 0) {
      this.activeProxy = null;
      return null;
    }

    if (this.strategy === 'random') {
      const randIdx = Math.floor(Math.random() * healthy.length);
      this.activeProxy = healthy[randIdx];
    } else {
      this.currentIndex = this.currentIndex % healthy.length;
      this.activeProxy = healthy[this.currentIndex];
    }

    return this.activeProxy;
  }

  /**
   * Rotates to the next healthy proxy
   */
  rotateProxy(): PlaywrightProxyConfig | null {
    const healthy = this.proxyPool.filter((p) => !this.deadProxies.has(this.getProxyKey(p)));
    if (healthy.length === 0) {
      Logger.warn('[PROXY] All proxies in pool are exhausted or dead. Switching to DIRECT.');
      this.activeProxy = null;
      return null;
    }

    this.currentIndex = (this.currentIndex + 1) % healthy.length;
    this.activeProxy = healthy[this.currentIndex];
    Logger.info(`[PROXY] Rotated to proxy: ${this.maskProxy(this.activeProxy)}`);
    return this.activeProxy;
  }

  /**
   * Fast pre-flight check testing HTTP CONNECT tunnel before browser launch
   */
  quickTestProxy(
    proxyConfig: PlaywrightProxyConfig | string,
    options?: { timeoutMs?: number; targetHost?: string; targetPort?: number },
  ): Promise<ProxyTestResult> {
    const config = typeof proxyConfig === 'string' ? this.parseProxy(proxyConfig) : proxyConfig;
    if (!config) {
      return Promise.resolve({ ok: false, error: 'INVALID_PROXY_CONFIG' });
    }

    const timeoutMs = options?.timeoutMs ?? 4000;
    const targetHost = options?.targetHost ?? 'www.google.com';
    const targetPort = options?.targetPort ?? 443;

    return new Promise((resolve) => {
      const startTime = Date.now();
      let isResolved = false;

      let parsedServer: URL;
      try {
        parsedServer = new URL(config.server);
      } catch (err: any) {
        return resolve({ ok: false, error: `PARSE_ERROR: ${err.message}` });
      }

      const finish = (ok: boolean, error: string | null = null) => {
        if (isResolved) return;
        isResolved = true;
        clearTimeout(timer);
        if (req) {
          try {
            req.destroy();
          } catch {}
        }
        resolve({
          ok,
          error,
          latencyMs: Date.now() - startTime,
        });
      };

      const timer = setTimeout(() => {
        finish(false, `PREFLIGHT_CONNECT_TIMEOUT_${timeoutMs}MS`);
      }, timeoutMs);

      const headers: Record<string, string> = {
        Host: `${targetHost}:${targetPort}`,
        'Proxy-Connection': 'Keep-Alive',
      };

      if (config.username && config.password) {
        const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');
        headers['Proxy-Authorization'] = `Basic ${auth}`;
      }

      const req = http.request({
        host: parsedServer.hostname,
        port: parseInt(parsedServer.port || '80', 10),
        method: 'CONNECT',
        path: `${targetHost}:${targetPort}`,
        headers,
        timeout: timeoutMs,
      });

      req.on('connect', (res, socket) => {
        if (socket) {
          try {
            socket.destroy();
          } catch {}
        }
        if (res.statusCode === 200) {
          finish(true, null);
        } else {
          finish(false, `CONNECT_STATUS_${res.statusCode}`);
        }
      });

      req.on('timeout', () => {
        finish(false, 'TIMEOUT');
      });

      req.on('error', (err) => {
        finish(false, err.message);
      });

      req.end();
    });
  }

  /**
   * Detects whether an error originates from proxy connectivity failures
   */
  isProxyError(error: any): boolean {
    if (!error) return false;
    const msg = typeof error === 'string' ? error : error.message || String(error);

    const patterns = [
      /ERR_PROXY_CONNECTION_FAILED/i,
      /ERR_TUNNEL_CONNECTION_FAILED/i,
      /ECONNREFUSED/i,
      /ECONNRESET/i,
      /ETIMEDOUT/i,
      /407 Proxy Authentication Required/i,
      /NS_ERROR_PROXY_CONNECTION_REFUSED/i,
      /Proxy-Connection/i,
      /PROXY_AUTH_FAILED/i,
    ];

    return patterns.some((p) => p.test(msg));
  }

  /**
   * Blacklists a dead proxy and rotates to next
   */
  markProxyDead(proxyConfig: PlaywrightProxyConfig | string, reason: string = 'DEAD'): boolean {
    const config = typeof proxyConfig === 'string' ? this.parseProxy(proxyConfig) : proxyConfig;
    if (!config) return false;

    const key = this.getProxyKey(config);
    if (!this.deadProxies.has(key)) {
      this.deadProxies.add(key);
      Logger.warn(`[PROXY DEAD] Blacklisted proxy: ${this.maskProxy(config)} (Reason: ${reason})`);
      if (this.activeProxy && this.getProxyKey(this.activeProxy) === key) {
        this.rotateProxy();
      }
      return true;
    }

    return false;
  }

  /**
   * Returns the configuration format expected by Playwright browser.newContext()
   */
  getPlaywrightProxy(): PlaywrightProxyConfig | undefined {
    return this.activeProxy || undefined;
  }

  getPoolStatus(): { total: number; active: number; dead: number } {
    const total = this.proxyPool.length;
    const dead = this.deadProxies.size;
    return {
      total,
      active: Math.max(0, total - dead),
      dead,
    };
  }

  private getProxyKey(config: PlaywrightProxyConfig): string {
    return `${config.server}_${config.username || ''}`;
  }
}

export default StandardProxyAdapter;
