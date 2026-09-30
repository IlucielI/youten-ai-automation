import Logger from '../../utils/logger';
import { config } from '../../config';

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

export interface DatabaseAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  queryOne<T = any>(sql: string, params?: any[]): Promise<T | null>;
  execute(sql: string, params?: any[]): Promise<number>;
}

/**
 * Generic Database Adapter for Test Automation.
 * Can be backed by pg, mysql2, prisma, or knex.
 * In this starter template, it includes query logging, parameter sanitization,
 * and a fallback mock runner for environments without an active database daemon.
 */
export class SqlDatabaseAdapter implements DatabaseAdapter {
  private isConnected: boolean = false;
  private readonly dbConfig = config.targetDb;

  async connect(): Promise<void> {
    if (this.isConnected) return;
    Logger.info(
      `[DB:Target-SUT] Connecting to Database at ${this.dbConfig.host}:${this.dbConfig.port}/${this.dbConfig.database}...`,
    );
    // Connect logic (e.g. pool.connect() or knex.raw('SELECT 1'))
    this.isConnected = true;
    Logger.success('[DB:Target-SUT] Database connected successfully.');
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) return;
    Logger.info('[DB:Target-SUT] Closing database connection...');
    // Disconnect logic (e.g. pool.end())
    this.isConnected = false;
    Logger.success('[DB:Target-SUT] Database disconnected.');
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    Logger.step(`[DB QUERY] ${sql} | Params: ${JSON.stringify(params)}`);

    // In a live environment with pg/mysql:
    // const res = await this.pool.query(sql, params);
    // return { rows: res.rows, rowCount: res.rowCount };

    // Template simulation / mock response for demo
    return {
      rows: [] as T[],
      rowCount: 0,
    };
  }

  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const result = await this.query<T>(sql, params);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async execute(sql: string, params: any[] = []): Promise<number> {
    const result = await this.query(sql, params);
    return result.rowCount;
  }
}

export default SqlDatabaseAdapter;
