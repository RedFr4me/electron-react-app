/// <reference types="electron-vite/node" />

declare module '*.css' {
  const content: string
  export default content
}

declare module '*.png' {
  const content: string
  export default content
}

declare module '*.jpg' {
  const content: string
  export default content
}

declare module '*.jpeg' {
  const content: string
  export default content
}

declare module '*.svg' {
  const content: string
  export default content
}

declare module '*.web' {
  const content: string
  export default content
}

import { PostgreSQLConnectionConfig, ConnectionTestResult, QueryResult } from './services/database/types'

declare global {
  interface Window {
    electron: any
    api: any
    databaseApi: {
      connect: (config: PostgreSQLConnectionConfig) => Promise<ConnectionTestResult>
      disconnect: () => Promise<void>
      testConnection: (config: PostgreSQLConnectionConfig) => Promise<ConnectionTestResult>
      executeQuery: (sql: string) => Promise<QueryResult>
      getSchemas: () => Promise<string[]>
      getTables: (schema: string) => Promise<
        {
          name: string
          type: 'table' | 'view' | 'materialized_view'
        }[]
      >
      getTableColumns: (schema: string, table: string) => Promise<any[]>
    }
  }
}
