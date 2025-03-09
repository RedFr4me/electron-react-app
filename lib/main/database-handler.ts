import { ipcMain } from 'electron'
import { Client, ClientConfig, QueryResult as PgQueryResult } from 'pg'
import { PostgreSQLConnectionConfig, ConnectionTestResult, QueryResult } from '../../app/services/database/types'

// Define the IPC channels
const channels = {
  CONNECT: 'database:connect',
  DISCONNECT: 'database:disconnect',
  TEST_CONNECTION: 'database:test-connection',
  EXECUTE_QUERY: 'database:execute-query',
  GET_SCHEMAS: 'database:get-schemas',
  GET_TABLES: 'database:get-tables',
  GET_TABLE_COLUMNS: 'database:get-table-columns',
}

// Database service for the main process
class PostgreSQLService {
  private client: Client | null = null
  private config: ClientConfig | null = null
  private connectionConfig: PostgreSQLConnectionConfig | null = null

  private createClient(config: PostgreSQLConnectionConfig): Client {
    const clientConfig: ClientConfig = {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
    }

    this.config = clientConfig
    this.connectionConfig = config
    return new Client(clientConfig)
  }

  async connect(config: PostgreSQLConnectionConfig): Promise<ConnectionTestResult> {
    try {
      // Close existing connection if any
      await this.disconnect()

      // Create and connect to new client
      this.client = this.createClient(config)
      await this.client.connect()

      return {
        success: true,
        message: 'Successfully connected to database',
      }
    } catch (error) {
      this.client = null
      this.config = null

      return {
        success: false,
        message: `Failed to connect: ${(error as Error).message}`,
        error: error as Error,
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.end()
      } catch (e) {
        console.error('Error during disconnect:', e)
      } finally {
        this.client = null
        this.config = null
      }
    }
  }

  async testConnection(config: PostgreSQLConnectionConfig): Promise<ConnectionTestResult> {
    const tempClient = this.createClient(config)

    try {
      await tempClient.connect()
      await tempClient.query('SELECT 1')
      return {
        success: true,
        message: 'Connection test successful',
      }
    } catch (error) {
      return {
        success: false,
        message: `Connection test failed: ${(error as Error).message}`,
        error: error as Error,
      }
    } finally {
      try {
        await tempClient.end()
      } catch (e) {
        console.error('Error closing test connection:', e)
      }
    }
  }

  async executeQuery(sql: string): Promise<QueryResult> {
    if (!this.client) {
      throw new Error('No active database connection')
    }

    const startTime = Date.now()

    try {
      const result: PgQueryResult = await this.client.query(sql)
      const duration = Date.now() - startTime

      return {
        rows: result.rows,
        fields: result.fields.map((field) => ({
          name: field.name,
          dataTypeID: field.dataTypeID,
          dataType: this.getDataTypeName(field.dataTypeID),
        })),
        rowCount: result.rowCount || 0,
        command: result.command || '',
        duration,
      }
    } catch (error) {
      throw error
    }
  }

  async getSchemas(): Promise<string[]> {
    if (!this.client) {
      throw new Error('No active database connection')
    }

    const query = `
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast') 
      ORDER BY schema_name
    `

    const result = await this.client.query(query)
    return result.rows.map((row) => row.schema_name)
  }

  async getTables(schema: string): Promise<{ name: string; type: 'table' | 'view' | 'materialized_view' }[]> {
    if (!this.client) {
      throw new Error('No active database connection')
    }

    // Get regular tables and views
    const query = `
      SELECT 
        table_name as name,
        CASE table_type
          WHEN 'BASE TABLE' THEN 'table'
          WHEN 'VIEW' THEN 'view'
        END as type
      FROM information_schema.tables
      WHERE table_schema = $1
      ORDER BY table_name
    `

    const result = await this.client.query(query, [schema])

    // Get materialized views
    const matViewQuery = `
      SELECT matviewname as name, 'materialized_view' as type
      FROM pg_matviews
      WHERE schemaname = $1
      ORDER BY matviewname
    `

    const matViewResult = await this.client.query(matViewQuery, [schema])

    return [...result.rows, ...matViewResult.rows]
  }

  async getTableColumns(schema: string, table: string): Promise<any[]> {
    if (!this.client) {
      throw new Error('No active database connection')
    }

    const query = `
      SELECT 
        column_name as name,
        data_type as "dataType",
        is_nullable = 'YES' as nullable,
        column_default as default,
        (
          SELECT EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
              ON tc.constraint_name = kcu.constraint_name 
              AND tc.table_schema = kcu.table_schema
            WHERE tc.constraint_type = 'PRIMARY KEY'
              AND tc.table_schema = $1
              AND tc.table_name = $2
              AND kcu.column_name = c.column_name
          )
        ) as "isPrimaryKey"
      FROM information_schema.columns c
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position
    `

    const result = await this.client.query(query, [schema, table])
    return result.rows
  }

  private getDataTypeName(typeId: number): string {
    const typeMap: Record<number, string> = {
      16: 'boolean',
      23: 'integer',
      21: 'smallint',
      20: 'bigint',
      700: 'real',
      701: 'double precision',
      1700: 'numeric',
      25: 'text',
      1043: 'varchar',
      1082: 'date',
      1114: 'timestamp',
      1184: 'timestamptz',
      114: 'json',
      3802: 'jsonb',
      2950: 'uuid',
      1015: 'text[]',
      1007: 'integer[]',
    }

    return typeMap[typeId] || `unknown(${typeId})`
  }
}

// Create a singleton instance
const postgresqlService = new PostgreSQLService()

// Register IPC handlers
export function registerDatabaseHandlers(): void {
  ipcMain.handle(channels.CONNECT, async (_, config: PostgreSQLConnectionConfig) => {
    return await postgresqlService.connect(config)
  })

  ipcMain.handle(channels.DISCONNECT, async () => {
    return await postgresqlService.disconnect()
  })

  ipcMain.handle(channels.TEST_CONNECTION, async (_, config: PostgreSQLConnectionConfig) => {
    return await postgresqlService.testConnection(config)
  })

  ipcMain.handle(channels.EXECUTE_QUERY, async (_, sql: string) => {
    return await postgresqlService.executeQuery(sql)
  })

  ipcMain.handle(channels.GET_SCHEMAS, async () => {
    return await postgresqlService.getSchemas()
  })

  ipcMain.handle(channels.GET_TABLES, async (_, schema: string) => {
    return await postgresqlService.getTables(schema)
  })

  ipcMain.handle(channels.GET_TABLE_COLUMNS, async (_, schema: string, table: string) => {
    return await postgresqlService.getTableColumns(schema, table)
  })
}
