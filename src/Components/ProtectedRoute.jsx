import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isAuthLoading, isBootstrapping } = useAppContext()

  if (isAuthLoading || isBootstrapping) {
    return (
      <div className="page-card">
        <p className="muted-text">Loading...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute