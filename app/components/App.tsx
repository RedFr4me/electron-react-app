import React, { useEffect, useState } from 'react'
import { DatabaseSidebar } from './Sidebar/DatabaseSidebar'
import { QueryPanel } from './QueryEditor'
import '../styles/app.css'

export default function App() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    console.log('App component mounted')

    // Simple way to check if the app is loaded properly
    // In a real app, you might want to check if all required services are initialized
    const timer = setTimeout(() => {
      setIsLoading(false)
      console.log('App initialized')
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <img
            src="../assets/postgresql-logo.png"
            alt="PostgreSQL"
            className="w-16 h-16 mx-auto mb-4"
            onError={(e) => {
              // Fallback to a div with the first letter if image fails to load
              e.currentTarget.style.display = 'none'
              const fallback = document.createElement('div')
              fallback.innerHTML = 'P'
              fallback.className =
                'w-16 h-16 mx-auto mb-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-bold'
              e.currentTarget.parentNode?.insertBefore(fallback, e.currentTarget)
            }}
          />
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium text-lg">Loading PostgreSQL Explorer</p>
          <p className="mt-2 text-gray-500">Initializing database services...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Integrated Database Sidebar with connections and database explorer */}
      <DatabaseSidebar />

      {/* Query Editor and Results */}
      <div className="flex-1 overflow-hidden">
        <QueryPanel />
      </div>
    </div>
  )
}
