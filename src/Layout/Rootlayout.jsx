import React, { useEffect, useState } from 'react'
import NavBar from '../Components/NavBar'
import { Outlet } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'

const Rootlayout = () => {
  const { sideNotice } = useAppContext()
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
      {sideNotice && (
        <div className='side-notice' role='status' aria-live='polite'>
          <p className='side-notice-title'>Guest Mode</p>
          <p className='side-notice-message'>{sideNotice}</p>
        </div>
      )}
      <div className='container'>
        <Outlet />
      </div>
    </div>
  )
}

export default Rootlayout