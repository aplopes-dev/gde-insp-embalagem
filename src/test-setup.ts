import '@testing-library/jest-dom';

// Configuração de logs para testes
const TEST_LOG_CONFIG = {
  // Suprimir logs de debug do código de produção
  suppressProductionLogs: false,
  // Suprimir warnings de deprecation
  suppressDeprecationWarnings: true,
  // Suprimir warnings de React Testing Library
  suppressReactTestingWarnings: true,
};

// Suprimir warnings específicos do React Testing Library
const originalError = console.error;
const originalLog = console.log;

beforeAll(() => {
  console.error = (...args: any[]) => {
    // Suprimir warnings de act() que são comuns em testes de componentes React
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: An update to') && args[0].includes('inside a test was not wrapped in act'))
    ) {
      return;
    }

    // Suprimir warnings de punycode deprecation
    if (
      typeof args[0] === 'string' &&
      args[0].includes('DeprecationWarning: The `punycode` module is deprecated')
    ) {
      return;
    }

    originalError.call(console, ...args);
  };

  // Suprimir logs de debug durante testes (configurável)
  if (TEST_LOG_CONFIG.suppressProductionLogs) {
    console.log = (...args: any[]) => {
      // Suprimir logs específicos de debug
      if (
        typeof args[0] === 'string' &&
        (args[0].includes('-------------validation-------------') ||
         args[0] === 'PASSOU')
      ) {
        return;
      }

      // Suprimir logs de objetos de validação
      if (
        typeof args[0] === 'object' &&
        args[0]?.itemId && args[0]?.quantity
      ) {
        return;
      }

      originalLog.call(console, ...args);
    };
  }
});

afterAll(() => {
  console.error = originalError;
  console.log = originalLog;
});

// Mock global para window.matchMedia (usado por alguns componentes)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock global para ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock global para IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
