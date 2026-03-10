import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'

const NavBar = ({ isDarkMode, onToggleTheme }) => {
  const navigate = useNavigate()
  const { isAuthenticated, logout } = useAppContext()

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="nav-bar">
      <div className="nav-brand-wrap">
        <h1 className="brand-title">Production Tracker</h1>
      </div>

      <ul className="nav-center-links">
        <li>
          <NavLink to="/">Home</NavLink>
        </li>
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
        {!isAuthenticated && (
          <li>
            <NavLink to="/login">Login</NavLink>
          </li>
        )}
      </ul>

      <div className="nav-cta-wrap">
        <button type="button" className="button-secondary theme-toggle" onClick={onToggleTheme}>
          {isDarkMode ? 'Light Mode' : 'Dark Mode'}
        </button>
        {!isAuthenticated ? (
          <button onClick={() => navigate('/login', { replace: true })}>Sign Up</button>
        ) : (
          <button onClick={handleLogout}>Logout</button>
        )}
      </div>
    </div>
  )
}

export default NavBar