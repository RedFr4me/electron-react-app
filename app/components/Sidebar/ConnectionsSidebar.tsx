import React, { useState, useEffect } from 'react'
import { Button } from '../../components/ui/button'
import { useDatabaseStore } from '../../store'
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
  Info,
  Search,
  Clock,
  Check,
  X,
} from 'lucide-react'

export function ConnectionsSidebar() {
  const {
    connections,
    loadConnections,
    deleteConnection,
    connectToDatabase,
    disconnectFromDatabase,
    selectedConnection,
    isConnected,
    isConnecting,
  } = useDatabaseStore()

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingConnection, setEditingConnection] = useState<PostgreSQLConnectionConfig | undefined>(undefined)
  const [searchQuery, setSearchQuery] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  // Load connections on mount
  useEffect(() => {
    loadConnections()
  }, [loadConnections])

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

    if (!result.success) {
      // We'll handle this better with a toast notification in the future
      alert(`Connection failed: ${result.message}`)
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
            placeholder="Search connections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded text-sm"
          />
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="w-full mt-2 bg-amber-400">
          <PlusCircle size={16} className="mr-2" />
          New Connection
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-3 ">
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
          <ul className="space-y-2">
            {sortedConnections.map((connection) => (
              <li
                key={connection.id}
                className={`bg-white rounded-lg shadow transition-shadow duration-300 hover:shadow-md overflow-hidden ${
                  selectedConnection?.id === connection.id ? 'border-l-4 border-blue-500' : ''
                }`}
              >
                {showDeleteConfirm === connection.id ? (
                  <div className="p-3 bg-red-50 border-b">
                    <p className="text-sm text-red-700 mb-2">Are you sure you want to delete this connection?</p>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={cancelDelete} className="bg-gray-200">
                        <X size={14} className="mr-1" /> Cancel
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => confirmDelete(connection.id!)}>
                        <Trash2 size={14} className="mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 border-b flex items-center justify-between">
                    <div className="font-medium truncate flex items-center gap-1">
                      {selectedConnection?.id === connection.id && isConnected ? (
                        <Check size={14} className="text-green-500" />
                      ) : (
                        <Database size={14} />
                      )}
                      {connection.name}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(connection)}
                        title="Edit connection"
                        className="h-7 w-7"
                      >
                        <Edit size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(connection.id!)}
                        title="Delete connection"
                        className="h-7 w-7 text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="p-3 bg-gray-50">
                  <div className="grid grid-cols-[16px,1fr] gap-x-2 gap-y-1 text-xs text-gray-600">
                    <Server size={12} className="mt-1" />
                    <div>
                      <span className="font-medium">
                        {connection.host}:{connection.port}
                      </span>
                      <div className="text-gray-500">
                        {connection.username}@{connection.database}
                      </div>
                    </div>

                    {(connection as any).lastUsed && (
                      <>
                        <Clock size={12} className="mt-1" />
                        <div>
                          <span className="text-gray-500">Last connected:</span>
                          <div className="text-gray-500">{new Date((connection as any).lastUsed).toLocaleString()}</div>
                        </div>
                      </>
                    )}
                  </div>

                  <Button
                    variant={selectedConnection?.id === connection.id && isConnected ? 'destructive' : 'default'}
                    size="sm"
                    className="mt-2 w-full"
                    onClick={() => handleConnect(connection)}
                    disabled={isConnecting}
                  >
                    {isConnecting && selectedConnection?.id === connection.id ? (
                      <>
                        <RefreshCw size={14} className="mr-2 animate-spin" /> Connecting...
                      </>
                    ) : selectedConnection?.id === connection.id && isConnected ? (
                      <>
                        <Power size={14} className="mr-2" /> Disconnect
                      </>
                    ) : (
                      <>
                        <Database size={14} className="mr-2" /> Connect
                      </>
                    )}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

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
