require('@testing-library/jest-dom');

const { getComputedStyle } = window;
window.getComputedStyle = (elt) => getComputedStyle(elt);
window.HTMLElement.prototype.scrollIntoView = () => {};

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserver;
global.ResizeObserver = ResizeObserver;

// Forward Web standard globals for Jest jsdom
if (typeof global.Headers === 'undefined') {
  class Headers {
    constructor(init) {
      this.map = new Map();
      if (init) {
        if (init instanceof Headers) {
          init.map.forEach((v, k) => this.map.set(k.toLowerCase(), v));
        } else if (Array.isArray(init)) {
          init.forEach(([k, v]) => this.map.set(k.toLowerCase(), String(v)));
        } else if (typeof init === 'object') {
          Object.entries(init).forEach(([k, v]) => this.map.set(k.toLowerCase(), String(v)));
        }
      }
    }
    get(name) {
      return this.map.get(String(name).toLowerCase()) || null;
    }
    set(name, value) {
      this.map.set(String(name).toLowerCase(), String(value));
    }
    has(name) {
      return this.map.has(String(name).toLowerCase());
    }
    delete(name) {
      this.map.delete(String(name).toLowerCase());
    }
    forEach(cb) {
      this.map.forEach(cb);
    }
    entries() {
      return this.map.entries();
    }
    keys() {
      return this.map.keys();
    }
    values() {
      return this.map.values();
    }
    [Symbol.iterator]() {
      return this.map.entries();
    }
  }
  global.Headers = Headers;
  window.Headers = Headers;
}

if (typeof global.Request === 'undefined') {
  class Request {
    constructor(input, init = {}) {
      this.url = typeof input === 'string' ? input : input?.url || '';
      this.method = (init.method || 'GET').toUpperCase();
      this.headers = new global.Headers(init.headers || {});
      this._body = init.body;
    }
    async json() {
      if (typeof this._body === 'string') {
        try {
          return JSON.parse(this._body);
        } catch {
          return this._body;
        }
      }
      return this._body || {};
    }
    async text() {
      if (typeof this._body === 'string') return this._body;
      return JSON.stringify(this._body || '');
    }
  }
  global.Request = Request;
  window.Request = Request;
}

if (typeof global.Response === 'undefined') {
  class Response {
    constructor(body, init = {}) {
      this._body = body;
      this.status = init?.status ?? 200;
      this.ok = this.status >= 200 && this.status < 300;
      this.headers = new global.Headers(init?.headers || {});
    }
    async text() {
      if (typeof this._body === 'string') return this._body;
      if (this._body === undefined || this._body === null) return '';
      return JSON.stringify(this._body);
    }
    async json() {
      if (this._body && typeof this._body === 'object' && !(this._body instanceof String)) {
        return this._body;
      }
      if (typeof this._body === 'string') {
        try {
          return JSON.parse(this._body);
        } catch {
          return this._body;
        }
      }
      const txt = await this.text();
      if (!txt) return null;
      try {
        return JSON.parse(txt);
      } catch {
        return txt;
      }
    }
    static json(data, init = {}) {
      const headers = new global.Headers(init?.headers || {});
      headers.set('content-type', 'application/json');
      return new Response(data, { ...init, headers });
    }
  }
  global.Response = Response;
  window.Response = Response;
}

try {
  const nextServer = require('next/server');
  if (nextServer && nextServer.NextResponse) {
    nextServer.NextResponse.json = (data, init) => ({
      status: init?.status ?? 200,
      ok: (init?.status ?? 200) >= 200 && (init?.status ?? 200) < 300,
      headers: new global.Headers(init?.headers || {}),
      json: async () => data,
      text: async () => JSON.stringify(data),
    });
  }
} catch (e) {
  // Ignored if next/server cannot be loaded in setup
}



