import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './components/App'
import appIcon from '../resources/build/icon.png'
import { WindowContextProvider, menuItems } from '../lib/window'
import '../lib/window/window.css'
import { useDatabaseStore } from './store'
// import { Button } from './components/ui/button'

// Initialize dark mode based on system preference
function initializeDarkMode() {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  if (!prefersDark) {
    document.documentElement.classList.add('light')
  }
}

// Call the function to initialize dark mode
initializeDarkMode()

// Root component to initialize stores
function Root() {
  const { loadConnections } = useDatabaseStore()

  // Load connections on app start
  useEffect(() => {
    loadConnections()
  }, [loadConnections])

  return (
    <WindowContextProvider titlebar={{ title: 'PostgreSQL Explorer', icon: appIcon, menuItems }}>
      {/* <Button>Click me</Button> */}
      <App />
    </WindowContextProvider>
  )
}

ReactDOM.createRoot(document.getElementById('app') as HTMLElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
