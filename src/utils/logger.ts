export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  STEP = 'STEP',
  SUCCESS = 'SUCCESS',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
};

function formatTimestamp(): string {
  const now = new Date();
  return now.toISOString().replace('T', ' ').substring(0, 19);
}

export class Logger {
  private static formatMessage(level: LogLevel, color: string, icon: string, msg: string): string {
    const time = `${colors.gray}[${formatTimestamp()}]${colors.reset}`;
    const tag = `${color}${icon} [${level}]${colors.reset}`;
    return `${time} ${tag} ${msg}`;
  }

  static debug(msg: string): void {
    if (process.env.DEBUG) {
      console.log(this.formatMessage(LogLevel.DEBUG, colors.dim, '🔍', msg));
    }
  }

  static info(msg: string): void {
    console.log(this.formatMessage(LogLevel.INFO, colors.blue, 'ℹ️ ', msg));
  }

  static step(stepNumberOrMsg: number | string, msg?: string): void {
    const text = msg ? `Step ${stepNumberOrMsg}: ${msg}` : `${stepNumberOrMsg}`;
    console.log(this.formatMessage(LogLevel.STEP, colors.cyan, '🚀', text));
  }

  static success(msg: string): void {
    console.log(this.formatMessage(LogLevel.SUCCESS, colors.green, '✅', msg));
  }

  static warn(msg: string): void {
    console.warn(this.formatMessage(LogLevel.WARN, colors.yellow, '⚠️ ', msg));
  }

  static error(msg: string, err?: unknown): void {
    console.error(this.formatMessage(LogLevel.ERROR, colors.red, '❌', msg));
    if (err) {
      console.error(err);
    }
  }

  static section(title: string): void {
    console.log(
      `\n${colors.bright}${colors.magenta}======================================================================${colors.reset}`,
    );
    console.log(`${colors.bright}${colors.magenta}  ${title.toUpperCase()}${colors.reset}`);
    console.log(
      `${colors.bright}${colors.magenta}======================================================================${colors.reset}\n`,
    );
  }
}

export default Logger;
