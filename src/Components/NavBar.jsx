import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'

const NavBar = () => {
  const navigate = useNavigate()
  const { isAuthenticated, logout } = useAppContext()

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="nav-bar">
      <h1 className="brand-title">Production Tracker</h1>
      <ul>
        <li>
          <NavLink to="/">Home</NavLink>
        </li>
        {!isAuthenticated && (
          <li>
            <NavLink to="/login">Login</NavLink>
          </li>
        )}

        {isAuthenticated && (
          <>
            <li>
              <NavLink to="/dashboard">Dashboard</NavLink>
            </li>
            <li>
              <NavLink to="/addstock">Add Stock</NavLink>
            </li>
            <li>
              <NavLink to="/recordproduction">Record Production</NavLink>
            </li>
            <li>
              <NavLink to="/report">Reports</NavLink>
            </li>
          </>
        )}
      </ul>

      {!isAuthenticated ? (
        <button onClick={() => navigate('/login', { replace: true })}>Get Started</button>
      ) : (
        <button onClick={handleLogout}>Logout</button>
      )}
    </div>
  )
}

export default NavBar