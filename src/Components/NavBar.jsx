import React from 'react'
import { Link } from 'react-router-dom' 
import { NavLink, useNavigate } from 'react-router-dom'

const NavBar = () => {
 const navigate = useNavigate();

  return (
    <div className="nav-bar">
        <img src="" alt="Logo" />
        <h1>Navigation Bar</h1>
        <ul>
            <li><NavLink to="/">Home</NavLink></li>
            <li><NavLink to="/login">Login</NavLink></li>
            <li><NavLink to="/dashboard">Dashboard</NavLink></li>
            <li><NavLink to="/addstock">Add Stock</NavLink></li>
            <li><NavLink to="/recordproduction">Record Production</NavLink></li>
            <li><NavLink to="/report">Report</NavLink></li>
        </ul>
        <button onClick={() => navigate('/login', {replace: true})}>Get Started</button>
    </div>
  )
}

export default NavBar