import React from 'react'
import NavBar from '../Components/NavBar'
import { Outlet } from 'react-router-dom'

const Rootlayout = () => {
  return (
    <div className='app-shell'>
      <NavBar />
      <div className='container'>
        <Outlet />
      </div>
    </div>
  )
}

export default Rootlayout