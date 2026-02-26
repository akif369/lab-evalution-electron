import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import { changeUserPassword, createUser, deleteUser, isApiError, updateUser } from '../api/client'
import { looksLikeHeader, parseCsvText } from '../utils/csv'
import type { User, UserRole } from '../types'
import './Users.css'

type BulkRow = {
  id: string
  name: string
  password: string
  year?: string
  semester?: string
  section?: string
}

type ImportPreviewRow = BulkRow & {
  lineNumber: number
  email: string
  valid: boolean
  issue?: string
}

const toDefaultEmail = (idOrName: string) => {
  const raw = idOrName.trim().toLowerCase()
  if (raw.includes('@')) return raw
  const slug = raw.replace(/[^a-z0-9]+/g, '.').replace(/(^\.|\.$)/g, '')
  return `${slug || 'user'}@leap.local`
}

export function Users() {
  const { currentUser, authToken, data, setData, refreshFromBackend } = useApp()

  const [newRole, setNewRole] = useState<UserRole>('student')
  const [newId, setNewId] = useState('')
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newYear, setNewYear] = useState('')
  const [newSemester, setNewSemester] = useState('')
  const [newSection, setNewSection] = useState('')

  const [bulkText, setBulkText] = useState('')
  const [bulkYear, setBulkYear] = useState('')
  const [bulkSemester, setBulkSemester] = useState('')
  const [bulkSection, setBulkSection] = useState('')
  const [csvFileName, setCsvFileName] = useState('')

  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all')
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'role' | 'email'>('role')

  const [busyUserId, setBusyUserId] = useState<string | null>(null)
  const [isBulkImporting, setIsBulkImporting] = useState(false)
  const [isBulkActionBusy, setIsBulkActionBusy] = useState(false)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])

  const csvInputRef = useRef<HTMLInputElement | null>(null)

  if (!currentUser || currentUser.role !== 'admin') return null

  useEffect(() => {
    const validIds = new Set(data.users.map((u) => u.id))
    setSelectedUserIds((prev) => prev.filter((id) => validIds.has(id)))
  }, [data.users])

  const importPreview = useMemo(() => {
    const parsed = parseCsvText(bulkText)
    if (parsed.length === 0) {
      return { rows: [] as ImportPreviewRow[], validRows: [] as BulkRow[], invalidCount: 0 }
    }

    const rowsToParse = looksLikeHeader(parsed[0].cells) ? parsed.slice(1) : parsed
    const existingEmails = new Set(data.users.map((u) => (u.email || '').toLowerCase()))
    const seenEmails = new Set<string>()

    const rows = rowsToParse.map((row): ImportPreviewRow => {
      const id = (row.cells[0] || '').trim()
      const name = (row.cells[1] || '').trim()
      const password = (row.cells[2] || '').trim() || 'student123'
      const year = (row.cells[3] || '').trim() || bulkYear.trim() || undefined
      const semester = (row.cells[4] || '').trim() || bulkSemester.trim() || undefined
      const section = (row.cells[5] || '').trim() || bulkSection.trim() || undefined
      const email = toDefaultEmail(id)

      if (!id || !name) {
        return { id, name, password, year, semester, section, email, lineNumber: row.lineNumber, valid: false, issue: 'Missing id or name' }
      }
      if (seenEmails.has(email)) {
        return { id, name, password, year, semester, section, email, lineNumber: row.lineNumber, valid: false, issue: 'Duplicate in import' }
      }
      if (existingEmails.has(email)) {
        return { id, name, password, year, semester, section, email, lineNumber: row.lineNumber, valid: false, issue: 'Email already exists' }
      }

      seenEmails.add(email)
      return { id, name, password, year, semester, section, email, lineNumber: row.lineNumber, valid: true }
    })

    return {
      rows,
      validRows: rows.filter((row) => row.valid).map((row) => ({
        id: row.id,
        name: row.name,
        password: row.password,
        year: row.year,
        semester: row.semester,
        section: row.section,
      })),
      invalidCount: rows.filter((row) => !row.valid).length,
    }
  }, [bulkText, bulkYear, bulkSemester, bulkSection, data.users])

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    const roleOrder: Record<UserRole, number> = { admin: 0, hod: 1, teacher: 2, student: 3 }

    const filtered = data.users
      .filter((u) => (roleFilter === 'all' ? true : u.role === roleFilter))
      .filter((u) => {
        if (!query) return true
        const haystack = `${u.name} ${u.email || ''} ${u.id} ${u.rollNo || ''}`.toLowerCase()
        return haystack.includes(query)
      })

    return [...filtered].sort((a, b) => {
      if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '')
      if (sortBy === 'name_desc') return (b.name || '').localeCompare(a.name || '')
      if (sortBy === 'email') return (a.email || '').localeCompare(b.email || '')
      const ra = roleOrder[a.role]
      const rb = roleOrder[b.role]
      if (ra !== rb) return ra - rb
      return (a.name || '').localeCompare(b.name || '')
    })
  }, [data.users, roleFilter, searchQuery, sortBy])

  const selectedVisibleCount = filteredUsers.filter((u) => selectedUserIds.includes(u.id)).length

  const addUser = async () => {
    if (!authToken) {
      alert('Authentication required. Please login again.')
      return
    }

    if (!newName.trim()) {
      alert('Name is required')
      return
    }

    const roleToCreate: UserRole = newRole === 'admin' ? 'student' : newRole
    const id = newId.trim()
    const email = (newEmail.trim() || toDefaultEmail(id || newName)).toLowerCase()
    const password = newPassword.trim() || (roleToCreate === 'student' ? 'student123' : `${roleToCreate}123`)

    setBusyUserId('new')
    try {
      await createUser(authToken, {
        name: newName.trim(),
        email,
        password,
        role: roleToCreate,
        rollNo: roleToCreate === 'student' && id ? id : undefined,
        year: roleToCreate === 'student' ? newYear.trim() : undefined,
        semester: roleToCreate === 'student' ? newSemester.trim() : undefined,
        section: roleToCreate === 'student' ? newSection.trim() : undefined,
        batch: roleToCreate === 'student' ? newYear.trim() : undefined,
      })

      await refreshFromBackend()

      setNewId('')
      setNewName('')
      setNewEmail('')
      setNewPassword('')
      setNewYear('')
      setNewSemester('')
      setNewSection('')
      alert('User created successfully.')
    } catch (error) {
      alert(isApiError(error) ? error.message : 'Failed to create user')
    } finally {
      setBusyUserId(null)
    }
  }

  const updateUserField = (userId: string, patch: Partial<User>) => {
    setData((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === userId ? { ...u, ...patch } : u)),
    }))
  }

  const saveUser = async (userId: string) => {
    if (!authToken) {
      alert('Authentication required. Please login again.')
      return
    }

    const u = data.users.find((x) => x.id === userId)
    if (!u) return
    if (u.role === 'admin') {
      alert('Admin accounts are locked from role/data updates in this screen.')
      return
    }

    setBusyUserId(userId)
    try {
      await updateUser(authToken, userId, {
        name: u.name,
        email: (u.email || toDefaultEmail(u.rollNo || u.id)).toLowerCase(),
        role: u.role,
        rollNo: u.rollNo,
        year: u.year,
        semester: u.semester,
        section: u.section,
      })
      await refreshFromBackend()
      alert('User updated successfully.')
    } catch (error) {
      alert(isApiError(error) ? error.message : 'Failed to update user')
    } finally {
      setBusyUserId(null)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!authToken) {
      alert('Authentication required. Please login again.')
      return
    }

    const u = data.users.find((x) => x.id === userId)
    if (!u) return
    if (u.role === 'admin') {
      alert('Cannot delete an admin user')
      return
    }

    const ok = confirm(`Delete user ${u.name} (${u.id})?`)
    if (!ok) return

    setBusyUserId(userId)
    try {
      await deleteUser(authToken, userId)
      await refreshFromBackend()
      setSelectedUserIds((prev) => prev.filter((id) => id !== userId))
      alert('User deleted successfully.')
    } catch (error) {
      alert(isApiError(error) ? error.message : 'Failed to delete user')
    } finally {
      setBusyUserId(null)
    }
  }

  const handleResetPassword = async (userId: string) => {
    if (!authToken) {
      alert('Authentication required. Please login again.')
      return
    }

    const u = data.users.find((x) => x.id === userId)
    if (!u || u.role === 'admin') return

    const nextPassword = u.role === 'student' ? 'student123' : u.role === 'teacher' ? 'teacher123' : 'hod123'

    setBusyUserId(userId)
    try {
      await changeUserPassword(authToken, userId, { newPassword: nextPassword })
      alert(`Password reset to: ${nextPassword}`)
    } catch (error) {
      alert(isApiError(error) ? error.message : 'Failed to reset password')
    } finally {
      setBusyUserId(null)
    }
  }

  const loadCsvFile = async (file: File) => {
    const text = await file.text()
    setCsvFileName(file.name)
    setBulkText(text)
  }

  const bulkOnboardStudents = async () => {
    if (!authToken) {
      alert('Authentication required. Please login again.')
      return
    }

    if (importPreview.validRows.length === 0) {
      alert('No valid rows to import. Expected: id_or_email,name,password,year,semester,section')
      return
    }

    setIsBulkImporting(true)
    let successCount = 0
    const errors: string[] = []

    for (const row of importPreview.validRows) {
      try {
        const rollNo = row.id.includes('@') ? undefined : row.id
        await createUser(authToken, {
          name: row.name,
          email: toDefaultEmail(row.id),
          password: row.password,
          role: 'student',
          rollNo,
          year: row.year,
          semester: row.semester,
          section: row.section,
          batch: row.year,
        })
        successCount += 1
      } catch (error) {
        errors.push(`${row.id}: ${isApiError(error) ? error.message : 'Failed'}`)
      }
    }

    await refreshFromBackend()
    setIsBulkImporting(false)
    setBulkText('')
    setCsvFileName('')

    if (errors.length === 0) {
      alert(`Imported ${successCount} student(s).`)
    } else {
      alert(`Imported ${successCount} student(s). Failed: ${errors.length}. ${errors.slice(0, 3).join(' | ')}`)
    }
  }

  const toggleSelected = (userId: string) => {
    setSelectedUserIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
  }

  const selectAllFiltered = () => {
    setSelectedUserIds(filteredUsers.map((u) => u.id))
  }

  const clearSelection = () => {
    setSelectedUserIds([])
  }

  const bulkResetSelected = async () => {
    if (!authToken || selectedUserIds.length === 0) return

    const usersToReset = data.users.filter((u) => selectedUserIds.includes(u.id) && u.role !== 'admin')
    if (usersToReset.length === 0) {
      alert('No resettable users selected.')
      return
    }

    setIsBulkActionBusy(true)
    let success = 0
    for (const user of usersToReset) {
      const nextPassword = user.role === 'student' ? 'student123' : user.role === 'teacher' ? 'teacher123' : 'hod123'
      try {
        await changeUserPassword(authToken, user.id, { newPassword: nextPassword })
        success += 1
      } catch {
        // skip
      }
    }
    setIsBulkActionBusy(false)
    alert(`Reset passwords for ${success}/${usersToReset.length} users.`)
  }

  const bulkDeleteSelected = async () => {
    if (!authToken || selectedUserIds.length === 0) return

    const usersToDelete = data.users.filter((u) => selectedUserIds.includes(u.id) && u.role !== 'admin')
    if (usersToDelete.length === 0) {
      alert('No deletable users selected.')
      return
    }

    const ok = confirm(`Delete ${usersToDelete.length} selected users?`)
    if (!ok) return

    setIsBulkActionBusy(true)
    let success = 0
    for (const user of usersToDelete) {
      try {
        await deleteUser(authToken, user.id)
        success += 1
      } catch {
        // skip
      }
    }

    await refreshFromBackend()
    setSelectedUserIds([])
    setIsBulkActionBusy(false)
    alert(`Deleted ${success}/${usersToDelete.length} users.`)
  }

  return (
    <div className="users-page">
      <div className="page-header">
        <h1>Users</h1>
        <p className="muted">Admin: manage users and onboard students</p>
      </div>

      <div className="users-toolbar panel">
        <div className="users-toolbar-row">
          <div className="form-group">
            <label>Search</label>
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by name/email/id" />
          </div>
          <div className="form-group">
            <label>Role Filter</label>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}>
              <option value="all">All roles</option>
              <option value="student">student</option>
              <option value="teacher">teacher</option>
              <option value="hod">hod</option>
              <option value="admin">admin</option>
            </select>
          </div>
          <div className="form-group">
            <label>Sort</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
              <option value="role">Role + Name</option>
              <option value="name_asc">Name A-Z</option>
              <option value="name_desc">Name Z-A</option>
              <option value="email">Email A-Z</option>
            </select>
          </div>
        </div>
        <div className="users-toolbar-row users-toolbar-actions-row">
          <strong>Selected: {selectedUserIds.length}</strong>
          <span className="muted small">Visible selected: {selectedVisibleCount}</span>
          <button className="btn-secondary" onClick={selectAllFiltered}>Select Filtered</button>
          <button className="btn-secondary" onClick={clearSelection}>Clear</button>
          <button className="btn-secondary" onClick={bulkResetSelected} disabled={selectedUserIds.length === 0 || isBulkActionBusy}>
            Reset Password Selected
          </button>
          <button className="btn-danger" onClick={bulkDeleteSelected} disabled={selectedUserIds.length === 0 || isBulkActionBusy}>
            Delete Selected
          </button>
        </div>
      </div>

      <div className="panel">
        <h2>Add User</h2>
        <div className="form-grid">
          <div className="form-group">
            <label>Role</label>
            <select value={newRole} onChange={(e) => setNewRole(e.target.value as UserRole)}>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="hod">HOD</option>
            </select>
          </div>

          <div className="form-group">
            <label>User ID / Roll No (optional)</label>
            <input value={newId} onChange={(e) => setNewId(e.target.value)} placeholder="e.g. stu-10" />
          </div>

          <div className="form-group">
            <label>Name</label>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Full name" />
          </div>

          <div className="form-group">
            <label>Email (optional)</label>
            <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="user@example.com" />
          </div>

          <div className="form-group">
            <label>Password (optional)</label>
            <input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="defaults by role"
            />
          </div>

          <div className={`form-group ${newRole !== 'student' ? 'disabled' : ''}`}>
            <label>Year</label>
            <input
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
              disabled={newRole !== 'student'}
              placeholder="e.g. 2025-26"
            />
          </div>

          <div className={`form-group ${newRole !== 'student' ? 'disabled' : ''}`}>
            <label>Semester</label>
            <input
              value={newSemester}
              onChange={(e) => setNewSemester(e.target.value)}
              disabled={newRole !== 'student'}
              placeholder="e.g. 6"
            />
          </div>

          <div className={`form-group ${newRole !== 'student' ? 'disabled' : ''}`}>
            <label>Section</label>
            <input
              value={newSection}
              onChange={(e) => setNewSection(e.target.value)}
              disabled={newRole !== 'student'}
              placeholder="e.g. A"
            />
          </div>

          <div className="form-actions">
            <button className="btn-primary" onClick={addUser} disabled={busyUserId === 'new'}>
              {busyUserId === 'new' ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>
      </div>

      <div className="panel">
        <h2>Bulk Onboard Students</h2>
        <p className="muted small">CSV/Text format: id_or_email,name,password,year,semester,section</p>

        <div className="import-format-warning">
          <strong>Format Warning:</strong>
          <span> Required columns are <code>id_or_email</code> and <code>name</code>.</span>
        </div>

        <div className="bulk-meta">
          <div className="form-group">
            <label>Year (fallback)</label>
            <input value={bulkYear} onChange={(e) => setBulkYear(e.target.value)} placeholder="e.g. 2025-26" />
          </div>
          <div className="form-group">
            <label>Semester (fallback)</label>
            <input value={bulkSemester} onChange={(e) => setBulkSemester(e.target.value)} placeholder="e.g. 6" />
          </div>
          <div className="form-group">
            <label>Section (fallback)</label>
            <input value={bulkSection} onChange={(e) => setBulkSection(e.target.value)} placeholder="e.g. A" />
          </div>
        </div>

        <div className="users-import-controls">
          <button className="btn-secondary" onClick={() => csvInputRef.current?.click()}>
            Load CSV File
          </button>
          {csvFileName && <span className="muted small">Loaded: {csvFileName}</span>}
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              try {
                await loadCsvFile(file)
              } catch {
                alert('Failed to read CSV file')
              }
            }}
          />
        </div>

        <textarea
          className="bulk-textarea"
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          placeholder="stu-03,John Doe,student123\nstu-04,Jane Smith\n..."
          rows={6}
        />

        {importPreview.rows.length > 0 && (
          <div className="import-preview">
            <div className="import-preview-header">
              <strong>Preview</strong>
              <span className="muted small">Valid: {importPreview.validRows.length} | Invalid: {importPreview.invalidCount}</span>
            </div>
            <div className="import-preview-table">
              <table>
                <thead>
                  <tr>
                    <th>Line</th>
                    <th>ID/Email</th>
                    <th>Name</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {importPreview.rows.slice(0, 12).map((row) => (
                    <tr key={`${row.lineNumber}-${row.id}-${row.name}`}>
                      <td>{row.lineNumber}</td>
                      <td>{row.id}</td>
                      <td>{row.name}</td>
                      <td>
                        <span className={`import-status ${row.valid ? 'ok' : 'error'}`}>{row.valid ? 'Valid' : row.issue || 'Invalid'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="form-actions">
          <button className="btn-primary" onClick={bulkOnboardStudents} disabled={isBulkImporting || importPreview.validRows.length === 0}>
            {isBulkImporting ? 'Importing...' : `Confirm Import ${importPreview.validRows.length} Students`}
          </button>
        </div>
      </div>

      <div className="panel">
        <h2>All Users</h2>
        <div className="users-table">
          <table>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={filteredUsers.length > 0 && selectedVisibleCount === filteredUsers.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        selectAllFiltered()
                      } else {
                        clearSelection()
                      }
                    }}
                  />
                </th>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Year</th>
                <th>Sem</th>
                <th>Sec</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id} className={selectedUserIds.includes(u.id) ? 'row-selected' : ''}>
                  <td>
                    <input type="checkbox" checked={selectedUserIds.includes(u.id)} onChange={() => toggleSelected(u.id)} />
                  </td>
                  <td className="mono">{u.id}</td>
                  <td>
                    <input value={u.name} onChange={(e) => updateUserField(u.id, { name: e.target.value })} />
                  </td>
                  <td>
                    <input value={u.email || ''} onChange={(e) => updateUserField(u.id, { email: e.target.value })} />
                  </td>
                  <td>
                    <select
                      value={u.role}
                      onChange={(e) => updateUserField(u.id, { role: e.target.value as UserRole })}
                      disabled={u.role === 'admin'}
                    >
                      <option value="student">student</option>
                      <option value="teacher">teacher</option>
                      <option value="hod">hod</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td>
                    <input
                      value={u.year || ''}
                      onChange={(e) => updateUserField(u.id, { year: e.target.value })}
                      disabled={u.role !== 'student'}
                    />
                  </td>
                  <td>
                    <input
                      value={u.semester || ''}
                      onChange={(e) => updateUserField(u.id, { semester: e.target.value })}
                      disabled={u.role !== 'student'}
                    />
                  </td>
                  <td>
                    <input
                      value={u.section || ''}
                      onChange={(e) => updateUserField(u.id, { section: e.target.value })}
                      disabled={u.role !== 'student'}
                    />
                  </td>
                  <td className="actions users-actions">
                    <button className="btn-primary" onClick={() => saveUser(u.id)} disabled={busyUserId === u.id || isBulkActionBusy}>
                      Save
                    </button>
                    {u.role !== 'admin' && (
                      <button className="btn-secondary" onClick={() => handleResetPassword(u.id)} disabled={busyUserId === u.id || isBulkActionBusy}>
                        Reset Password
                      </button>
                    )}
                    <button className="btn-danger" onClick={() => handleDeleteUser(u.id)} disabled={busyUserId === u.id || isBulkActionBusy}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}