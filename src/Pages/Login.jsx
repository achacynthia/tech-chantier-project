import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'

const Login = () => {
  const navigate = useNavigate()
  const { login } = useAppContext()

  const [formData, setFormData] = useState({ name: '', email: '' })
  const [errorMessage, setErrorMessage] = useState('')

  const handleChange = (event) => {
    setFormData((prevData) => ({
      ...prevData,
      [event.target.name]: event.target.value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const result = await login(formData)
    if (!result.ok) {
      setErrorMessage(result.message)
      return
    }

    setErrorMessage('')
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="page-card auth-card">
      <h1>Login</h1>
      <p className="muted-text">Sign in to access stock, production, and reports.</p>

      <form className="form-grid" onSubmit={handleSubmit}>
        <label htmlFor="name">Name</label>
        <input
          id="name"
          name="name"
          type="text"
          value={formData.name}
          onChange={handleChange}
          placeholder="Owner Name"
        />

        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="owner@business.com"
        />

        {errorMessage && <p className="error-text">{errorMessage}</p>}
        <button type="submit">Login</button>
      </form>
    </div>
  )
}

export default Login