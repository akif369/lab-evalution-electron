import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import './Dashboard.css'

export function Dashboard() {
  const { currentUser, data } = useApp()

  if (!currentUser) return null

  if (currentUser.role === 'student') {
    const userSubmissions = data.submissions.filter((s) => s.studentId === currentUser.id)
    const enrolledLabs = currentUser.labIds
      ? data.labs.filter((l) => currentUser.labIds?.includes(l.id))
      : []

    return (
      <div className="dashboard-page">
        <div className="page-header">
          <h1>Dashboard</h1>
          <p className="muted">Welcome back, {currentUser.name}!</p>
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-card">
            <h2>Quick Stats</h2>
            <div className="stats-row">
              <div className="stat-box">
                <div className="stat-number">{enrolledLabs.length}</div>
                <div className="stat-text">Enrolled Labs</div>
              </div>
              <div className="stat-box">
                <div className="stat-number">{userSubmissions.length}</div>
                <div className="stat-text">Submissions</div>
              </div>
              <div className="stat-box">
                <div className="stat-number">
                  {userSubmissions.filter((s) => s.status === 'validated').length}
                </div>
                <div className="stat-text">Completed</div>
              </div>
            </div>
          </div>

          <div className="dashboard-card">
            <h2>Recent Activity</h2>
            {userSubmissions.length > 0 ? (
              <ul className="activity-list">
                {userSubmissions.slice(-5).reverse().map((sub) => {
                  const exp = data.labs
                    .flatMap((l) => l.experiments)
                    .find((e) => e.id === sub.experimentId)
                  return (
                    <li key={sub.id}>
                      <div>
                        <strong>{exp?.title || sub.experimentId}</strong>
                        <span className="muted"> - {sub.status}</span>
                      </div>
                      <span className="muted small">{sub.lastSaved}</span>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="muted">No recent activity</p>
            )}
          </div>

          <div className="dashboard-card">
            <h2>Quick Actions</h2>
            <div className="action-buttons">
              <Link to="/experiments" className="action-btn">
                View All Experiments
              </Link>
              <Link to="/profile" className="action-btn">
                View Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (currentUser.role === 'teacher') {
    const assignedLabs = currentUser.labIds
      ? data.labs.filter((l) => currentUser.labIds?.includes(l.id))
      : []
    const totalStudents = new Set(
      data.submissions.map((s) => s.studentId),
    ).size

    return (
      <div className="dashboard-page">
        <div className="page-header">
          <h1>Teacher Dashboard</h1>
          <p className="muted">Welcome, {currentUser.name}</p>
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-card">
            <h2>Overview</h2>
            <div className="stats-row">
              <div className="stat-box">
                <div className="stat-number">{assignedLabs.length}</div>
                <div className="stat-text">Assigned Labs</div>
              </div>
              <div className="stat-box">
                <div className="stat-number">{totalStudents}</div>
                <div className="stat-text">Students</div>
              </div>
              <div className="stat-box">
                <div className="stat-number">{data.submissions.length}</div>
                <div className="stat-text">Total Submissions</div>
              </div>
            </div>
          </div>

          <div className="dashboard-card">
            <h2>Quick Actions</h2>
            <div className="action-buttons">
              <Link to="/add-experiment" className="action-btn">
                Add Experiment
              </Link>
              <Link to="/students" className="action-btn">
                View Students
              </Link>
              <Link to="/experiments" className="action-btn">
                Manage Experiments
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p className="muted">Welcome, {currentUser.name}</p>
      </div>
      <div className="dashboard-card">
        <p>Dashboard content for {currentUser.role}</p>
      </div>
    </div>
  )
}
