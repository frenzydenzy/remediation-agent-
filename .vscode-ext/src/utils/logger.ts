/**
 * Logging utility with multiple log levels
 */

export class Logger {
  constructor(private context: string) {}

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString().split('T')[1];
    return `[${timestamp}] [${level}] [${this.context}] ${message}`;
  }

  info(message: string): void {
    console.log(this.formatMessage('INFO', message));
  }

  warn(message: string): void {
    console.warn(this.formatMessage('WARN', message));
  }

  error(message: string): void {
    console.error(this.formatMessage('ERROR', message));
  }

  debug(message: string): void {
    console.debug(this.formatMessage('DEBUG', message));
  }
}
