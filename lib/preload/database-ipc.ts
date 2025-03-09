import { ipcRenderer } from 'electron'
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

// Database API exposed to the renderer process
export const databaseApi = {
  connect: (config: PostgreSQLConnectionConfig): Promise<ConnectionTestResult> => {
    return ipcRenderer.invoke(channels.CONNECT, config)
  },

  disconnect: (): Promise<void> => {
    return ipcRenderer.invoke(channels.DISCONNECT)
  },

  testConnection: (config: PostgreSQLConnectionConfig): Promise<ConnectionTestResult> => {
    return ipcRenderer.invoke(channels.TEST_CONNECTION, config)
  },

  executeQuery: (sql: string): Promise<QueryResult> => {
    return ipcRenderer.invoke(channels.EXECUTE_QUERY, sql)
  },

  getSchemas: (): Promise<string[]> => {
    return ipcRenderer.invoke(channels.GET_SCHEMAS)
  },

  getTables: (schema: string): Promise<{ name: string; type: 'table' | 'view' | 'materialized_view' }[]> => {
    return ipcRenderer.invoke(channels.GET_TABLES, schema)
  },

  getTableColumns: (schema: string, table: string): Promise<any[]> => {
    return ipcRenderer.invoke(channels.GET_TABLE_COLUMNS, schema, table)
  },
}
