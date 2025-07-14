// client/src/utils/debugger.js - Client-side debugging utilities

class ClientDebugger {
  constructor() {
    this.enabled = process.env.NODE_ENV === 'development';
    this.logs = [];
    this.errors = [];
    this.performance = {
      componentRenders: new Map(),
      apiCalls: new Map(),
      routeChanges: []
    };

    if (this.enabled) {
      this.initializeDebugger();
    }
  }

  initializeDebugger() {
    // Add debug object to window
    window.debugApp = {
      getLogs: () => this.logs,
      getErrors: () => this.errors,
      getPerformance: () => this.performance,
      clearLogs: () => { this.logs = []; },
      clearErrors: () => { this.errors = []; },
      exportDebugData: () => this.exportDebugData(),
      enableVerboseLogging: () => { this.verboseLogging = true; },
      disableVerboseLogging: () => { this.verboseLogging = false; },
      simulateError: () => { throw new Error('Simulated error for testing'); },
      testPerformance: () => this.runPerformanceTest()
    };

    // Intercept console methods
    this.interceptConsole();

    // Monitor performance
    this.startPerformanceMonitoring();

    // Set up error handling
    this.setupErrorHandling();

    console.log('🐛 Debug mode enabled. Access debugging tools via window.debugApp');
  }

  log(level, message, data = null) {
    if (!this.enabled) return;

    const logEntry = {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      stack: new Error().stack
    };

    this.logs.push(logEntry);

    // Keep only last 1000 logs
    if (this.logs.length > 1000) {
      this.logs.shift();
    }

    // Style console output
    const styles = {
      debug: 'color: #888; font-size: 12px;',
      info: 'color: #2196F3; font-weight: bold;',
      warn: 'color: #FF9800; font-weight: bold;',
      error: 'color: #F44336; font-weight: bold; background: #ffebee; padding: 2px 4px;'
    };

    console.log(`%c[${level.toUpperCase()}] ${message}`, styles[level] || '', data || '');
  }

  interceptConsole() {
    const originalConsole = { ...console };

    ['log', 'info', 'warn', 'error'].forEach(method => {
      console[method] = (...args) => {
        // Call original method
        originalConsole[method](...args);

        // Store in our logs
        this.log(method === 'log' ? 'debug' : method, args.join(' '), args.length > 1 ? args : null);
      };
    });
  }

  setupErrorHandling() {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.recordError({
        type: 'javascript',
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
        error: event.error
      });
    });

    // Promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.recordError({
        type: 'promise',
        message: event.reason?.message || 'Unhandled promise rejection',
        reason: event.reason
      });
    });
  }

  recordError(errorData) {
    const errorEntry = {
      ...errorData,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      stack: errorData.error?.stack
    };

    this.errors.push(errorEntry);

    // Keep only last 100 errors
    if (this.errors.length > 100) {
      this.errors.shift();
    }

    console.error('🚨 Error recorded:', errorEntry);
  }

  trackComponentRender(componentName, renderTime) {
    if (!this.enabled) return;

    if (!this.performance.componentRenders.has(componentName)) {
      this.performance.componentRenders.set(componentName, []);
    }

    const renders = this.performance.componentRenders.get(componentName);
    renders.push({
      renderTime,
      timestamp: Date.now()
    });

    // Keep only last 50 renders per component
    if (renders.length > 50) {
      renders.shift();
    }

    // Warn about slow renders
    if (renderTime > 16) { // 16ms is one frame at 60fps
      console.warn(`🐌 Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`);
    }
  }

  trackApiCall(endpoint, method, duration, status) {
    if (!this.enabled) return;

    const key = `${method} ${endpoint}`;
    
    if (!this.performance.apiCalls.has(key)) {
      this.performance.apiCalls.set(key, []);
    }

    const calls = this.performance.apiCalls.get(key);
    calls.push({
      duration,
      status,
      timestamp: Date.now()
    });

    // Keep only last 100 calls per endpoint
    if (calls.length > 100) {
      calls.shift();
    }

    // Warn about slow API calls
    if (duration > 2000) {
      console.warn(`🐌 Slow API call: ${key} took ${duration}ms`);
    }

    this.log('debug', `API call: ${key}`, { duration, status });
  }

  trackRouteChange(from, to, duration) {
    if (!this.enabled) return;

    this.performance.routeChanges.push({
      from,
      to,
      duration,
      timestamp: Date.now()
    });

    // Keep only last 50 route changes
    if (this.performance.routeChanges.length > 50) {
      this.performance.routeChanges.shift();
    }

    this.log('info', `Route change: ${from} → ${to}`, { duration });
  }

  startPerformanceMonitoring() {
    // Monitor memory usage
    setInterval(() => {
      if (performance.memory) {
        const memInfo = {
          used: Math.round(performance.memory.usedJSHeapSize / 1048576),
          total: Math.round(performance.memory.totalJSHeapSize / 1048576),
          limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
        };

        // Warn about high memory usage
        const usage = (memInfo.used / memInfo.limit) * 100;
        if (usage > 80) {
          console.warn(`🔥 High memory usage: ${usage.toFixed(1)}% (${memInfo.used}MB / ${memInfo.limit}MB)`);
        }
      }
    }, 30000); // Check every 30 seconds

    // Monitor FPS
    this.monitorFPS();
  }

  monitorFPS() {
    let lastTime = performance.now();
    let frameCount = 0;

    const calculateFPS = (currentTime) => {
      frameCount++;
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        
        if (fps < 30) {
          console.warn(`🎮 Low FPS detected: ${fps} fps`);
        }

        frameCount = 0;
        lastTime = currentTime;
      }

      requestAnimationFrame(calculateFPS);
    };

    requestAnimationFrame(calculateFPS);
  }

  exportDebugData() {
    const debugData = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      logs: this.logs,
      errors: this.errors,
      performance: {
        componentRenders: Object.fromEntries(this.performance.componentRenders),
        apiCalls: Object.fromEntries(this.performance.apiCalls),
        routeChanges: this.performance.routeChanges
      },
      localStorage: { ...localStorage },
      sessionStorage: { ...sessionStorage }
    };

    // Create downloadable file
    const blob = new Blob([JSON.stringify(debugData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    console.log('📄 Debug data exported');
    return debugData;
  }

  runPerformanceTest() {
    console.log('🏃 Running performance test...');

    // Test DOM operations
    const start = performance.now();
    
    for (let i = 0; i < 1000; i++) {
      const div = document.createElement('div');
      div.textContent = `Test element ${i}`;
      document.body.appendChild(div);
      document.body.removeChild(div);
    }

    const domTime = performance.now() - start;

    // Test array operations
    const arrayStart = performance.now();
    const arr = [];
    
    for (let i = 0; i < 100000; i++) {
      arr.push(i);
    }
    
    arr.sort((a, b) => b - a);
    const arrayTime = performance.now() - arrayStart;

    const results = {
      domOperations: `${domTime.toFixed(2)}ms`,
      arrayOperations: `${arrayTime.toFixed(2)}ms`
    };

    console.log('📊 Performance test results:', results);
    return results;
  }

  // React component wrapper for performance tracking
  withPerformanceTracking(WrappedComponent, componentName) {
    if (!this.enabled) return WrappedComponent;

    return (props) => {
      const renderStart = performance.now();
      
      React.useEffect(() => {
        const renderEnd = performance.now();
        this.trackComponentRender(componentName, renderEnd - renderStart);
      });

      return React.createElement(WrappedComponent, props);
    };
  }
}

// Create singleton instance
const clientDebugger = new ClientDebugger();

export default clientDebugger;

// Export convenience methods
export const log = (message, data) => clientDebugger.log('debug', message, data);
export const info = (message, data) => clientDebugger.log('info', message, data);
export const warn = (message, data) => clientDebugger.log('warn', message, data);
export const error = (message, data) => clientDebugger.log('error', message, data);
export const trackComponentRender = (name, time) => clientDebugger.trackComponentRender(name, time);
export const trackApiCall = (endpoint, method, duration, status) => 
  clientDebugger.trackApiCall(endpoint, method, duration, status);
export const trackRouteChange = (from, to, duration) => 
  clientDebugger.trackRouteChange(from, to, duration);
export const withPerformanceTracking = (component, name) => 
  clientDebugger.withPerformanceTracking(component, name);
