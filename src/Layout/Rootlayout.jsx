import React, { useEffect, useState } from 'react'
import NavBar from '../Components/NavBar'
import { Outlet } from 'react-router-dom'

const Rootlayout = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme')
    return savedTheme === 'dark'
  })

  useEffect(() => {
    const nextTheme = isDarkMode ? 'dark' : 'light'
    document.documentElement.setAttribute('data-theme', nextTheme)
    localStorage.setItem('theme', nextTheme)
  }, [isDarkMode])

  return (
    <div className='app-shell'>
      <NavBar isDarkMode={isDarkMode} onToggleTheme={() => setIsDarkMode((prevMode) => !prevMode)} />
      <div className='container'>
        <Outlet />
      </div>
    </div>
  )
}

export default Rootlayout