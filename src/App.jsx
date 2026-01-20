import React from 'react'
import NavBar from './Components/NavBar'
import Home from './Pages/Home'
import { Route, createBrowserRouter, createRoutesFromElements, Outlet, RouterProvider } from 'react-router-dom'
import Login from './Pages/Login'
import Dashboard from './Pages/Dashboard'
import AddStock from './Pages/AddStock'
import Report from './Pages/Report'
import RecordProduction from './Pages/RecordProduction'
import Rootlayout from './Layout/Rootlayout'


const App = () => {
  
  const  router = createBrowserRouter(
    createRoutesFromElements(
      <Route path ='/' element ={<Rootlayout />}>
        <Route index element={<Home />} />
        <Route path='login' element={<Login />} />
        <Route path='dashboard' element={<Dashboard />} />
        <Route path='addstock' element={<AddStock />} />
        <Route path='recordproduction' element={<RecordProduction />} />
        <Route path='report' element={<Report />} />
      </Route>
    )
  )

  return (
   <RouterProvider router={router} />
  )
}

export default App