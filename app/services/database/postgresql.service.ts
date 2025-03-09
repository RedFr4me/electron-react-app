import { ConnectionTestResult, PostgreSQLConnectionConfig, QueryResult } from './types'

/**
 * Service for handling PostgreSQL database operations via IPC
 */
export class PostgreSQLService {
  private connectionConfig: PostgreSQLConnectionConfig | null = null
  private connected: boolean = false

  /**
   * Connect to a PostgreSQL database
   */
  async connect(config: PostgreSQLConnectionConfig): Promise<ConnectionTestResult> {
    try {
      const result = await window.databaseApi.connect(config)

      if (result.success) {
        this.connectionConfig = config
        this.connected = true
      } else {
        this.connectionConfig = null
        this.connected = false
      }

      return result
    } catch (error) {
      this.connectionConfig = null
      this.connected = false

      return {
        success: false,
        message: `Failed to connect: ${(error as Error).message}`,
        error: error as Error,
      }
    }
  }

  /**
   * Test a connection without establishing a persistent connection
   */
  async testConnection(config: PostgreSQLConnectionConfig): Promise<ConnectionTestResult> {
    try {
      return await window.databaseApi.testConnection(config)
    } catch (error) {
      return {
        success: false,
        message: `Connection test failed: ${(error as Error).message}`,
        error: error as Error,
      }
    }
  }

  /**
   * Disconnect from the current database
   */
  async disconnect(): Promise<void> {
    try {
      await window.databaseApi.disconnect()
    } finally {
      this.connectionConfig = null
      this.connected = false
    }
  }

  /**
   * Execute a SQL query
   */
  async executeQuery(sql: string): Promise<QueryResult> {
    if (!this.connected) {
      throw new Error('No active database connection')
    }

    return await window.databaseApi.executeQuery(sql)
  }

  /**
   * Get list of schemas in the current database
   */
  async getSchemas(): Promise<string[]> {
    if (!this.connected) {
      throw new Error('No active database connection')
    }

    return await window.databaseApi.getSchemas()
  }

  /**
   * Get list of tables and views in a schema
   */
  async getTables(schema: string): Promise<{ name: string; type: 'table' | 'view' | 'materialized_view' }[]> {
    if (!this.connected) {
      throw new Error('No active database connection')
    }

    return await window.databaseApi.getTables(schema)
  }

  /**
   * Get columns for a specific table
   */
  async getTableColumns(schema: string, table: string): Promise<any[]> {
    if (!this.connected) {
      throw new Error('No active database connection')
    }

    return await window.databaseApi.getTableColumns(schema, table)
  }

  /**
   * Get current connection config
   */
  getConnectionConfig(): PostgreSQLConnectionConfig | null {
    return this.connectionConfig
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.connected
  }
}
