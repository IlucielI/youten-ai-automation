import { APIRequestContext, APIResponse, expect } from '@playwright/test';
import Logger from '../utils/logger';

export interface ApiResponse<T = any> {
  status: number;
  statusText: string;
  data: T;
  headers: Record<string, string>;
  durationMs: number;
  rawResponse: APIResponse;
}

/**
 * ApiClient wraps Playwright's APIRequestContext for structured API testing,
 * request logging, and test-data setup/teardown.
 */
export class ApiClient {
  readonly request: APIRequestContext;
  readonly baseUrl: string;
  private defaultHeaders: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  constructor(request: APIRequestContext, baseUrl: string = '') {
    this.request = request;
    this.baseUrl = baseUrl;
  }

  /**
   * Sets Authorization header for subsequent API requests
   */
  setAuthToken(token: string, type: 'Bearer' | 'Basic' = 'Bearer'): void {
    this.defaultHeaders['Authorization'] = `${type} ${token}`;
    Logger.debug(`[API AUTH] Authorization token set (${type} ****)`);
  }

  /**
   * Sets custom header
   */
  setHeader(key: string, value: string): void {
    this.defaultHeaders[key] = value;
  }

  /**
   * Merges multiple default headers
   */
  setHeaders(headers: Record<string, string>): void {
    this.defaultHeaders = { ...this.defaultHeaders, ...headers };
  }

  /**
   * Clears custom and auth headers back to defaults
   */
  clearHeaders(): void {
    this.defaultHeaders = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  }

  private resolveUrl(endpoint: string): string {
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return endpoint;
    }
    const cleanBase = this.baseUrl.replace(/\/+$/, '');
    const cleanEndpoint = endpoint.replace(/^\/+/, '');
    return cleanBase ? `${cleanBase}/${cleanEndpoint}` : endpoint;
  }

  private async executeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    endpoint: string,
    options: {
      data?: any;
      params?: Record<string, string | number | boolean>;
      headers?: Record<string, string>;
    } = {},
  ): Promise<ApiResponse<T>> {
    const url = this.resolveUrl(endpoint);
    const mergedHeaders = { ...this.defaultHeaders, ...options.headers };
    Logger.step(`API [${method}] ${url}`);

    const startTime = Date.now();
    let response: APIResponse;

    switch (method) {
      case 'GET':
        response = await this.request.get(url, {
          params: options.params,
          headers: mergedHeaders,
        });
        break;
      case 'POST':
        response = await this.request.post(url, {
          data: options.data,
          params: options.params,
          headers: mergedHeaders,
        });
        break;
      case 'PUT':
        response = await this.request.put(url, {
          data: options.data,
          params: options.params,
          headers: mergedHeaders,
        });
        break;
      case 'PATCH':
        response = await this.request.patch(url, {
          data: options.data,
          params: options.params,
          headers: mergedHeaders,
        });
        break;
      case 'DELETE':
        response = await this.request.delete(url, {
          params: options.params,
          headers: mergedHeaders,
        });
        break;
    }

    const durationMs = Date.now() - startTime;
    const status = response.status();
    const headers = response.headers();

    let data: any = null;
    const contentType = headers['content-type'] || '';
    if (contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch {
        data = await response.text();
      }
    } else {
      data = await response.text();
    }

    if (status >= 200 && status < 300) {
      Logger.success(`API [${method}] ${url} -> ${status} (${durationMs}ms)`);
    } else {
      Logger.warn(`API [${method}] ${url} -> ${status} (${durationMs}ms)`);
    }

    return {
      status,
      statusText: response.statusText(),
      data,
      headers,
      durationMs,
      rawResponse: response,
    };
  }

  async get<T = any>(
    endpoint: string,
    options?: { params?: Record<string, any>; headers?: Record<string, string> },
  ): Promise<ApiResponse<T>> {
    return await this.executeRequest<T>('GET', endpoint, options);
  }

  async post<T = any>(
    endpoint: string,
    data?: any,
    options?: { params?: Record<string, any>; headers?: Record<string, string> },
  ): Promise<ApiResponse<T>> {
    return await this.executeRequest<T>('POST', endpoint, { data, ...options });
  }

  async put<T = any>(
    endpoint: string,
    data?: any,
    options?: { params?: Record<string, any>; headers?: Record<string, string> },
  ): Promise<ApiResponse<T>> {
    return await this.executeRequest<T>('PUT', endpoint, { data, ...options });
  }

  async patch<T = any>(
    endpoint: string,
    data?: any,
    options?: { params?: Record<string, any>; headers?: Record<string, string> },
  ): Promise<ApiResponse<T>> {
    return await this.executeRequest<T>('PATCH', endpoint, { data, ...options });
  }

  async delete<T = any>(
    endpoint: string,
    options?: { params?: Record<string, any>; headers?: Record<string, string> },
  ): Promise<ApiResponse<T>> {
    return await this.executeRequest<T>('DELETE', endpoint, options);
  }

  // Assertions helpers
  expectStatus(response: ApiResponse, expectedStatus: number): void {
    expect(
      response.status,
      `Expected HTTP status ${expectedStatus} but got ${response.status}`,
    ).toBe(expectedStatus);
  }

  /**
   * Asserts that API response time is within acceptable SLA limit
   */
  expectResponseTimeLessThan(response: ApiResponse, maxDurationMs: number): void {
    expect(
      response.durationMs,
      `API response took ${response.durationMs}ms, exceeding acceptable SLA threshold of ${maxDurationMs}ms`,
    ).toBeLessThanOrEqual(maxDurationMs);
  }

  /**
   * Asserts that the response object contains all required properties
   */
  expectProperties(data: Record<string, any>, requiredKeys: string[]): void {
    for (const key of requiredKeys) {
      expect(data, `Expected response object to have property "${key}"`).toHaveProperty(key);
    }
  }
}

export default ApiClient;
