import React, { useState, useEffect } from 'react'
import { useDatabaseStore } from '../../store'
import {
  ChevronRight,
  ChevronDown,
  Database,
  Table,
  Eye,
  FileIcon,
  RefreshCw,
  Search,
  AlertCircle,
  Info,
  Columns,
  SquareCode,
  Copy,
} from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'

interface SchemaTreeItem {
  name: string
  type: 'schema'
  expanded: boolean
  loading: boolean
  items: TableTreeItem[]
}

interface TableTreeItem {
  name: string
  schema: string
  type: 'table' | 'view' | 'materialized_view'
}

interface ContextMenuProps {
  x: number
  y: number
  onClose: () => void
  schema: string
  table: string
  type: 'table' | 'view' | 'materialized_view'
  onViewData: () => void
  onViewColumns: () => void
  onGenerateSelectQuery: () => void
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  onClose,
  schema,
  table,
  type,
  onViewData,
  onViewColumns,
  onGenerateSelectQuery,
}) => {
  // Close the context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => onClose()
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [onClose])

  return (
    <div
      className="fixed bg-white rounded-md shadow-lg border z-50 py-1 w-56"
      style={{ top: y, left: x }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-3 py-2 border-b text-xs font-semibold text-gray-500">
        {schema}.{table}
      </div>
      <ul className="py-1">
        <li>
          <button
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 flex items-center gap-2"
            onClick={() => {
              onViewData()
              onClose()
            }}
          >
            <Eye size={14} className="text-blue-500" /> View Data
          </button>
        </li>
        <li>
          <button
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 flex items-center gap-2"
            onClick={() => {
              onViewColumns()
              onClose()
            }}
          >
            <Columns size={14} className="text-blue-500" /> View Columns
          </button>
        </li>
        <li>
          <button
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 flex items-center gap-2"
            onClick={() => {
              onGenerateSelectQuery()
              onClose()
            }}
          >
            <SquareCode size={14} className="text-blue-500" /> Generate SELECT Query
          </button>
        </li>
        <li>
          <button
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 flex items-center gap-2"
            onClick={() => {
              navigator.clipboard.writeText(`"${schema}"."${table}"`)
              onClose()
            }}
          >
            <Copy size={14} className="text-blue-500" /> Copy Full Name
          </button>
        </li>
      </ul>
    </div>
  )
}

export function SchemaExplorer() {
  const { postgresqlService, isConnected, selectedConnection, executeQuery } = useDatabaseStore()

  const [schemas, setSchemas] = useState<SchemaTreeItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [contextMenu, setContextMenu] = useState<{
    show: boolean
    x: number
    y: number
    schema: string
    table: string
    type: 'table' | 'view' | 'materialized_view'
  } | null>(null)

  // Load schemas when connection changes
  useEffect(() => {
    if (isConnected && selectedConnection) {
      loadSchemas()
    } else {
      setSchemas([])
      setError(null)
    }
  }, [isConnected, selectedConnection])

  const loadSchemas = async () => {
    setLoading(true)
    setError(null)

    try {
      const schemaNames = await postgresqlService.getSchemas()

      const schemaItems: SchemaTreeItem[] = schemaNames.map((name) => ({
        name,
        type: 'schema',
        expanded: false,
        loading: false,
        items: [],
      }))

      setSchemas(schemaItems)
    } catch (err) {
      setError(`Failed to load schemas: ${(err as Error).message}`)
      console.error('Error loading schemas:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadTables = async (schemaName: string) => {
    // Find schema in state
    const schemaIndex = schemas.findIndex((s) => s.name === schemaName)
    if (schemaIndex === -1) return

    // Update schema to show it's loading
    const updatedSchemas = [...schemas]
    updatedSchemas[schemaIndex].loading = true
    setSchemas(updatedSchemas)

    try {
      const tables = await postgresqlService.getTables(schemaName)

      // Update schema with tables and add schema name to each table
      const newSchemas = [...schemas]
      newSchemas[schemaIndex].items = tables.map((table) => ({
        ...table,
        schema: schemaName,
      }))
      newSchemas[schemaIndex].loading = false
      setSchemas(newSchemas)
    } catch (err) {
      setError(`Failed to load tables for schema ${schemaName}: ${(err as Error).message}`)
      console.error(`Error loading tables for schema ${schemaName}:`, err)

      // Reset loading state
      const newSchemas = [...schemas]
      newSchemas[schemaIndex].loading = false
      setSchemas(newSchemas)
    }
  }

  const toggleSchema = async (schemaName: string) => {
    const schemaIndex = schemas.findIndex((s) => s.name === schemaName)
    if (schemaIndex === -1) return

    const updatedSchemas = [...schemas]
    const schema = updatedSchemas[schemaIndex]

    // Toggle expanded state
    schema.expanded = !schema.expanded

    // If expanding and no items loaded yet, load them
    if (schema.expanded && schema.items.length === 0) {
      await loadTables(schemaName)
    } else {
      setSchemas(updatedSchemas)
    }
  }

  const refreshSchemas = () => {
    loadSchemas()
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

  const viewTableColumns = async (schema: string, table: string) => {
    try {
      // First, get the columns
      const columns = await postgresqlService.getTableColumns(schema, table)

      // Format them as a query result to display
      const rows = columns.map((col) => ({
        column_name: col.name,
        data_type: col.dataType,
        nullable: col.nullable ? 'YES' : 'NO',
        primary_key: col.isPrimaryKey ? 'YES' : 'NO',
        default_value: col.default || null,
      }))

      // Execute a fake query to display the results
      const query = `-- Columns for "${schema}"."${table}"\nSELECT column_name, data_type, nullable, primary_key, default_value FROM information_schema.columns WHERE table_schema = '${schema}' AND table_name = '${table}'`

      // This is a bit of a hack, but we're simulating a query result
      await executeQuery(query)
    } catch (err) {
      setError(`Failed to get table columns: ${(err as Error).message}`)
    }
  }

  const generateSelectQuery = async (schema: string, table: string) => {
    try {
      // Get the columns first
      const columns = await postgresqlService.getTableColumns(schema, table)

      // Generate a SELECT query with all columns
      const columnsList = columns.map((col) => `"${col.name}"`).join(', ')
      const query = `SELECT ${columnsList}\nFROM "${schema}"."${table}"\nLIMIT 100;`

      // Set this as the current query
      await executeQuery(query)
    } catch (err) {
      setError(`Failed to generate query: ${(err as Error).message}`)
    }
  }

  const handleTableContextMenu = (
    e: React.MouseEvent,
    schema: string,
    table: string,
    type: 'table' | 'view' | 'materialized_view'
  ) => {
    e.preventDefault()
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      schema,
      table,
      type,
    })
  }

  const closeContextMenu = () => {
    setContextMenu(null)
  }

  // Filter schemas and tables based on search
  const filteredSchemas = schemas
    .map((schema) => {
      // If search is empty, return all schemas
      if (!searchQuery) return schema

      // Check if schema name matches search
      const schemaMatches = schema.name.toLowerCase().includes(searchQuery.toLowerCase())

      // Filter tables that match search
      const filteredTables = schema.items.filter((table) =>
        table.name.toLowerCase().includes(searchQuery.toLowerCase())
      )

      // Return schema with filtered tables if schema matches or has matching tables
      if (schemaMatches || filteredTables.length > 0) {
        return {
          ...schema,
          items: filteredTables,
        }
      }

      // If neither schema nor any tables match, return null
      return null
    })
    .filter(Boolean) as SchemaTreeItem[] // Remove nulls

  if (!isConnected) {
    return (
      <div className="h-full flex items-center justify-center p-4 text-gray-500">
        <div className="text-center">
          <Database className="mx-auto mb-2 opacity-50" size={32} />
          <p>Connect to a database to explore schemas and tables</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col border-r bg-gray-50">
      <div className="p-3 border-b flex items-center justify-between bg-white">
        <h3 className="font-medium flex items-center gap-1 text-blue-600">
          <Database size={16} className="text-blue-600" /> Database Explorer
        </h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={refreshSchemas}
          disabled={loading}
          title="Refresh schemas"
          className="h-7 w-7"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </Button>
      </div>

      <div className="p-2 border-b">
        <div className="relative">
          <Search size={14} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search schemas and tables..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 py-1 h-8 text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-1">
        {error && (
          <div className="flex items-start gap-2 text-red-600 text-sm p-2 mb-2 bg-red-50 rounded">
            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {loading ? (
          <div className="py-4 text-center text-gray-500">
            <RefreshCw size={18} className="animate-spin mx-auto mb-2" />
            <p className="text-sm">Loading schemas...</p>
          </div>
        ) : filteredSchemas.length === 0 ? (
          <div className="py-4 text-center text-gray-500">
            {searchQuery ? (
              <>
                <Search size={18} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No results match your search</p>
              </>
            ) : (
              <>
                <Info size={18} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No schemas found</p>
              </>
            )}
          </div>
        ) : (
          <ul className="space-y-0.5">
            {filteredSchemas.map((schema) => (
              <li key={schema.name} className="select-none">
                <div
                  className="flex items-center p-1.5 rounded cursor-pointer transition-colors duration-200 hover:bg-blue-50"
                  onClick={() => toggleSchema(schema.name)}
                >
                  {schema.expanded ? (
                    <ChevronDown size={14} className="mr-2 text-gray-600" />
                  ) : (
                    <ChevronRight size={14} className="mr-2 text-gray-600" />
                  )}
                  <Database size={14} className="mr-1.5 text-blue-600" />
                  <span className="flex-1 truncate text-sm">{schema.name}</span>
                  {schema.loading && <RefreshCw size={12} className="animate-spin ml-1 text-gray-400" />}
                </div>

                {schema.expanded && (
                  <ul className="ml-6 mt-0.5 space-y-0.5">
                    {schema.items.map((item) => (
                      <li key={`${schema.name}.${item.name}`}>
                        <div
                          className="flex items-center p-1.5 rounded cursor-pointer transition-colors duration-200 hover:bg-blue-50 group"
                          onClick={() => viewTableData(schema.name, item.name)}
                          onContextMenu={(e) => handleTableContextMenu(e, schema.name, item.name, item.type)}
                        >
                          {item.type === 'table' ? (
                            <Table size={14} className="mr-1.5 text-green-600" />
                          ) : item.type === 'view' ? (
                            <Eye size={14} className="mr-1.5 text-purple-600" />
                          ) : (
                            <FileIcon size={14} className="mr-1.5 text-amber-600" />
                          )}
                          <span className="flex-1 truncate text-sm">{item.name}</span>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 h-6 w-6"
                            title="View data"
                            onClick={(e) => {
                              e.stopPropagation()
                              viewTableData(schema.name, item.name)
                            }}
                          >
                            <Eye size={12} />
                          </Button>
                        </div>
                      </li>
                    ))}

                    {schema.expanded && schema.items.length === 0 && !schema.loading && (
                      <li className="px-2 py-1 text-xs text-gray-500 italic">No tables or views found</li>
                    )}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && contextMenu.show && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          schema={contextMenu.schema}
          table={contextMenu.table}
          type={contextMenu.type}
          onViewData={() => viewTableData(contextMenu.schema, contextMenu.table)}
          onViewColumns={() => viewTableColumns(contextMenu.schema, contextMenu.table)}
          onGenerateSelectQuery={() => generateSelectQuery(contextMenu.schema, contextMenu.table)}
        />
      )}
    </div>
  )
}
