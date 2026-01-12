import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Profile } from './pages/Profile'
import { Experiments } from './pages/Experiments'
import { CodeEditor } from './pages/CodeEditor'
import { AddExperiment } from './pages/AddExperiment'
import { Students } from './pages/Students'
import { Teachers } from './pages/Teachers'
import { Assignments } from './pages/Assignments'
import './App.css'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser } = useApp()
  return currentUser ? <>{children}</> : <Navigate to="/login" replace />
}

function AppRoutes() {
  const { currentUser } = useApp()

  return (
    <Routes>
      <Route path="/login" element={!currentUser ? <Login /> : <Navigate to="/dashboard" replace />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Layout>
              <Profile />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/experiments"
        element={
          <ProtectedRoute>
            <Layout>
              <Experiments />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/editor/:labId/:experimentId"
        element={
          <ProtectedRoute>
            <Layout>
              <CodeEditor />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/add-experiment"
        element={
          <ProtectedRoute>
            <Layout>
              <AddExperiment />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/students"
        element={
          <ProtectedRoute>
            <Layout>
              <Students />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/teachers"
        element={
          <ProtectedRoute>
            <Layout>
              <Teachers />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/assignments"
        element={
          <ProtectedRoute>
            <Layout>
              <Assignments />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  )
}

export default App
