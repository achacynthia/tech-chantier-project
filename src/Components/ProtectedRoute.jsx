import React from 'react'
import { useAppContext } from '../context/AppContext'

const ProtectedRoute = ({ children }) => {
  const { isAuthLoading, isBootstrapping } = useAppContext()

  if (isAuthLoading || isBootstrapping) {
    return (
      <div className="page-card">
        <p className="muted-text">Loading...</p>
      </div>
    )
  }

  return children
}

export default ProtectedRoute