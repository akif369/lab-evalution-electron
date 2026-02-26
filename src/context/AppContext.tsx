import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { User, AppData } from '../types'
import { labs, courses, teacherAssignments, users } from '../data'
import { getMe, getMySubmission, loadAppData } from '../api/client'

const AppContext = createContext<{
  currentUser: User | null
  setCurrentUser: (user: User | null) => void
  authToken: string | null
  setAuthSession: (session: { user: User; token: string } | null) => void
  refreshFromBackend: () => Promise<void>
  data: AppData
  setData: React.Dispatch<React.SetStateAction<AppData>>
} | null>(null)

const APP_DATA_STORAGE_KEY = 'lab_eval_app_data_v1'
const CURRENT_USER_STORAGE_KEY = 'lab_eval_current_user_v1'
const AUTH_TOKEN_STORAGE_KEY = 'lab_eval_auth_token_v1'

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

  const [currentUser, setCurrentUserState] = useState<User | null>(() => {
    const raw = localStorage.getItem(CURRENT_USER_STORAGE_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as User
    } catch {
      return null
    }
  })

  const [authToken, setAuthToken] = useState<string | null>(() => {
    return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
  })

  const setCurrentUser = (user: User | null) => {
    setCurrentUserState(user)
    if (!user) {
      setAuthToken(null)
      localStorage.removeItem(CURRENT_USER_STORAGE_KEY)
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
    } else {
      localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(user))
    }
  }

  const setAuthSession = useCallback((session: { user: User; token: string } | null) => {
    if (!session) {
      setCurrentUserState(null)
      setAuthToken(null)
      localStorage.removeItem(CURRENT_USER_STORAGE_KEY)
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
      return
    }

    setCurrentUserState(session.user)
    setAuthToken(session.token)
    localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(session.user))
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, session.token)
  }, [])

  const refreshFromBackend = useCallback(async () => {
    if (!authToken) return

    const [me, remoteData] = await Promise.all([getMe(authToken), loadAppData(authToken)])
    let syncedSubmissions = [] as AppData['submissions']
    let syncedSubmissionFiles = {} as AppData['submissionFiles']

    if (me.role === 'student') {
      const experimentIds = remoteData.labs.flatMap((lab) => lab.experiments.map((experiment) => experiment.id))
      const submissionResponses = await Promise.all(
        experimentIds.map((experimentId) =>
          getMySubmission(authToken, experimentId).catch(() => ({ submission: null, files: [] })),
        ),
      )

      syncedSubmissions = submissionResponses
        .map((response) => response.submission)
        .filter((submission): submission is AppData['submissions'][number] => submission !== null)
      syncedSubmissionFiles = submissionResponses.reduce((acc, response) => {
        if (response.submission) {
          acc[response.submission.id] = response.files
        }
        return acc
      }, {} as AppData['submissionFiles'])
    }

    setData((prev) => ({
      ...prev,
      ...remoteData,
      submissions: me.role === 'student' ? syncedSubmissions : prev.submissions,
      submissionFiles: me.role === 'student' ? syncedSubmissionFiles : prev.submissionFiles,
    }))

    const hydratedMe = remoteData.users.find((u) => u.id === me.id) || {
      ...me,
      labIds: me.labIds && me.labIds.length > 0 ? me.labIds : remoteData.labs.map((lab) => lab.id),
      courseIds:
        me.courseIds && me.courseIds.length > 0 ? me.courseIds : remoteData.courses.map((course) => course.id),
    }

    setCurrentUserState(hydratedMe)
    localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(hydratedMe))
  }, [authToken])

  useEffect(() => {
    if (!authToken) return
    refreshFromBackend().catch((error) => {
      console.error('Failed to refresh backend data:', error)
    })
  }, [authToken, refreshFromBackend])

  useEffect(() => {
    if (!currentUser) return
    const matched = data.users.find((user) => user.id === currentUser.id)
    if (matched && matched !== currentUser) {
      setCurrentUserState(matched)
      localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(matched))
    }
  }, [currentUser, data.users])

  useEffect(() => {
    localStorage.setItem(APP_DATA_STORAGE_KEY, JSON.stringify(data))
  }, [data])

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        authToken,
        setAuthSession,
        refreshFromBackend,
        data,
        setData,
      }}
    >
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
