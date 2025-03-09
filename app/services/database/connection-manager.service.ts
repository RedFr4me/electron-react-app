import { v4 as uuidv4 } from 'uuid'
import { PostgreSQLConnectionConfig } from './types'

/**
 * Service for managing database connections
 */
export class ConnectionManagerService {
  private static readonly STORAGE_KEY = 'db_connections'
  private static readonly LAST_USED_KEY = 'last_used_connection_id'

  /**
   * Save a connection to localStorage
   */
  saveConnection(connection: PostgreSQLConnectionConfig): PostgreSQLConnectionConfig {
    // Get existing connections
    const connections = this.getConnections()

    // Create a new connection with ID if not provided
    const connectionToSave: PostgreSQLConnectionConfig = {
      ...connection,
      id: connection.id || uuidv4(),
      lastUsed: connection.lastUsed || new Date().toISOString(),
    }

    // Remove password if not saving
    if (!connectionToSave.savePassword) {
      connectionToSave.password = ''
    }

    // Check if connection already exists
    const existingIndex = connections.findIndex((conn) => conn.id === connectionToSave.id)

    if (existingIndex >= 0) {
      // Update existing connection
      connections[existingIndex] = connectionToSave
    } else {
      // Add new connection
      connections.push(connectionToSave)
    }

    // Save to localStorage
    localStorage.setItem(ConnectionManagerService.STORAGE_KEY, JSON.stringify(connections))

    return connectionToSave
  }

  /**
   * Get all stored connections
   */
  getConnections(): PostgreSQLConnectionConfig[] {
    const connectionsJson = localStorage.getItem(ConnectionManagerService.STORAGE_KEY)
    if (!connectionsJson) {
      return []
    }

    try {
      return JSON.parse(connectionsJson)
    } catch (e) {
      console.error('Error parsing connections from storage:', e)
      return []
    }
  }

  /**
   * Get a connection by ID
   */
  getConnectionById(id: string): PostgreSQLConnectionConfig | undefined {
    const connections = this.getConnections()
    return connections.find((conn) => conn.id === id)
  }

  /**
   * Delete a connection
   */
  deleteConnection(id: string): boolean {
    const connections = this.getConnections()
    const filteredConnections = connections.filter((conn) => conn.id !== id)

    if (filteredConnections.length === connections.length) {
      // No connection was removed
      return false
    }

    localStorage.setItem(ConnectionManagerService.STORAGE_KEY, JSON.stringify(filteredConnections))

    // If we deleted the last used connection, clear that reference
    const lastUsedId = this.getLastUsedConnectionId()
    if (lastUsedId === id) {
      this.clearLastUsedConnection()
    }

    return true
  }

  /**
   * Update connection last used timestamp and set as last used connection
   */
  updateLastUsed(id: string): void {
    const connections = this.getConnections()
    const connection = connections.find((conn) => conn.id === id)

    if (connection) {
      const updatedConnection = {
        ...connection,
        lastUsed: new Date().toISOString(),
      }

      this.saveConnection(updatedConnection)

      // Store the ID of the last used connection
      localStorage.setItem(ConnectionManagerService.LAST_USED_KEY, id)
    }
  }

  /**
   * Get the last used connection ID
   */
  getLastUsedConnectionId(): string | null {
    return localStorage.getItem(ConnectionManagerService.LAST_USED_KEY)
  }

  /**
   * Get the last used connection
   */
  getLastUsedConnection(): PostgreSQLConnectionConfig | null {
    const lastUsedId = this.getLastUsedConnectionId()
    if (!lastUsedId) return null

    const connection = this.getConnectionById(lastUsedId)
    return connection || null
  }

  /**
   * Clear the last used connection reference
   */
  clearLastUsedConnection(): void {
    localStorage.removeItem(ConnectionManagerService.LAST_USED_KEY)
  }
}
