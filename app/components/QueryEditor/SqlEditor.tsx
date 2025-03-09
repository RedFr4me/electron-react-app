import React, { useRef, useEffect, useState } from 'react'
import Editor, { Monaco, useMonaco } from '@monaco-editor/react'
import { useDatabaseStore } from '../../store'
import { Button } from '../../components/ui/button'
import {
  Play,
  Save,
  Trash,
  Clock,
  Database,
  Split,
  Maximize2,
  Minimize2,
  FileText,
  Check,
  AlertCircle,
  DownloadCloud,
} from 'lucide-react'

export function SqlEditor() {
  const {
    currentQuery,
    setCurrentQuery,
    executeQuery,
    isExecutingQuery,
    isConnected,
    queryHistory,
    queryResult,
    clearQueryResult,
    queryError,
  } = useDatabaseStore()

  const editorRef = useRef<any>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [unsavedChanges, setUnsavedChanges] = useState(false)
  const [editorError, setEditorError] = useState<string | null>(null)

  // Track changes to detect unsaved work
  useEffect(() => {
    // Some delay to avoid initial load triggering this
    const timer = setTimeout(() => {
      setUnsavedChanges(true)
    }, 500)

    return () => clearTimeout(timer)
  }, [currentQuery])

  // Reset unsaved changes when a query is executed
  useEffect(() => {
    if (queryResult) {
      setUnsavedChanges(false)
    }
  }, [queryResult])

  // Handle editor mount
  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor

    // Set up SQL language features if needed
    setupSqlLanguage(monaco)

    // Focus editor
    editor.focus()

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      handleExecuteQuery()
    })

    // Clear any editor errors
    setEditorError(null)
  }

  // Handle editor error
  const handleEditorWillMount = (monaco: Monaco) => {
    // Configure Monaco to use local paths
    // This helps avoid CDN loading issues with CSP
    // (Electron restricts loading external scripts)
    monaco.editor.defineTheme('sqlTheme', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {},
    })
  }

  // Setup SQL language features
  const setupSqlLanguage = (monaco: Monaco) => {
    // Add custom SQL keywords if needed
    monaco.languages.registerCompletionItemProvider('sql', {
      provideCompletionItems: () => {
        const suggestions = [
          {
            label: 'SELECT',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'SELECT ',
            documentation: 'SELECT statement',
          },
          {
            label: 'FROM',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'FROM ',
            documentation: 'FROM clause',
          },
          {
            label: 'WHERE',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'WHERE ',
            documentation: 'WHERE clause',
          },
          {
            label: 'GROUP BY',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'GROUP BY ',
            documentation: 'GROUP BY clause',
          },
          {
            label: 'ORDER BY',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'ORDER BY ',
            documentation: 'ORDER BY clause',
          },
          {
            label: 'LIMIT',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'LIMIT ',
            documentation: 'LIMIT clause',
          },
          {
            label: 'JOIN',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'JOIN ',
            documentation: 'JOIN clause',
          },
          {
            label: 'INNER JOIN',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'INNER JOIN ',
            documentation: 'INNER JOIN clause',
          },
          {
            label: 'LEFT JOIN',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'LEFT JOIN ',
            documentation: 'LEFT JOIN clause',
          },
          {
            label: 'RIGHT JOIN',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'RIGHT JOIN ',
            documentation: 'RIGHT JOIN clause',
          },
        ]

        return { suggestions }
      },
    })
  }

  const handleExecuteQuery = async () => {
    if (!currentQuery.trim()) return
    await executeQuery()
  }

  const handleClearQuery = () => {
    if (currentQuery.trim() && unsavedChanges) {
      if (!confirm('Are you sure you want to clear your query? Any unsaved changes will be lost.')) {
        return
      }
    }

    setCurrentQuery('')
    clearQueryResult()
    setUnsavedChanges(false)

    // Focus editor
    if (editorRef.current) {
      editorRef.current.focus()
    }
  }

  const insertQueryFromHistory = (query: string) => {
    // If there are unsaved changes, ask for confirmation
    if (currentQuery.trim() && unsavedChanges) {
      if (!confirm('Are you sure you want to replace your current query? Any unsaved changes will be lost.')) {
        return
      }
    }

    setCurrentQuery(query)
    setUnsavedChanges(false)

    // Focus editor
    if (editorRef.current) {
      editorRef.current.focus()
    }
  }

  const toggleHistoryPanel = () => {
    setShowHistory(!showHistory)
  }

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen)
  }

  const saveQueryAsFile = () => {
    if (!currentQuery.trim()) return

    const blob = new Blob([currentQuery], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'query.sql'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    setUnsavedChanges(false)
  }

  // Simple query editor if Monaco fails to load
  const renderSimpleEditor = () => {
    return (
      <div className="flex-1 h-full">
        <textarea
          className="w-full h-full p-4 font-mono text-sm bg-gray-900 text-white"
          value={currentQuery}
          onChange={(e) => setCurrentQuery(e.target.value)}
          placeholder="-- Write your SQL query here"
        />
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-full ${isFullScreen ? 'fixed inset-0 z-50 bg-white' : ''}`}>
      <div className="editor-toolbar">
        <Button
          onClick={handleExecuteQuery}
          disabled={!isConnected || isExecutingQuery}
          className="gap-1 h-8"
          title="Execute query (Ctrl+Enter)"
        >
          <Play size={14} />
          {isExecutingQuery ? 'Executing...' : 'Execute'}
        </Button>

        <Button variant="outline" onClick={handleClearQuery} className="gap-1 h-8" title="Clear query editor">
          <Trash size={14} />
          Clear
        </Button>

        <Button
          variant="outline"
          onClick={saveQueryAsFile}
          className="gap-1 h-8"
          disabled={!currentQuery.trim()}
          title="Save query as SQL file"
        >
          <DownloadCloud size={14} />
          Save
        </Button>

        <div className="flex-1"></div>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleHistoryPanel}
          className={`h-8 w-8 ${showHistory ? 'bg-blue-50' : ''}`}
          title="Show/hide query history"
        >
          <Clock size={14} />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleFullScreen}
          className="h-8 w-8"
          title={isFullScreen ? 'Exit full screen' : 'Full screen'}
        >
          {isFullScreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </Button>

        {!isConnected && (
          <div className="flex items-center gap-1 bg-amber-50 text-amber-700 text-xs px-2 py-1 rounded-md ml-2">
            <Database size={12} /> Connect to a database to execute queries
          </div>
        )}

        {isConnected && (
          <div className="flex items-center gap-1 bg-green-50 text-green-700 text-xs px-2 py-1 rounded-md ml-2">
            <Check size={12} /> Connected to database
          </div>
        )}
      </div>

      {queryError && (
        <div className="bg-red-50 border-b border-red-200 px-3 py-2 text-sm text-red-800 flex items-start">
          <AlertCircle size={14} className="mt-0.5 mr-1 flex-shrink-0" />
          <div>
            <p className="font-medium">Error executing query</p>
            <p className="mt-1">{queryError}</p>
          </div>
        </div>
      )}

      {editorError && (
        <div className="bg-amber-50 border-b border-amber-200 px-3 py-2 text-sm text-amber-800 flex items-start">
          <AlertCircle size={14} className="mt-0.5 mr-1 flex-shrink-0" />
          <div>
            <p className="font-medium">Editor Warning</p>
            <p className="mt-1">{editorError}</p>
          </div>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        <div className={`flex-1 h-full ${unsavedChanges ? 'border-t-2 border-t-amber-400' : ''}`}>
          <Editor
            height="100%"
            defaultLanguage="sql"
            theme="sqlTheme"
            value={currentQuery}
            onChange={(value) => setCurrentQuery(value || '')}
            onMount={handleEditorDidMount}
            beforeMount={handleEditorWillMount}
            options={{
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              automaticLayout: true,
              lineNumbers: 'on',
              tabSize: 2,
              renderLineHighlight: 'all',
              fontFamily: 'Menlo, Monaco, "Courier New", monospace',
              fontSize: 13,
              padding: { top: 10 },
            }}
            loading="Loading SQL editor..."
            onError={(error) => {
              console.error('Monaco Editor failed to load:', error)
              setEditorError('Monaco Editor failed to load. Using simple editor instead.')
            }}
          />
        </div>

        {showHistory && queryHistory.length > 0 && (
          <div className="w-72 border-l overflow-auto">
            <div className="font-medium text-sm p-3 flex items-center gap-1 text-gray-700 bg-gray-50 sticky top-0 border-b">
              <Clock size={14} /> Query History
            </div>
            <div className="divide-y">
              {queryHistory.map((item, index) => (
                <div
                  key={index}
                  className="p-3 hover:bg-gray-50 cursor-pointer"
                  onClick={() => insertQueryFromHistory(item.query)}
                >
                  <div className="line-clamp-2 font-mono text-xs bg-gray-50 p-2 rounded">{item.query}</div>
                  <div className="text-xs text-gray-500 mt-2 flex items-center">
                    <FileText size={10} className="mr-1" />
                    {new Date(item.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {isFullScreen && (
        <div className="status-bar">
          <div className="status-indicator">
            <span className="text-xs">{unsavedChanges ? 'Unsaved changes' : 'No unsaved changes'}</span>
          </div>
        </div>
      )}
    </div>
  )
}
