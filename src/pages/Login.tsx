import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { UserRole } from '../types'
import { isApiError, login } from '../api/client'
import './Login.css'

export function Login() {
  const [idOrUsername, setIdOrUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('student')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { setAuthSession } = useApp()
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const result = await login({ idOrUsername, password, role })
      setAuthSession(result)
      navigate('/dashboard')
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Login failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmit = !isSubmitting && idOrUsername.trim() !== '' && password.trim() !== ''

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>Lab Evaluation System</h1>
          <p>Computer Science Engineering</p>
        </div>
        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label>Email or User ID</label>
            <input
              type="text"
              value={idOrUsername}
              onChange={(e) => setIdOrUsername(e.target.value)}
              placeholder="e.g., student@example.com"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>
          <div className="form-group">
            <label>Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="hod">HOD</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="login-btn" disabled={!canSubmit}>
            {isSubmitting ? 'Signing in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}
