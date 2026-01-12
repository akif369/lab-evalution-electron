import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import type { User, AppData } from '../types'
import { labs, courses, teacherAssignments } from '../data'

const AppContext = createContext<{
  currentUser: User | null
  setCurrentUser: (user: User | null) => void
  data: AppData
  setData: React.Dispatch<React.SetStateAction<AppData>>
} | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [data, setData] = useState<AppData>({
    courses,
    labs,
    teacherAssignments,
    submissions: [],
  })

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
