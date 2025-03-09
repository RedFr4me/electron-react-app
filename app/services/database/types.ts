/**
 * Database connection configuration interfaces
 */

export interface PostgreSQLConnectionConfig {
  id?: string
  name: string
  host: string
  port: number
  database: string
  username: string
  password: string
  ssl: boolean
  savePassword: boolean
}

export interface ConnectionTestResult {
  success: boolean
  message: string
  error?: Error
}

export interface DatabaseSchema {
  name: string
}

export interface DatabaseTable {
  name: string
  schema: string
  type: 'table' | 'view' | 'materialized_view'
}

export interface DatabaseColumn {
  name: string
  dataType: string
  nullable: boolean
  isPrimaryKey: boolean
  default?: string
}

export interface QueryResult {
  rows: any[]
  fields: {
    name: string
    dataTypeID: number
    dataType?: string
  }[]
  rowCount: number
  command: string
  duration: number
}
