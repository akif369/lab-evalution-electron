import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { User, AppData } from '../types'
import { labs, courses, teacherAssignments, users } from '../data'

const AppContext = createContext<{
  currentUser: User | null
  setCurrentUser: (user: User | null) => void
  data: AppData
  setData: React.Dispatch<React.SetStateAction<AppData>>
} | null>(null)

const APP_DATA_STORAGE_KEY = 'lab_eval_app_data_v1'
const CURRENT_USER_ID_STORAGE_KEY = 'lab_eval_current_user_id_v1'

const getSeedData = (): AppData => ({
  users,
  courses,
  labs,
  teacherAssignments,
  submissions: [],
  submissionFiles: {},
})

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => {
    const raw = localStorage.getItem(APP_DATA_STORAGE_KEY)
    if (!raw) return getSeedData()
    try {
      const parsed = JSON.parse(raw) as Partial<AppData>
      const seed = getSeedData()
      return {
        ...seed,
        ...parsed,
        users: Array.isArray(parsed.users) ? parsed.users : seed.users,
        courses: Array.isArray(parsed.courses) ? parsed.courses : seed.courses,
        labs: Array.isArray(parsed.labs) ? parsed.labs : seed.labs,
        teacherAssignments: Array.isArray(parsed.teacherAssignments)
          ? parsed.teacherAssignments
          : seed.teacherAssignments,
        submissions: Array.isArray(parsed.submissions) ? parsed.submissions : seed.submissions,
        submissionFiles:
          parsed.submissionFiles && typeof parsed.submissionFiles === 'object'
            ? (parsed.submissionFiles as AppData['submissionFiles'])
            : seed.submissionFiles,
      }
    } catch {
      return getSeedData()
    }
  })

  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    return localStorage.getItem(CURRENT_USER_ID_STORAGE_KEY)
  })

  const currentUser = useMemo(() => {
    if (!currentUserId) return null
    return data.users.find((u) => u.id === currentUserId) || null
  }, [currentUserId, data.users])

  const setCurrentUser = (user: User | null) => {
    const nextId = user ? user.id : null
    setCurrentUserId(nextId)
    if (!nextId) {
      localStorage.removeItem(CURRENT_USER_ID_STORAGE_KEY)
    } else {
      localStorage.setItem(CURRENT_USER_ID_STORAGE_KEY, nextId)
    }
  }

  useEffect(() => {
    localStorage.setItem(APP_DATA_STORAGE_KEY, JSON.stringify(data))
  }, [data])

  return (
    <AppContext.Provider value={{ currentUser, setCurrentUser, data, setData }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within AppProvider')
  }
  return context
}
