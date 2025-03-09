import { create } from 'zustand'
import {
  PostgreSQLConnectionConfig,
  PostgreSQLService,
  ConnectionManagerService,
  ConnectionTestResult,
  QueryResult,
} from '../services/database'

interface DatabaseState {
  // Connection Manager
  connectionManager: ConnectionManagerService
  connections: PostgreSQLConnectionConfig[]
  selectedConnection: PostgreSQLConnectionConfig | null

  // Active PostgreSQL Service
  postgresqlService: PostgreSQLService
  isConnected: boolean
  isConnecting: boolean
  connectionError: string | null

  // Query Editor
  currentQuery: string
  queryHistory: { query: string; timestamp: string }[]
  queryResult: QueryResult | null
  isExecutingQuery: boolean
  queryError: string | null

  // Actions
  loadConnections: () => void
  selectConnection: (connection: PostgreSQLConnectionConfig | null) => void
  saveConnection: (connection: PostgreSQLConnectionConfig) => void
  deleteConnection: (id: string) => void

  connectToDatabase: (connection: PostgreSQLConnectionConfig) => Promise<ConnectionTestResult>
  disconnectFromDatabase: () => Promise<void>
  testConnection: (connection: PostgreSQLConnectionConfig) => Promise<ConnectionTestResult>

  setCurrentQuery: (query: string) => void
  executeQuery: (query?: string) => Promise<QueryResult | null>
  addToQueryHistory: (query: string) => void
  clearQueryResult: () => void
}

export const useDatabaseStore = create<DatabaseState>((set, get) => {
  // Create service instances
  const connectionManager = new ConnectionManagerService()
  const postgresqlService = new PostgreSQLService()

  return {
    // Initial state
    connectionManager,
    connections: [],
    selectedConnection: null,

    postgresqlService,
    isConnected: false,
    isConnecting: false,
    connectionError: null,

    currentQuery: '',
    queryHistory: [],
    queryResult: null,
    isExecutingQuery: false,
    queryError: null,

    // Actions
    loadConnections: () => {
      const connections = connectionManager.getConnections()
      set({ connections })
    },

    selectConnection: (connection) => {
      set({ selectedConnection: connection })
    },

    saveConnection: (connection) => {
      const savedConnection = connectionManager.saveConnection(connection)
      set((state) => ({
        connections: connectionManager.getConnections(),
        selectedConnection:
          savedConnection.id === state.selectedConnection?.id ? savedConnection : state.selectedConnection,
      }))
    },

    deleteConnection: (id) => {
      const deleted = connectionManager.deleteConnection(id)
      if (deleted) {
        set((state) => ({
          connections: connectionManager.getConnections(),
          selectedConnection: state.selectedConnection?.id === id ? null : state.selectedConnection,
        }))
      }
    },

    connectToDatabase: async (connection) => {
      set({ isConnecting: true, connectionError: null })

      try {
        const result = await postgresqlService.connect(connection)

        if (result.success) {
          // Update connection last used timestamp
          if (connection.id) {
            connectionManager.updateLastUsed(connection.id)
          }

          set({
            isConnected: true,
            connectionError: null,
            selectedConnection: connection,
          })
        } else {
          set({
            isConnected: false,
            connectionError: result.message,
          })
        }

        return result
      } catch (error) {
        const errorMessage = (error as Error).message
        set({
          isConnected: false,
          connectionError: errorMessage,
        })

        return {
          success: false,
          message: errorMessage,
          error: error as Error,
        }
      } finally {
        set({ isConnecting: false })
      }
    },

    disconnectFromDatabase: async () => {
      await postgresqlService.disconnect()
      set({
        isConnected: false,
        connectionError: null,
        queryResult: null,
        queryError: null,
      })
    },

    testConnection: async (connection) => {
      return await postgresqlService.testConnection(connection)
    },

    setCurrentQuery: (query) => {
      set({ currentQuery: query })
    },

    executeQuery: async (query) => {
      const { currentQuery, postgresqlService, addToQueryHistory } = get()
      const queryToExecute = query || currentQuery

      if (!queryToExecute.trim()) {
        return null
      }

      set({ isExecutingQuery: true, queryError: null })

      try {
        const result = await postgresqlService.executeQuery(queryToExecute)
        set({ queryResult: result })
        addToQueryHistory(queryToExecute)
        return result
      } catch (error) {
        const errorMessage = (error as Error).message
        set({ queryError: errorMessage })
        return null
      } finally {
        set({ isExecutingQuery: false })
      }
    },

    addToQueryHistory: (query) => {
      if (!query.trim()) return

      set((state) => ({
        queryHistory: [
          { query, timestamp: new Date().toISOString() },
          ...state.queryHistory.slice(0, 49), // Keep last 50 queries
        ],
      }))
    },

    clearQueryResult: () => {
      set({ queryResult: null, queryError: null })
    },
  }
})
