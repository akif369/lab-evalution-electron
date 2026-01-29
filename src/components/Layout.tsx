import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  FlaskConical,
  User,
  Users,
  PlusCircle,
  GraduationCap,
  ClipboardList,
  BookOpen,
  LogOut,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import './Layout.css'

type NavItem = {
  path: string
  label: string
  icon: React.ReactNode
}

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

  const studentNav: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { path: '/experiments', label: 'All Experiments', icon: <FlaskConical size={18} /> },
    { path: '/profile', label: 'Profile', icon: <User size={18} /> },
  ]

  const teacherNav: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { path: '/experiments', label: 'Experiments', icon: <FlaskConical size={18} /> },
    { path: '/students', label: 'Students', icon: <Users size={18} /> },
    { path: '/add-experiment', label: 'Add Experiment', icon: <PlusCircle size={18} /> },
    { path: '/profile', label: 'Profile', icon: <User size={18} /> },
  ]

  const hodNav: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { path: '/teachers', label: 'Teachers', icon: <GraduationCap size={18} /> },
    { path: '/assignments', label: 'Assignments', icon: <ClipboardList size={18} /> },
    { path: '/profile', label: 'Profile', icon: <User size={18} /> },
  ]

  const adminNav: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { path: '/users', label: 'Users', icon: <Users size={18} /> },
    { path: '/courses', label: 'Courses', icon: <BookOpen size={18} /> },
    { path: '/profile', label: 'Profile', icon: <User size={18} /> },
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
            <span className="logout-icon">
              <LogOut size={16} />
            </span>
            <span className="logout-text">Logout</span>
          </button>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  )
}
