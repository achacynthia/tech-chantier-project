import NavBar from '../Components/NavBar'
import { Outlet } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import React, { useEffect, useState } from 'react'

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
        <div
          className='side-notice'
          role='status'
          aria-live='polite'
          style={{
            position: 'fixed',
            right: 20,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 1200,
            maxWidth: 420,
          }}
        >
          {sideNotice.title && <p className='side-notice-title'>{sideNotice.title}</p>}
          <p className='side-notice-message'>{sideNotice.message}</p>
        </div>
      )}
      <div className='container'>
        <Outlet />
      </div>
      {/* side-notice shown above */}
    </div>
  )
}

export default Rootlayout