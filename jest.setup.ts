import '@testing-library/jest-dom';

// jsdom does not implement matchMedia; Recharts and responsive hooks rely on it.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: ResizeObserverStub,
});

// Silence jsdom "Not implemented: navigation" noise on anchor clicks in tests.
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    const first = String(args[0] ?? '');
    if (first.includes('Not implemented: navigation')) return;
    originalError(...args);
  };
});
afterAll(() => {
  console.error = originalError;
});
