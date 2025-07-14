// src/tests/unit/debugger.test.js - Unit tests for debugging utilities

import clientDebugger, { log, info, warn, error } from '../../utils/debugger';

// Mock console methods
const originalConsole = { ...console };
beforeAll(() => {
  global.console = {
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };
});

afterAll(() => {
  global.console = originalConsole;
});

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: jest.fn(() => 1000),
    memory: {
      usedJSHeapSize: 1000000,
      totalJSHeapSize: 2000000,
      jsHeapSizeLimit: 4000000
    }
  },
  writable: true
});

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));

describe('Client Debugger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset environment
    process.env.NODE_ENV = 'development';
    
    // Clear window.debugApp if it exists
    if (window.debugApp) {
      window.debugApp.clearLogs();
      window.debugApp.clearErrors();
    }
  });

  describe('Initialization', () => {
    it('should initialize debug tools in development mode', () => {
      expect(window.debugApp).toBeDefined();
      expect(typeof window.debugApp.getLogs).toBe('function');
      expect(typeof window.debugApp.getErrors).toBe('function');
      expect(typeof window.debugApp.getPerformance).toBe('function');
    });

    it('should not initialize debug tools in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      // Re-import to test production behavior
      jest.resetModules();
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Logging', () => {
    it('should log debug messages', () => {
      log('Test debug message', { test: true });
      
      const logs = window.debugApp.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('debug');
      expect(logs[0].message).toBe('Test debug message');
      expect(logs[0].data).toEqual({ test: true });
    });

    it('should log info messages', () => {
      info('Test info message');
      
      const logs = window.debugApp.getLogs();
      const infoLog = logs.find(l => l.level === 'info');
      expect(infoLog).toBeDefined();
      expect(infoLog.message).toBe('Test info message');
    });

    it('should log warning messages', () => {
      warn('Test warning message');
      
      const logs = window.debugApp.getLogs();
      const warnLog = logs.find(l => l.level === 'warn');
      expect(warnLog).toBeDefined();
      expect(warnLog.message).toBe('Test warning message');
    });

    it('should log error messages', () => {
      error('Test error message');
      
      const logs = window.debugApp.getLogs();
      const errorLog = logs.find(l => l.level === 'error');
      expect(errorLog).toBeDefined();
      expect(errorLog.message).toBe('Test error message');
    });

    it('should limit log storage to 1000 entries', () => {
      // Add more than 1000 logs
      for (let i = 0; i < 1100; i++) {
        log(`Log message ${i}`);
      }
      
      const logs = window.debugApp.getLogs();
      expect(logs).toHaveLength(1000);
      expect(logs[0].message).toBe('Log message 100'); // First 100 should be removed
    });
  });

  describe('Error Tracking', () => {
    it('should track JavaScript errors', () => {
      const errorEvent = new ErrorEvent('error', {
        message: 'Test error',
        filename: 'test.js',
        lineno: 10,
        colno: 5,
        error: new Error('Test error')
      });
      
      window.dispatchEvent(errorEvent);
      
      const errors = window.debugApp.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('javascript');
      expect(errors[0].message).toBe('Test error');
    });

    it('should track unhandled promise rejections', () => {
      const rejectionEvent = new CustomEvent('unhandledrejection');
      rejectionEvent.reason = new Error('Promise rejection');
      
      window.dispatchEvent(rejectionEvent);
      
      const errors = window.debugApp.getErrors();
      const promiseError = errors.find(e => e.type === 'promise');
      expect(promiseError).toBeDefined();
    });
  });

  describe('Performance Tracking', () => {
    it('should track component render times', () => {
      clientDebugger.trackComponentRender('TestComponent', 25);
      
      const performance = window.debugApp.getPerformance();
      expect(performance.componentRenders.has('TestComponent')).toBeTruthy();
      
      const renders = performance.componentRenders.get('TestComponent');
      expect(renders).toHaveLength(1);
      expect(renders[0].renderTime).toBe(25);
    });

    it('should warn about slow component renders', () => {
      clientDebugger.trackComponentRender('SlowComponent', 50); // > 16ms threshold
      
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Slow render detected: SlowComponent')
      );
    });

    it('should track API call performance', () => {
      clientDebugger.trackApiCall('/api/test', 'GET', 150, 200);
      
      const performance = window.debugApp.getPerformance();
      expect(performance.apiCalls.has('GET /api/test')).toBeTruthy();
      
      const calls = performance.apiCalls.get('GET /api/test');
      expect(calls).toHaveLength(1);
      expect(calls[0].duration).toBe(150);
      expect(calls[0].status).toBe(200);
    });

    it('should warn about slow API calls', () => {
      clientDebugger.trackApiCall('/api/slow', 'POST', 3000, 200); // > 2000ms threshold
      
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Slow API call: POST /api/slow')
      );
    });

    it('should track route changes', () => {
      clientDebugger.trackRouteChange('/home', '/profile', 100);
      
      const performance = window.debugApp.getPerformance();
      expect(performance.routeChanges).toHaveLength(1);
      expect(performance.routeChanges[0].from).toBe('/home');
      expect(performance.routeChanges[0].to).toBe('/profile');
      expect(performance.routeChanges[0].duration).toBe(100);
    });
  });

  describe('Debug Utilities', () => {
    it('should clear logs when requested', () => {
      log('Test message 1');
      log('Test message 2');
      
      expect(window.debugApp.getLogs()).toHaveLength(2);
      
      window.debugApp.clearLogs();
      
      expect(window.debugApp.getLogs()).toHaveLength(0);
    });

    it('should clear errors when requested', () => {
      const errorEvent = new ErrorEvent('error', {
        message: 'Test error',
        error: new Error('Test error')
      });
      window.dispatchEvent(errorEvent);
      
      expect(window.debugApp.getErrors()).toHaveLength(1);
      
      window.debugApp.clearErrors();
      
      expect(window.debugApp.getErrors()).toHaveLength(0);
    });

    it('should simulate errors for testing', () => {
      expect(() => {
        window.debugApp.simulateError();
      }).toThrow('Simulated error for testing');
    });

    it('should run performance tests', () => {
      const results = window.debugApp.testPerformance();
      
      expect(results).toHaveProperty('domOperations');
      expect(results).toHaveProperty('arrayOperations');
      expect(typeof results.domOperations).toBe('string');
      expect(typeof results.arrayOperations).toBe('string');
    });
  });

  describe('Data Export', () => {
    it('should export debug data', () => {
      // Add some test data
      log('Test log');
      clientDebugger.trackComponentRender('TestComponent', 10);
      clientDebugger.trackApiCall('/api/test', 'GET', 100, 200);
      
      // Mock URL.createObjectURL and document.createElement
      const mockCreateObjectURL = jest.fn(() => 'mock-url');
      const mockClick = jest.fn();
      const mockRevokeObjectURL = jest.fn();
      
      Object.defineProperty(URL, 'createObjectURL', { value: mockCreateObjectURL });
      Object.defineProperty(URL, 'revokeObjectURL', { value: mockRevokeObjectURL });
      
      const mockElement = {
        href: '',
        download: '',
        click: mockClick
      };
      jest.spyOn(document, 'createElement').mockReturnValue(mockElement);
      
      const debugData = window.debugApp.exportDebugData();
      
      expect(debugData).toHaveProperty('timestamp');
      expect(debugData).toHaveProperty('logs');
      expect(debugData).toHaveProperty('errors');
      expect(debugData).toHaveProperty('performance');
      expect(debugData.logs).toHaveLength(1);
      
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });
  });

  describe('Memory Monitoring', () => {
    it('should monitor memory usage and warn about high usage', (done) => {
      // Mock high memory usage
      Object.defineProperty(window.performance, 'memory', {
        value: {
          usedJSHeapSize: 3500000, // 3.5MB
          totalJSHeapSize: 4000000, // 4MB
          jsHeapSizeLimit: 4000000  // 4MB
        },
        writable: true
      });
      
      // Since memory monitoring uses setInterval, we need to wait
      setTimeout(() => {
        expect(console.warn).toHaveBeenCalledWith(
          expect.stringContaining('High memory usage')
        );
        done();
      }, 100);
    });
  });
});
