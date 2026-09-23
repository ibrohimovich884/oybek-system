/**
 * OYBEK SysteM - Resilient HTTP API Client
 * 
 * Ushbu klient quyidagi xususiyatlarga ega:
 * 1. Backend porti sozlanishi bilan avtomatik unga ulanishga harakat qiladi.
 * 2. Agar backend porti yopilgan yoki hali ishga tushmagan bo'lsa, FRONTENDDA XATOLIK
 *    KELIB CHIQMAYDI (hech qanday crash yoki qizil xatolik oynasi chiqmaydi).
 * 3. So'rovlar 3 soniya ichida javob bermasa (timeout), avtomatik mahalliy zaxiraga o'tadi.
 */

import {
  getBackendBaseUrl,
  getBackendPort,
  API_TIMEOUT_MS,
  API_ENDPOINTS,
} from "../config/apiConfig.js";

class ApiClient {
  constructor() {
    this.statusListeners = new Set();
    this.state = {
      isConnected: false,
      isChecking: false,
      port: getBackendPort(),
      baseUrl: getBackendBaseUrl(),
      lastChecked: null,
      error: null,
    };
  }

  notify() {
    this.state.port = getBackendPort();
    this.state.baseUrl = getBackendBaseUrl();
    for (const listener of this.statusListeners) {
      try {
        listener({ ...this.state });
      } catch (err) {
        console.warn("Status listener error:", err);
      }
    }
  }

  subscribe(listener) {
    this.statusListeners.add(listener);
    listener({ ...this.state });
    return () => this.statusListeners.delete(listener);
  }

  getStatus() {
    return { ...this.state, port: getBackendPort(), baseUrl: getBackendBaseUrl() };
  }

  /**
   * Backend bilan aloqani xavfsiz tekshirish (Health Check)
   */
  async checkHealth(timeoutMs = 8000) {
    this.state.isChecking = true;
    this.notify();

    const baseUrl = getBackendBaseUrl();
    const url = `${baseUrl}${API_ENDPOINTS.HEALTH}`;
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(timer);

      const latency = Date.now() - startTime;
      if (response.ok) {
        this.state.isConnected = true;
        this.state.error = null;
        this.state.latency = latency;
      } else {
        this.state.isConnected = false;
        this.state.error = `HTTP ${response.status}`;
        this.state.latency = latency;
      }
    } catch (err) {
      this.state.isConnected = false;
      this.state.error = err.name === "AbortError" 
        ? "Server javob bermadi (Server uyg'onishi 15-20s vaqt olishi mumkin)" 
        : "Backend ulanmagan yoki oflayn";
      this.state.latency = null;
    } finally {
      this.state.isChecking = false;
      this.state.lastChecked = new Date().toISOString();
      this.notify();
    }

    return this.state.isConnected;
  }

  /**
   * Xavfsiz HTTP so'rovi (Hech qachon frontendni qulatmaydi)
   */
  async request(endpoint, options = {}) {
    const baseUrl = getBackendBaseUrl();
    // Nisbiy yoki to'liq manzil
    const fullUrl = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
      const headers = {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(options.headers || {}),
      };

      const res = await fetch(fullUrl, {
        ...options,
        signal: controller.signal,
        headers,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        return {
          ok: false,
          status: res.status,
          error: errorText || `Server xatosi: ${res.status}`,
          isNetworkError: false,
        };
      }

      const data = await res.json().catch(() => null);

      if (!this.state.isConnected) {
        this.state.isConnected = true;
        this.state.error = null;
        this.notify();
      }

      return { ok: true, status: res.status, data };
    } catch (err) {
      clearTimeout(timeout);

      // Agar server o'chiq bo'lsa yoki tarmoq xatosi bo'lsa:
      if (this.state.isConnected) {
        this.state.isConnected = false;
        this.state.error = "Aloqa uzildi";
        this.notify();
      }

      return {
        ok: false,
        status: 0,
        error: err.name === "AbortError" ? "Timeout" : "Tarmoq xatosi (Backend faol emas)",
        isNetworkError: true,
      };
    }
  }

  async get(endpoint) {
    return this.request(endpoint, { method: "GET" });
  }

  async post(endpoint, body) {
    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async put(endpoint, body) {
    return this.request(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: "DELETE" });
  }
}

export const apiClient = new ApiClient();
