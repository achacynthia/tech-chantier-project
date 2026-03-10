import React from 'react'
import Home from './Pages/Home'
import { Route, createBrowserRouter, createRoutesFromElements, RouterProvider } from 'react-router-dom'
import Login from './Pages/Login'
import Dashboard from './Pages/Dashboard'
import AddStock from './Pages/AddStock'
import Report from './Pages/Report'
import RecordProduction from './Pages/RecordProduction'
import Rootlayout from './Layout/Rootlayout'
import ProtectedRoute from './Components/ProtectedRoute'


const App = () => {
  const router = createBrowserRouter(
    createRoutesFromElements(
      <Route path='/' element={<Rootlayout />}>
        <Route index element={<Home />} />
        <Route path='login' element={<Login />} />
        <Route
          path='dashboard'
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path='addstock'
          element={
            <ProtectedRoute>
              <AddStock />
            </ProtectedRoute>
          }
        />
        <Route
          path='recordproduction'
          element={
            <ProtectedRoute>
              <RecordProduction />
            </ProtectedRoute>
          }
        />
        <Route
          path='report'
          element={
            <ProtectedRoute>
              <Report />
            </ProtectedRoute>
          }
        />
      </Route>
    )
  )

  return <RouterProvider router={router} />
}

export default App