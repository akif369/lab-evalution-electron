import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import './Layout.css'

export function Layout({ children }: { children: React.ReactNode }) {
  const { currentUser, setCurrentUser } = useApp()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    setCurrentUser(null)
    navigate('/login')
  }

  if (!currentUser) {
    return <>{children}</>
  }

  const isActive = (path: string) => location.pathname === path

  const studentNav = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/experiments', label: 'All Experiments', icon: '🧪' },
    { path: '/profile', label: 'Profile', icon: '👤' },
  ]

  const teacherNav = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/experiments', label: 'Experiments', icon: '🧪' },
    { path: '/students', label: 'Students', icon: '👥' },
    { path: '/add-experiment', label: 'Add Experiment', icon: '➕' },
    { path: '/profile', label: 'Profile', icon: '👤' },
  ]

  const hodNav = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/teachers', label: 'Teachers', icon: '👨‍🏫' },
    { path: '/assignments', label: 'Assignments', icon: '📋' },
    { path: '/profile', label: 'Profile', icon: '👤' },
  ]

  const adminNav = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/users', label: 'Users', icon: '👥' },
    { path: '/courses', label: 'Courses', icon: '📚' },
    { path: '/profile', label: 'Profile', icon: '👤' },
  ]

  const navItems =
    currentUser.role === 'student'
      ? studentNav
      : currentUser.role === 'teacher'
        ? teacherNav
        : currentUser.role === 'hod'
          ? hodNav
          : adminNav

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Lab Eval</h2>
          <p className="user-role">{currentUser.role.toUpperCase()}</p>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
              title={item.label}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <strong>{currentUser.name}</strong>
            <span className="muted">{currentUser.id}</span>
          </div>
          <button onClick={handleLogout} className="logout-btn" title="Logout">
            <span className="logout-icon">🚪</span>
            <span className="logout-text">Logout</span>
          </button>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  )
}
