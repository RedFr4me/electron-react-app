import React from 'react'
import { SqlEditor } from './SqlEditor'
import { QueryResults } from './QueryResults'

export function QueryPanel() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0">
        <SqlEditor />
      </div>
      <div className="h-1/2 min-h-0 border-t">
        <QueryResults />
      </div>
    </div>
  )
}
