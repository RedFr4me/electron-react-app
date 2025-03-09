import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../../components/ui/dialog'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Checkbox } from '../../components/ui/checkbox'
import { PostgreSQLConnectionConfig, ConnectionTestResult } from '../../services/database'
import { useDatabaseStore } from '../../store'
import { Server, Database, Key, User, Lock, Check, X, TestTube } from 'lucide-react'

interface ConnectionDialogProps {
  isOpen: boolean
  onClose: () => void
  initialConnection?: PostgreSQLConnectionConfig
}

const defaultConnection: PostgreSQLConnectionConfig = {
  name: '',
  host: 'localhost',
  port: 5432,
  database: '',
  username: 'postgres',
  password: '',
  ssl: false,
  savePassword: true,
}

export function ConnectionDialog({ isOpen, onClose, initialConnection }: ConnectionDialogProps) {
  const { saveConnection, testConnection } = useDatabaseStore()

  const [connection, setConnection] = useState<PostgreSQLConnectionConfig>(defaultConnection)
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null)
  const [isTesting, setIsTesting] = useState(false)
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset form when dialog opens/closes or initial connection changes
  useEffect(() => {
    if (isOpen) {
      setConnection(initialConnection || defaultConnection)
      setTestResult(null)
      setErrors({})
      setIsAdvancedOpen(false)
    }
  }, [isOpen, initialConnection])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target

    // Validate input
    let validatedValue = value
    if (name === 'port') {
      const portNum = parseInt(value, 10)
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        setErrors({ ...errors, port: 'Port must be between 1 and 65535' })
      } else {
        // Clear the error if it's valid
        const newErrors = { ...errors }
        delete newErrors.port
        setErrors(newErrors)
      }
    }

    setConnection((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(validatedValue, 10) : validatedValue,
    }))
  }

  const handleCheckboxChange = (checked: boolean, name: string) => {
    setConnection((prev) => ({
      ...prev,
      [name]: checked,
    }))
  }

  const handleTest = async () => {
    if (!validateForm()) return

    setIsTesting(true)
    setTestResult(null)

    try {
      const result = await testConnection(connection)
      setTestResult(result)
    } catch (error) {
      setTestResult({
        success: false,
        message: `Test failed: ${(error as Error).message}`,
        error: error as Error,
      })
    } finally {
      setIsTesting(false)
    }
  }

  const handleSave = () => {
    if (!validateForm()) return

    saveConnection(connection)
    onClose()
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!connection.name) newErrors.name = 'Name is required'
    if (!connection.host) newErrors.host = 'Host is required'
    if (!connection.port) newErrors.port = 'Port is required'
    if (!connection.database) newErrors.database = 'Database is required'
    if (!connection.username) newErrors.username = 'Username is required'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const isValid = connection.name && connection.host && connection.database && connection.username

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            {initialConnection ? 'Edit Connection' : 'New PostgreSQL Connection'}
          </DialogTitle>
          <DialogDescription>Enter your PostgreSQL database connection details.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name" className="flex items-center gap-1 text-primary font-medium">
              <Server size={14} /> Connection Name
            </Label>
            <Input
              id="name"
              name="name"
              value={connection.name}
              onChange={handleChange}
              placeholder="My PostgreSQL Database"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="host" className="flex items-center gap-1">
                <Server size={14} /> Host
              </Label>
              <Input
                id="host"
                name="host"
                value={connection.host}
                onChange={handleChange}
                placeholder="localhost"
                className={errors.host ? 'border-red-500' : ''}
              />
              {errors.host && <p className="text-xs text-red-500">{errors.host}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="port" className="flex items-center gap-1">
                <Database size={14} /> Port
              </Label>
              <Input
                id="port"
                name="port"
                type="number"
                value={connection.port}
                onChange={handleChange}
                placeholder="5432"
                className={errors.port ? 'border-red-500' : ''}
              />
              {errors.port && <p className="text-xs text-red-500">{errors.port}</p>}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="database" className="flex items-center gap-1">
              <Database size={14} /> Database
            </Label>
            <Input
              id="database"
              name="database"
              value={connection.database}
              onChange={handleChange}
              placeholder="postgres"
              className={errors.database ? 'border-red-500' : ''}
            />
            {errors.database && <p className="text-xs text-red-500">{errors.database}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="username" className="flex items-center gap-1">
                <User size={14} /> Username
              </Label>
              <Input
                id="username"
                name="username"
                value={connection.username}
                onChange={handleChange}
                placeholder="postgres"
                className={errors.username ? 'border-red-500' : ''}
              />
              {errors.username && <p className="text-xs text-red-500">{errors.username}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password" className="flex items-center gap-1">
                <Lock size={14} /> Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={connection.password}
                onChange={handleChange}
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => setIsAdvancedOpen(!isAdvancedOpen)} className="text-xs">
              {isAdvancedOpen ? 'Hide Advanced Options' : 'Show Advanced Options'}
            </Button>
          </div>

          {isAdvancedOpen && (
            <>
              <div className="flex items-center space-x-2 py-1">
                <Checkbox
                  id="ssl"
                  checked={connection.ssl}
                  onCheckedChange={(checked) => handleCheckboxChange(checked as boolean, 'ssl')}
                />
                <Label htmlFor="ssl" className="text-sm flex items-center gap-1">
                  <Key size={14} /> Use SSL connection
                </Label>
              </div>

              <div className="flex items-center space-x-2 py-1">
                <Checkbox
                  id="savePassword"
                  checked={connection.savePassword}
                  onCheckedChange={(checked) => handleCheckboxChange(checked as boolean, 'savePassword')}
                />
                <Label htmlFor="savePassword" className="text-sm flex items-center gap-1">
                  <Lock size={14} /> Save password
                </Label>
              </div>
            </>
          )}

          {testResult && (
            <div
              className={`mt-2 p-3 rounded-md ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}
            >
              <div className="flex items-start">
                {testResult.success ? (
                  <Check className="text-green-500 mr-2 mt-0.5" size={16} />
                ) : (
                  <X className="text-red-500 mr-2 mt-0.5" size={16} />
                )}
                <div>
                  <p className={`text-sm font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {testResult.success ? 'Connection Successful' : 'Connection Failed'}
                  </p>
                  <p className="text-xs mt-1">{testResult.message}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleTest} disabled={!isValid || isTesting} className="gap-1">
            <TestTube size={16} />
            {isTesting ? 'Testing...' : 'Test Connection'}
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!isValid} className="gap-1">
              <Check size={16} />
              Save Connection
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
