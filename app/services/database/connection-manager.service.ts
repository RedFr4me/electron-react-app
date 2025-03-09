import { v4 as uuidv4 } from 'uuid'
import { PostgreSQLConnectionConfig } from './types'

/**
 * Service for managing database connections
 */
export class ConnectionManagerService {
  private static readonly STORAGE_KEY = 'db_connections'

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
    return true
  }

  /**
   * Update connection last used timestamp
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
    }
  }
}
