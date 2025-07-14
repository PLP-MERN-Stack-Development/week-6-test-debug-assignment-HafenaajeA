// server/src/utils/performance.js - Performance monitoring utilities

const os = require('os');
const process = require('process');

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        active: 0,
        completed: 0,
        failed: 0
      },
      responseTime: {
        min: Infinity,
        max: 0,
        average: 0,
        total: 0
      },
      memory: {
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
        rss: 0
      },
      cpu: {
        usage: 0
      },
      errors: {
        count: 0,
        rate: 0
      }
    };

    this.requestTimes = [];
    this.errorCount = 0;
    this.startTime = Date.now();

    // Initialize CPU usage monitoring
    this.initCpuMonitoring();
  }

  // Middleware to track request performance
  middleware() {
    return (req, res, next) => {
      const startTime = process.hrtime.bigint();
      
      // Increment active requests
      this.metrics.requests.active++;
      this.metrics.requests.total++;

      // Add request metadata
      req.performanceStart = startTime;
      req.performanceMonitor = this;

      // Listen for response finish
      res.on('finish', () => {
        this.recordRequestCompletion(req, res, startTime);
      });

      // Listen for response close (client disconnect)
      res.on('close', () => {
        this.recordRequestCompletion(req, res, startTime);
      });

      next();
    };
  }

  recordRequestCompletion(req, res, startTime) {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

    // Update metrics
    this.metrics.requests.active--;
    this.metrics.requests.completed++;

    // Track response times
    this.updateResponseTimes(duration);

    // Track errors
    if (res.statusCode >= 400) {
      this.metrics.requests.failed++;
      this.errorCount++;
    }

    // Log slow requests
    if (duration > 1000) { // Log requests slower than 1 second
      console.warn(`Slow request detected: ${req.method} ${req.url} - ${duration.toFixed(2)}ms`);
    }

    // Update memory usage
    this.updateMemoryMetrics();
  }

  updateResponseTimes(duration) {
    this.requestTimes.push(duration);

    // Keep only last 1000 requests for calculation
    if (this.requestTimes.length > 1000) {
      this.requestTimes.shift();
    }

    this.metrics.responseTime.min = Math.min(this.metrics.responseTime.min, duration);
    this.metrics.responseTime.max = Math.max(this.metrics.responseTime.max, duration);
    this.metrics.responseTime.total += duration;
    this.metrics.responseTime.average = this.requestTimes.reduce((a, b) => a + b, 0) / this.requestTimes.length;
  }

  updateMemoryMetrics() {
    const memUsage = process.memoryUsage();
    this.metrics.memory = {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss
    };
  }

  initCpuMonitoring() {
    let previousCpuUsage = process.cpuUsage();
    
    setInterval(() => {
      const currentCpuUsage = process.cpuUsage(previousCpuUsage);
      const cpuPercent = (currentCpuUsage.user + currentCpuUsage.system) / 1000000 * 100;
      
      this.metrics.cpu.usage = cpuPercent;
      previousCpuUsage = process.cpuUsage();
    }, 5000); // Update every 5 seconds
  }

  // Get current metrics
  getMetrics() {
    const uptime = Date.now() - this.startTime;
    const errorRate = (this.errorCount / this.metrics.requests.total) * 100 || 0;

    return {
      ...this.metrics,
      uptime,
      errorRate,
      system: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        loadAverage: os.loadavg(),
        cpuCount: os.cpus().length
      },
      timestamp: new Date().toISOString()
    };
  }

  // Get health status
  getHealthStatus() {
    const metrics = this.getMetrics();
    const warnings = [];
    const errors = [];

    // Check memory usage
    const memoryUsagePercent = (metrics.memory.heapUsed / metrics.memory.heapTotal) * 100;
    if (memoryUsagePercent > 90) {
      errors.push('High memory usage detected');
    } else if (memoryUsagePercent > 75) {
      warnings.push('Elevated memory usage');
    }

    // Check response times
    if (metrics.responseTime.average > 1000) {
      warnings.push('Slow average response time');
    }

    // Check error rate
    if (metrics.errorRate > 10) {
      errors.push('High error rate detected');
    } else if (metrics.errorRate > 5) {
      warnings.push('Elevated error rate');
    }

    // Check active requests
    if (metrics.requests.active > 100) {
      warnings.push('High number of active requests');
    }

    return {
      status: errors.length > 0 ? 'ERROR' : warnings.length > 0 ? 'WARNING' : 'HEALTHY',
      errors,
      warnings,
      metrics
    };
  }

  // Record custom metric
  recordCustomMetric(name, value, tags = {}) {
    console.log(`Custom metric: ${name} = ${value}`, tags);
    
    // In a real application, you would send this to a monitoring service
    // like DataDog, New Relic, or CloudWatch
  }

  // Record error
  recordError(error, context = {}) {
    this.errorCount++;
    
    console.error('Error recorded:', {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });

    // In a real application, you would send this to an error tracking service
    // like Sentry, Bugsnag, or Rollbar
  }

  // Start periodic reporting
  startPeriodicReporting(intervalMs = 60000) {
    setInterval(() => {
      const health = this.getHealthStatus();
      console.log('Performance Report:', {
        status: health.status,
        activeRequests: health.metrics.requests.active,
        avgResponseTime: health.metrics.responseTime.average.toFixed(2),
        memoryUsage: ((health.metrics.memory.heapUsed / health.metrics.memory.heapTotal) * 100).toFixed(2),
        errorRate: health.metrics.errorRate.toFixed(2),
        warnings: health.warnings,
        errors: health.errors
      });
    }, intervalMs);
  }

  // Memory leak detection
  detectMemoryLeaks() {
    const initialMemory = process.memoryUsage().heapUsed;
    let previousMemory = initialMemory;
    let increaseCount = 0;

    setInterval(() => {
      const currentMemory = process.memoryUsage().heapUsed;
      
      if (currentMemory > previousMemory) {
        increaseCount++;
      } else {
        increaseCount = 0;
      }

      // Alert if memory keeps increasing for 10 consecutive checks
      if (increaseCount >= 10) {
        console.warn('Potential memory leak detected:', {
          initialMemory: this.formatBytes(initialMemory),
          currentMemory: this.formatBytes(currentMemory),
          increase: this.formatBytes(currentMemory - initialMemory)
        });
      }

      previousMemory = currentMemory;
    }, 30000); // Check every 30 seconds
  }

  formatBytes(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
    return `${(bytes / (1024 ** i)).toFixed(2)} ${sizes[i]}`;
  }
}

module.exports = PerformanceMonitor;
