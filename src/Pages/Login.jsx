import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'

const Login = () => {
  const navigate = useNavigate()
  const { login, signup, notify } = useAppContext()

  const [isSignupMode, setIsSignupMode] = useState(false)

  const [loginData, setLoginData] = useState({
    name: '',
    password: '',
  })

  const [signupData, setSignupData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    country: '',
  })
  const [errorMessage, setErrorMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleLoginChange = (event) => {
    setLoginData((prevData) => ({
      ...prevData,
      [event.target.name]: event.target.value,
    }))
  }

  const handleSignupChange = (event) => {
    setSignupData((prevData) => ({
      ...prevData,
      [event.target.name]: event.target.value,
    }))
  }

  const handleLoginSubmit = async (event) => {
    event.preventDefault()

    const result = await login(loginData)
    if (!result.ok) {
      setErrorMessage(result.message)
      return
    }

    notify('Success', result.message || 'Welcome back!')
    setErrorMessage('')
    navigate('/dashboard', { replace: true })
  }

  const handleSignupSubmit = async (event) => {
    event.preventDefault()

    const result = await signup(signupData)
    if (!result.ok) {
      setErrorMessage(result.message)
      return
    }

    notify('Success', result.message || 'Account created successfully.')
    setErrorMessage('')
    setIsSignupMode(false)
    setLoginData({
      name: signupData.email.trim().toLowerCase(),
      password: '',
    })
    setSignupData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      country: '',
    })
  }

  const switchMode = (nextIsSignupMode) => {
    setIsSignupMode(nextIsSignupMode)
    setErrorMessage('')
    setShowPassword(false)
    setShowConfirmPassword(false)
  }

  return (
    <div className="page-card auth-card">
      <h1>{isSignupMode ? 'Sign Up' : 'Login'}</h1>
      <p className="muted-text">
        {isSignupMode
          ? 'Create your account quickly. Only email and password are required.'
          : 'Login with your name or email and password.'}
      </p>

      <div className="inline-actions auth-mode-actions">
        <button
          type="button"
          className={isSignupMode ? 'button-secondary' : ''}
          onClick={() => switchMode(false)}
        >
          Login
        </button>
        <button
          type="button"
          className={isSignupMode ? '' : 'button-secondary'}
          onClick={() => switchMode(true)}
        >
          Sign Up
        </button>
      </div>

      {!isSignupMode ? (
        <form className="form-grid" onSubmit={handleLoginSubmit}>
          <label htmlFor="name">Name or Email</label>
          <input
            id="name"
            name="name"
            type="text"
            value={loginData.name}
            onChange={handleLoginChange}
            placeholder="e.g. John Doe or owner@business.com"
          />

          <label htmlFor="password">Password</label>
          <div className="password-input-wrap">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={loginData.password}
              onChange={handleLoginChange}
              placeholder="Enter your password"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((prevState) => !prevState)}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          {errorMessage && <p className="error-text">{errorMessage}</p>}
          <button type="submit">Login</button>
        </form>
      ) : (
        <form className="form-grid" onSubmit={handleSignupSubmit}>
          <label htmlFor="firstName">First Name</label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            value={signupData.firstName}
            onChange={handleSignupChange}
            placeholder="John"
          />

          <label htmlFor="lastName">Last Name</label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            value={signupData.lastName}
            onChange={handleSignupChange}
            placeholder="Doe"
          />

          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={signupData.email}
            onChange={handleSignupChange}
            placeholder="owner@business.com"
          />

          <label htmlFor="signupPassword">Password</label>
          <div className="password-input-wrap">
            <input
              id="signupPassword"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={signupData.password}
              onChange={handleSignupChange}
              placeholder="At least 8 chars, Aa + 1"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((prevState) => !prevState)}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          <label htmlFor="confirmPassword">Confirm Password</label>
          <div className="password-input-wrap">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={signupData.confirmPassword}
              onChange={handleSignupChange}
              placeholder="Re-enter password"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowConfirmPassword((prevState) => !prevState)}
            >
              {showConfirmPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          <label htmlFor="country">Country</label>
          <input
            id="country"
            name="country"
            type="text"
            value={signupData.country}
            onChange={handleSignupChange}
            placeholder="Ghana"
          />

          {errorMessage && <p className="error-text">{errorMessage}</p>}
          <button type="submit">Create Account</button>
        </form>
      )}
    </div>
  )
}

export default Login