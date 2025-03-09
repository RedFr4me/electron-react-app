import React, { useMemo, useState } from 'react'
import { useDatabaseStore } from '../../store'
import {
  Clock,
  Check,
  AlertCircle,
  Table as TableIcon,
  Download,
  Copy,
  ChevronLeft,
  ChevronRight,
  Search,
  Info,
  Trash2,
  RefreshCw,
} from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'

export function QueryResults() {
  const { queryResult, queryError, isExecutingQuery, clearQueryResult } = useDatabaseStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(100)
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

  // Format duration in milliseconds to a readable format
  const formatDuration = (ms: number) => {
    if (ms < 1000) {
      return `${ms}ms`
    } else {
      return `${(ms / 1000).toFixed(2)}s`
    }
  }

  // Calculate total records based on rowCount or rows length
  const totalRecords = useMemo(() => {
    if (!queryResult) return 0

    // Use rowCount if available, otherwise fallback to rows.length
    return queryResult.rowCount >= 0 ? queryResult.rowCount : queryResult.rows.length
  }, [queryResult])

  // Filter and paginate rows based on search term and pagination settings
  const displayedRows = useMemo(() => {
    if (!queryResult?.rows) return []

    let filteredRows = queryResult.rows

    // Apply search filtering if there's a search term
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase()
      filteredRows = queryResult.rows.filter((row) => {
        return Object.values(row).some((value) => {
          if (value === null || value === undefined) return false
          return String(value).toLowerCase().includes(lowerSearchTerm)
        })
      })
    }

    // Calculate pagination
    const startIndex = (currentPage - 1) * rowsPerPage
    const endIndex = startIndex + rowsPerPage

    return filteredRows.slice(startIndex, endIndex)
  }, [queryResult, searchTerm, currentPage, rowsPerPage])

  // Calculate total pages for pagination
  const totalPages = useMemo(() => {
    if (!queryResult?.rows) return 1

    let filteredRowCount = queryResult.rows.length

    // Adjust count if search is active
    if (searchTerm) {
      filteredRowCount = displayedRows.length
    }

    return Math.max(1, Math.ceil(filteredRowCount / rowsPerPage))
  }, [queryResult, displayedRows, rowsPerPage, searchTerm])

  // Handle page navigation
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return
    setCurrentPage(newPage)
    // Reset expanded rows when changing pages
    setExpandedRows(new Set())
  }

  // Toggle row expansion
  const toggleRowExpansion = (rowIndex: number) => {
    const newExpandedRows = new Set(expandedRows)
    if (newExpandedRows.has(rowIndex)) {
      newExpandedRows.delete(rowIndex)
    } else {
      newExpandedRows.add(rowIndex)
    }
    setExpandedRows(newExpandedRows)
  }

  // Handle exporting results to CSV
  const exportToCsv = () => {
    if (!queryResult?.rows || !queryResult.fields) return

    // Create CSV header
    const headers = queryResult.fields.map((field) => `"${field.name}"`).join(',')

    // Create CSV rows
    const rows = queryResult.rows
      .map((row) => {
        return queryResult.fields
          .map((field) => {
            const value = row[field.name]

            // Handle null, undefined, and special cases
            if (value === null || value === undefined) return ''
            if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`
            if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`

            return value
          })
          .join(',')
      })
      .join('\n')

    // Combine header and rows
    const csv = `${headers}\n${rows}`

    // Create and download the CSV file
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `query_results_${new Date().toISOString().replace(/:/g, '-')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Copy a specific cell value to clipboard
  const copyToClipboard = (value: any) => {
    if (value === null || value === undefined) {
      navigator.clipboard.writeText('')
    } else if (typeof value === 'object') {
      navigator.clipboard.writeText(JSON.stringify(value, null, 2))
    } else {
      navigator.clipboard.writeText(String(value))
    }
  }

  // Reset search and pagination
  const handleClearSearch = () => {
    setSearchTerm('')
    setCurrentPage(1)
  }

  // If query is executing, show loading state
  if (isExecutingQuery) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-2 text-blue-500" size={32} />
          <p className="text-gray-600">Executing query...</p>
        </div>
      </div>
    )
  }

  // If there's an error, show error message
  if (queryError) {
    return (
      <div className="h-full overflow-auto p-4">
        <div className="bg-red-50 border border-red-300 rounded p-4 mb-4">
          <div className="flex items-start">
            <AlertCircle className="text-red-500 mr-2 mt-0.5" size={20} />
            <div>
              <h3 className="font-semibold text-red-800">Query Error</h3>
              <pre className="mt-2 whitespace-pre-wrap text-sm font-mono bg-red-100 p-2 rounded overflow-auto max-h-80">
                {queryError}
              </pre>
            </div>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={() => clearQueryResult()} className="mt-2">
          <Trash2 size={14} className="mr-1" /> Clear Error
        </Button>
      </div>
    )
  }

  // If no query result, show placeholder
  if (!queryResult) {
    return (
      <div className="h-full flex items-center justify-center p-4 text-gray-500">
        <div className="text-center">
          <TableIcon className="mx-auto mb-2 opacity-50" size={32} />
          <p>Execute a query to see results</p>
        </div>
      </div>
    )
  }

  // If query didn't return rows (e.g., for INSERT/UPDATE/DELETE)
  if (!queryResult.fields.length) {
    return (
      <div className="h-full p-4">
        <div className="bg-green-50 border border-green-300 rounded p-4 mb-4">
          <div className="flex">
            <Check className="text-green-500 mr-2" size={20} />
            <div>
              <h3 className="font-semibold text-green-800">Query executed successfully</h3>
              <p className="mt-1">
                {queryResult.command} {queryResult.rowCount > 0 && `affected ${queryResult.rowCount} row(s)`}
              </p>
              <p className="text-sm text-gray-600 mt-1">Completed in {formatDuration(queryResult.duration)}</p>
            </div>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={() => clearQueryResult()} className="mt-2">
          <Trash2 size={14} className="mr-1" /> Clear Result
        </Button>
      </div>
    )
  }

  // Show results table
  return (
    <div className="h-full flex flex-col">
      <div className="p-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-gray-50 border-b">
        <div className="flex items-center">
          <Check className="text-green-500 mr-2" size={16} />
          <span className="text-sm font-medium">
            {queryResult.command} returned {totalRecords} row(s)
          </span>
          <span className="text-xs text-gray-500 ml-2">({formatDuration(queryResult.duration)})</span>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search size={14} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search results..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1) // Reset to first page when searching
              }}
              className="pl-8 h-8 text-sm"
            />
            {searchTerm && (
              <button
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={handleClearSearch}
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>

          <Button variant="outline" size="sm" className="h-8" onClick={exportToCsv} title="Export results to CSV">
            <Download size={14} className="mr-1" />
            Export
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {queryResult.rows.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Info size={20} className="mx-auto mb-2" />
            <p>Query executed successfully, but returned no data</p>
          </div>
        ) : displayedRows.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Search size={20} className="mx-auto mb-2" />
            <p>No results match your search</p>
            <Button variant="link" onClick={handleClearSearch} className="mt-2 h-auto p-0 text-blue-500">
              Clear search
            </Button>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  {queryResult.fields.map((field, index) => (
                    <th key={index} className="whitespace-nowrap">
                      {field.name}
                      <div className="text-xs font-normal text-gray-500">{field.dataType}</div>
                    </th>
                  ))}
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody>
                {displayedRows.map((row, rowIndex) => (
                  <React.Fragment key={rowIndex}>
                    <tr className="hover:bg-blue-50">
                      {queryResult.fields.map((field, cellIndex) => {
                        const value = row[field.name]
                        const isObject = typeof value === 'object' && value !== null

                        return (
                          <td key={cellIndex} className={isObject ? 'cursor-pointer' : ''}>
                            <div className="flex gap-1 items-center">
                              <div
                                className={isObject ? 'underline underline-offset-2 text-blue-600' : ''}
                                onClick={() => isObject && toggleRowExpansion(rowIndex)}
                              >
                                {formatCellValue(value, false)}
                              </div>

                              <button
                                className="opacity-0 group-hover:opacity-100 hover:text-blue-500"
                                onClick={() => copyToClipboard(value)}
                                title="Copy value"
                              >
                                <Copy size={12} />
                              </button>
                            </div>
                          </td>
                        )
                      })}
                      <td>
                        {
                          // Check if row has any object values that could be expanded
                          Object.values(row).some((v) => typeof v === 'object' && v !== null) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => toggleRowExpansion(rowIndex)}
                              title={expandedRows.has(rowIndex) ? 'Collapse row' : 'Expand row'}
                            >
                              {expandedRows.has(rowIndex) ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                            </Button>
                          )
                        }
                      </td>
                    </tr>

                    {expandedRows.has(rowIndex) && (
                      <tr>
                        <td colSpan={queryResult.fields.length + 1} className="bg-gray-50 p-0">
                          <div className="p-4">
                            <h4 className="text-sm font-medium mb-2">Expanded Row Data</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {queryResult.fields.map((field, i) => {
                                const value = row[field.name]
                                const isComplexValue = typeof value === 'object' && value !== null

                                if (!isComplexValue) return null

                                return (
                                  <div key={i} className="bg-white p-3 rounded border">
                                    <div className="font-medium text-sm mb-1">{field.name}</div>
                                    <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-40">
                                      {formatCellValue(value, true)}
                                    </pre>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="border-t p-2 flex items-center justify-between bg-gray-50">
          <div className="text-xs text-gray-500">
            {searchTerm
              ? 'Filtered results'
              : `Showing ${(currentPage - 1) * rowsPerPage + 1}-${Math.min(currentPage * rowsPerPage, totalRecords)} of ${totalRecords}`}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={14} />
            </Button>

            <span className="text-sm px-2">
              Page {currentPage} of {totalPages}
            </span>

            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight size={14} />
            </Button>

            <select
              className="border rounded px-2 py-1 text-sm bg-white"
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value))
                setCurrentPage(1) // Reset to first page when changing page size
              }}
            >
              <option value="10">10 rows</option>
              <option value="25">25 rows</option>
              <option value="50">50 rows</option>
              <option value="100">100 rows</option>
              <option value="250">250 rows</option>
              <option value="500">500 rows</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper function to format cell values for display
function formatCellValue(value: any, expanded: boolean = false): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-gray-400 italic">NULL</span>
  }

  if (typeof value === 'object') {
    if (value instanceof Date) {
      return value.toLocaleString()
    }

    // For JSON objects
    try {
      if (expanded) {
        return JSON.stringify(value, null, 2)
      } else {
        return JSON.stringify(value).substring(0, 50) + (JSON.stringify(value).length > 50 ? '...' : '')
      }
    } catch (e) {
      return '[Complex Object]'
    }
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }

  // For long strings, truncate unless expanded
  if (typeof value === 'string' && value.length > 100 && !expanded) {
    return value.substring(0, 100) + '...'
  }

  return String(value)
}
