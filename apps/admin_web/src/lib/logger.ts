// Logger for standardizing observability

type LogLevel = 'info' | 'warn' | 'error' | 'critical';

class Logger {
  private log(level: LogLevel, message: string, data?: unknown) {
    const timestamp = new Date().toISOString();
    const payload = { timestamp, level, message, data };

    // In production, this might send to Sentry, DataDog, etc.
    // For now, we wrap the console safely so we can redirect it later.
    if (import.meta.env.DEV) {
      switch (level) {
        case 'info':
          console.info(`[INFO] ${timestamp} - ${message}`, data || '');
          break;
        case 'warn':
          console.warn(`[WARN] ${timestamp} - ${message}`, data || '');
          break;
        case 'error':
          console.error(`[ERROR] ${timestamp} - ${message}`, data || '');
          break;
        case 'critical':
          console.error(`[CRITICAL] ${timestamp} - ${message}`, data || '');
          break;
      }
    } else {
      // PROD: buffer and send to remote logging service
      // e.g., remoteLogger.send(payload)
      if (level === 'error' || level === 'critical') {
        // Still dump to console in prod for errors if no service is hooked up yet
        console.error(JSON.stringify(payload));
      }
    }
  }

  info(message: string, data?: unknown) {
    this.log('info', message, data);
  }

  warn(message: string, data?: unknown) {
    this.log('warn', message, data);
  }

  error(message: string, data?: unknown) {
    this.log('error', message, data);
  }

  critical(message: string, data?: unknown) {
    this.log('critical', message, data);
  }
}

export const logger = new Logger();
