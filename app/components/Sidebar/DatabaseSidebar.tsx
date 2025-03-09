import React, { useState, useEffect } from 'react'
import { useDatabaseStore } from '../../store'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { ConnectionDialog } from '../Dialogs/ConnectionDialog'
import { PostgreSQLConnectionConfig } from '../../services/database'
import {
  PlusCircle,
  Edit,
  Trash2,
  Database,
  RefreshCw,
  Power,
  Server,
  Search,
  ChevronRight,
  ChevronDown,
  Table,
  Eye,
  FileIcon,
  AlertCircle,
  X,
  Check,
} from 'lucide-react'

export function DatabaseSidebar() {
  const {
    connections,
    loadConnections,
    deleteConnection,
    connectToDatabase,
    disconnectFromDatabase,
    selectedConnection,
    isConnected,
    isConnecting,
    postgresqlService,
    executeQuery,
  } = useDatabaseStore()

  // Connection state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingConnection, setEditingConnection] = useState<PostgreSQLConnectionConfig | undefined>(undefined)
  const [searchQuery, setSearchQuery] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  // Database explorer state
  const [expandedConnections, setExpandedConnections] = useState<Set<string>>(new Set())
  const [expandedSchemas, setExpandedSchemas] = useState<Map<string, Set<string>>>(new Map())
  const [schemasMap, setSchemasMap] = useState<Map<string, string[]>>(new Map())
  const [tablesMap, setTablesMap] = useState<Map<string, any[]>>(new Map())
  const [loadingSchemas, setLoadingSchemas] = useState<Set<string>>(new Set())
  const [loadingTables, setLoadingTables] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  // Load connections on mount
  useEffect(() => {
    loadConnections()
  }, [loadConnections])

  // Connection handlers
  const handleEdit = (connection: PostgreSQLConnectionConfig) => {
    setEditingConnection(connection)
    setIsEditDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    setShowDeleteConfirm(id)
  }

  const confirmDelete = (id: string) => {
    deleteConnection(id)
    setShowDeleteConfirm(null)
  }

  const cancelDelete = () => {
    setShowDeleteConfirm(null)
  }

  const handleConnect = async (connection: PostgreSQLConnectionConfig) => {
    // If already connected, disconnect first
    if (isConnected && selectedConnection?.id === connection.id) {
      await disconnectFromDatabase()
      return
    }

    // Connect to the database
    const result = await connectToDatabase(connection)

    if (result.success) {
      // If connection successful, expand the connection to show schemas
      toggleConnection(connection.id!)
    } else {
      // We'll handle this better with a toast notification in the future
      alert(`Connection failed: ${result.message}`)
    }
  }

  // Database explorer handlers
  const toggleConnection = async (connectionId: string) => {
    const newExpandedConnections = new Set(expandedConnections)

    if (newExpandedConnections.has(connectionId)) {
      // Collapse connection
      newExpandedConnections.delete(connectionId)
    } else {
      // Expand connection and load schemas if connected
      newExpandedConnections.add(connectionId)

      if (isConnected && selectedConnection?.id === connectionId) {
        loadSchemas(connectionId)
      }
    }

    setExpandedConnections(newExpandedConnections)
  }

  const toggleSchema = async (connectionId: string, schemaName: string) => {
    // Get or create the set of expanded schemas for this connection
    const connectionSchemas = expandedSchemas.get(connectionId) || new Set<string>()
    const newConnectionSchemas = new Set(connectionSchemas)

    if (newConnectionSchemas.has(schemaName)) {
      // Collapse schema
      newConnectionSchemas.delete(schemaName)
    } else {
      // Expand schema and load tables if not already loaded
      newConnectionSchemas.add(schemaName)

      const schemaKey = `${connectionId}:${schemaName}`
      if (!tablesMap.has(schemaKey)) {
        loadTables(connectionId, schemaName)
      }
    }

    // Update the map with the new set
    const newExpandedSchemas = new Map(expandedSchemas)
    newExpandedSchemas.set(connectionId, newConnectionSchemas)
    setExpandedSchemas(newExpandedSchemas)
  }

  const loadSchemas = async (connectionId: string) => {
    if (!isConnected || selectedConnection?.id !== connectionId) return

    // Add to loading set
    setLoadingSchemas((prev) => new Set(prev).add(connectionId))
    setError(null)

    try {
      const schemaNames = await postgresqlService.getSchemas()

      // Update schemas map
      const newSchemasMap = new Map(schemasMap)
      newSchemasMap.set(connectionId, schemaNames)
      setSchemasMap(newSchemasMap)
    } catch (err) {
      setError(`Failed to load schemas: ${(err as Error).message}`)
      console.error('Error loading schemas:', err)
    } finally {
      // Remove from loading set
      setLoadingSchemas((prev) => {
        const newSet = new Set(prev)
        newSet.delete(connectionId)
        return newSet
      })
    }
  }

  const loadTables = async (connectionId: string, schemaName: string) => {
    if (!isConnected || selectedConnection?.id !== connectionId) return

    const schemaKey = `${connectionId}:${schemaName}`

    // Add to loading set
    setLoadingTables((prev) => new Set(prev).add(schemaKey))

    try {
      const tables = await postgresqlService.getTables(schemaName)

      // Update tables map
      const newTablesMap = new Map(tablesMap)
      newTablesMap.set(schemaKey, tables)
      setTablesMap(newTablesMap)
    } catch (err) {
      setError(`Failed to load tables for schema ${schemaName}: ${(err as Error).message}`)
      console.error(`Error loading tables for schema ${schemaName}:`, err)
    } finally {
      // Remove from loading set
      setLoadingTables((prev) => {
        const newSet = new Set(prev)
        newSet.delete(schemaKey)
        return newSet
      })
    }
  }

  const refreshConnection = async (connectionId: string) => {
    if (!isConnected || selectedConnection?.id !== connectionId) return

    // Clear existing data
    const newSchemasMap = new Map(schemasMap)
    newSchemasMap.delete(connectionId)
    setSchemasMap(newSchemasMap)

    // Clear tables for this connection
    const newTablesMap = new Map(tablesMap)
    for (const key of Array.from(tablesMap.keys())) {
      if (key.startsWith(`${connectionId}:`)) {
        newTablesMap.delete(key)
      }
    }
    setTablesMap(newTablesMap)

    // Load schemas again
    loadSchemas(connectionId)
  }

  const viewTableData = async (schema: string, table: string) => {
    // Execute a SELECT query to view the table data
    const query = `SELECT * FROM "${schema}"."${table}" LIMIT 100`
    try {
      await executeQuery(query)
    } catch (err) {
      setError(`Failed to query table: ${(err as Error).message}`)
    }
  }

  // Filter connections based on search query
  const filteredConnections = connections.filter(
    (conn) =>
      conn.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conn.host.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conn.database.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Sort connections to show most recently used first
  const sortedConnections = [...filteredConnections].sort((a, b) => {
    // If one is selected, it should come first
    if (a.id === selectedConnection?.id) return -1
    if (b.id === selectedConnection?.id) return 1

    // Otherwise sort by lastUsed timestamp if available
    const aLastUsed = (a as any).lastUsed || '0'
    const bLastUsed = (b as any).lastUsed || '0'
    return bLastUsed.localeCompare(aLastUsed)
  })

  return (
    <div className="h-full flex flex-col bg-gray-50 w-72 border-r">
      <div className="p-3 border-b bg-blue-600 text-white">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Database size={20} /> PostgreSQL Explorer
        </h2>
      </div>

      <div className="p-3 border-b">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search connections, schemas, tables..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded text-sm"
          />
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="w-full mt-2">
          <PlusCircle size={16} className="mr-2" />
          New Connection
        </Button>
      </div>

      {error && (
        <div className="mx-3 mt-2 p-2 text-sm bg-red-50 text-red-700 rounded border border-red-200 flex items-start">
          <AlertCircle size={14} className="mr-1 mt-0.5 flex-shrink-0" />
          <div className="flex-1">{error}</div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-auto p-3">
        {sortedConnections.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchQuery ? (
              <>
                <Search className="mx-auto mb-2 opacity-50" size={32} />
                <p>No connections match your search</p>
              </>
            ) : (
              <>
                <Database className="mx-auto mb-2 opacity-50" size={32} />
                <p>No connections saved</p>
                <p className="text-sm">Click the + button to add one</p>
              </>
            )}
          </div>
        ) : (
          <ul className="space-y-1">
            {sortedConnections.map((connection) => (
              <li key={connection.id} className="rounded-md overflow-hidden">
                {/* Connection header */}
                <div
                  className={`flex items-center p-2 cursor-pointer hover:bg-gray-100 ${
                    selectedConnection?.id === connection.id ? 'bg-blue-50 border-l-4 border-blue-500 pl-1.5' : ''
                  }`}
                >
                  <button
                    className="mr-1 p-0.5 rounded hover:bg-gray-200"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleConnection(connection.id!)
                    }}
                  >
                    {expandedConnections.has(connection.id!) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>

                  <div className="flex-1 flex items-center gap-1.5 truncate" onClick={() => handleConnect(connection)}>
                    <Server size={16} className="text-gray-600" />
                    <span className="font-medium truncate">{connection.name}</span>

                    {selectedConnection?.id === connection.id &&
                      (isConnecting ? (
                        <RefreshCw size={12} className="animate-spin text-blue-500" />
                      ) : isConnected ? (
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      ) : null)}
                  </div>

                  <div className="flex">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEdit(connection)
                      }}
                      title="Edit connection"
                      className="h-6 w-6"
                    >
                      <Edit size={12} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(connection.id!)
                      }}
                      title="Delete connection"
                      className="h-6 w-6 text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>

                {/* Delete confirmation */}
                {showDeleteConfirm === connection.id && (
                  <div className="p-2 bg-red-50 border-t border-b border-red-200">
                    <p className="text-xs text-red-700 mb-2">Are you sure you want to delete this connection?</p>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={cancelDelete} className="h-6 text-xs">
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => confirmDelete(connection.id!)}
                        className="h-6 text-xs"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                )}

                {/* Connection details and schemas */}
                {expandedConnections.has(connection.id!) && (
                  <div className="ml-6 mt-1">
                    {/* Connection details */}
                    <div className="text-xs text-gray-500 mb-2 pl-2">
                      <div>
                        {connection.username}@{connection.host}:{connection.port}
                      </div>
                      <div>Database: {connection.database}</div>
                    </div>

                    {/* Connection actions */}
                    <div className="flex gap-1 mb-2">
                      <Button
                        size="sm"
                        variant={selectedConnection?.id === connection.id && isConnected ? 'destructive' : 'default'}
                        className="h-7 text-xs flex-1"
                        onClick={() => handleConnect(connection)}
                        disabled={isConnecting}
                      >
                        {isConnecting && selectedConnection?.id === connection.id ? (
                          <>
                            <RefreshCw size={12} className="mr-1 animate-spin" /> Connecting...
                          </>
                        ) : selectedConnection?.id === connection.id && isConnected ? (
                          <>
                            <Power size={12} className="mr-1" /> Disconnect
                          </>
                        ) : (
                          <>
                            <Database size={12} className="mr-1" /> Connect
                          </>
                        )}
                      </Button>

                      {selectedConnection?.id === connection.id && isConnected && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0"
                          onClick={() => refreshConnection(connection.id!)}
                          disabled={loadingSchemas.has(connection.id!)}
                          title="Refresh schemas"
                        >
                          <RefreshCw size={12} className={loadingSchemas.has(connection.id!) ? 'animate-spin' : ''} />
                        </Button>
                      )}
                    </div>

                    {/* Schemas list */}
                    {selectedConnection?.id === connection.id && isConnected ? (
                      loadingSchemas.has(connection.id!) ? (
                        <div className="py-2 text-center text-xs text-gray-500">
                          <RefreshCw size={14} className="animate-spin mx-auto mb-1" />
                          <p>Loading schemas...</p>
                        </div>
                      ) : schemasMap.has(connection.id!) && schemasMap.get(connection.id!)!.length > 0 ? (
                        <ul className="space-y-0.5">
                          {schemasMap
                            .get(connection.id!)!
                            .filter(
                              (schema) => !searchQuery || schema.toLowerCase().includes(searchQuery.toLowerCase())
                            )
                            .map((schema) => (
                              <li key={schema} className="text-sm">
                                <div
                                  className="flex items-center p-1 rounded hover:bg-gray-100 cursor-pointer"
                                  onClick={() => toggleSchema(connection.id!, schema)}
                                >
                                  {expandedSchemas.get(connection.id!)?.has(schema) ? (
                                    <ChevronDown size={12} className="mr-1 text-gray-500" />
                                  ) : (
                                    <ChevronRight size={12} className="mr-1 text-gray-500" />
                                  )}
                                  <Database size={12} className="mr-1 text-blue-500" />
                                  <span className="truncate">{schema}</span>
                                </div>

                                {/* Tables list */}
                                {expandedSchemas.get(connection.id!)?.has(schema) && (
                                  <ul className="ml-5 mt-0.5 space-y-0.5">
                                    {loadingTables.has(`${connection.id!}:${schema}`) ? (
                                      <li className="text-xs text-gray-500 py-1 pl-1">
                                        <RefreshCw size={10} className="inline-block animate-spin mr-1" />
                                        Loading tables...
                                      </li>
                                    ) : tablesMap.has(`${connection.id!}:${schema}`) ? (
                                      tablesMap
                                        .get(`${connection.id!}:${schema}`)!
                                        .filter(
                                          (table) =>
                                            !searchQuery || table.name.toLowerCase().includes(searchQuery.toLowerCase())
                                        )
                                        .map((table) => (
                                          <li key={table.name}>
                                            <div
                                              className="flex items-center p-1 rounded hover:bg-gray-100 cursor-pointer group"
                                              onClick={() => viewTableData(schema, table.name)}
                                            >
                                              {table.type === 'table' ? (
                                                <Table size={12} className="mr-1 text-green-600" />
                                              ) : table.type === 'view' ? (
                                                <Eye size={12} className="mr-1 text-purple-600" />
                                              ) : (
                                                <FileIcon size={12} className="mr-1 text-amber-600" />
                                              )}
                                              <span className="truncate text-xs">{table.name}</span>
                                            </div>
                                          </li>
                                        ))
                                    ) : (
                                      <li className="text-xs text-gray-500 italic py-1 pl-1">No tables found</li>
                                    )}
                                  </ul>
                                )}
                              </li>
                            ))}
                        </ul>
                      ) : (
                        <div className="py-2 text-center text-xs text-gray-500">
                          <p>No schemas found</p>
                        </div>
                      )
                    ) : (
                      <div className="py-2 text-center text-xs text-gray-500">
                        <p>Connect to view database objects</p>
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* <div className="flex justify-between items-center p-2 bg-gray-100 border-t text-xs text-gray-600">
        <div className="flex items-center">
          {isConnected ? (
            <>
              <div className="text-green-500 mr-1.5">●</div>
              <span>Connected to {selectedConnection?.name}</span>
            </>
          ) : (
            <>
              <div className="text-red-500 mr-1.5">●</div>
              <span>Not connected</span>
            </>
          )}
        </div>
        <div className="text-xs">
          {connections.length} connection{connections.length !== 1 ? 's' : ''}
        </div>
      </div> */}

      {/* Add Connection Dialog */}
      <ConnectionDialog isOpen={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)} />

      {/* Edit Connection Dialog */}
      <ConnectionDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        initialConnection={editingConnection}
      />
    </div>
  )
}
