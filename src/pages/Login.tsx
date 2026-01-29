import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { UserRole } from '../types'
import './Login.css'

export function Login() {
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('student')
  const [error, setError] = useState<string | null>(null)
  const { setCurrentUser, data } = useApp()
  const navigate = useNavigate()

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const found = data.users.find(
      (u) =>
        u.id.toLowerCase() === id.toLowerCase() &&
        u.password === password &&
        u.role === role,
    )

    if (!found) {
      setError('Invalid credentials or role')
      return
    }

    setCurrentUser(found)
    navigate('/dashboard')
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>Lab Evaluation System</h1>
          <p>Computer Science Engineering</p>
        </div>
        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label>User ID</label>
            <input
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="e.g., stu-01, t-01"
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
          <button type="submit" className="login-btn">
            Login
          </button>
        </form>
        <div className="login-hint">
          <p className="muted">Demo accounts:</p>
          <ul>
            <li>Student: stu-01 / student</li>
            <li>Teacher: t-01 / teacher</li>
            <li>HOD: hod-01 / hod</li>
            <li>Admin: admin-01 / admin</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
