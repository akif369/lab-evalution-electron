import { useMemo, useState, type JSX } from 'react'
import { File, FileCode2, FileJson, FileText, Folder, FolderOpen, Search } from 'lucide-react'
import type { ProjectFile } from '../types'
import './FileExplorer.css'

interface FileExplorerProps {
  files: ProjectFile[]
  activeFileId: string | null
  onFileSelect: (fileId: string) => void
  onFileCreate: (name: string) => void
  onFileDelete: (fileId: string) => void
  onFolderCreate: (name: string) => void
  onItemRename: (fileId: string, newName: string) => void
}

export function FileExplorer({
  files,
  activeFileId,
  onFileSelect,
  onFileCreate,
  onFileDelete,
  onFolderCreate,
  onItemRename,
}: FileExplorerProps) {
  const [showCreateFile, setShowCreateFile] = useState(false)
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [newFileName, setNewFileName] = useState('')
  const [newFolderName, setNewFolderName] = useState('')
  const [search, setSearch] = useState('')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const restoreFocus = (previousActive: Element | null) => {
    setTimeout(() => {
      window.focus()
      const el = previousActive as HTMLElement | null
      if (el && typeof el.focus === 'function' && document.contains(el)) {
        el.focus()
      }
    }, 0)
  }

  const filteredFiles = useMemo(
    () =>
      files.filter((f) =>
        search.trim()
          ? f.name.toLowerCase().includes(search.toLowerCase()) ||
            f.path.toLowerCase().includes(search.toLowerCase())
          : true,
      ),
    [files, search],
  )

  const rootFiles = filteredFiles.filter((f) => !f.path.includes('/') || f.path.split('/').length === 1)
  const folders = rootFiles.filter((f) => f.type === 'folder')
  const rootLevelFiles = rootFiles.filter((f) => f.type === 'file')

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }

  const cancelCreateFile = () => {
    setNewFileName('')
    setShowCreateFile(false)
  }

  const cancelCreateFolder = () => {
    setNewFolderName('')
    setShowCreateFolder(false)
  }

  const handleCreateFile = () => {
    if (!newFileName.trim()) return
    onFileCreate(newFileName.trim())
    setNewFileName('')
    setShowCreateFile(false)
  }

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return
    onFolderCreate(newFolderName.trim())
    setNewFolderName('')
    setShowCreateFolder(false)
  }

  const startRename = (file: ProjectFile) => {
    if (file.isReadonly) return
    setRenamingId(file.id)
    setRenameValue(file.name)
  }

  const cancelRename = () => {
    setRenamingId(null)
    setRenameValue('')
  }

  const commitRename = () => {
    if (!renamingId) return
    const nextName = renameValue.trim()
    if (!nextName) {
      cancelRename()
      return
    }
    onItemRename(renamingId, nextName)
    cancelRename()
  }

  const renderFile = (file: ProjectFile, level: number = 0) => {
    const isActive = file.id === activeFileId
    const isFolder = file.type === 'folder'
    const isExpanded = expandedFolders.has(file.id)
    const isRenaming = renamingId === file.id
    const children = filteredFiles.filter(
      (f) => f.path.startsWith(file.path + '/') && f.path.split('/').length === file.path.split('/').length + 1,
    )

    return (
      <div key={file.id} style={{ paddingLeft: `${level * 16}px` }}>
        <div
          className={`file-item ${isActive ? 'active' : ''} ${isFolder ? 'folder' : ''}`}
          onClick={() => {
            if (isRenaming) return
            if (isFolder) {
              toggleFolder(file.id)
            } else {
              onFileSelect(file.id)
            }
          }}
        >
          <span className="file-icon">
            {isFolder ? (
              isExpanded ? (
                <FolderOpen size={16} />
              ) : (
                <Folder size={16} />
              )
            ) : (
              getFileIcon(file.name)
            )}
          </span>
          {isRenaming ? (
            <input
              className="file-rename-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename()
                if (e.key === 'Escape') cancelRename()
              }}
              onBlur={cancelRename}
              autoFocus
            />
          ) : (
            <span className="file-name" onDoubleClick={() => startRename(file)}>
              {file.name}
            </span>
          )}
          {!file.isReadonly && !isRenaming && (
            <button
              className="file-rename-btn"
              onClick={(e) => {
                e.stopPropagation()
                startRename(file)
              }}
              title="Rename"
            >
              ✎
            </button>
          )}
          {!file.isReadonly && !isRenaming && (
            <button
              className="file-delete-btn"
              onClick={(e) => {
                e.stopPropagation()
                const previousActive = document.activeElement
                const label = isFolder ? 'folder' : 'file'
                const ok = confirm(`Delete ${label} ${file.name}?`)
                restoreFocus(previousActive)
                if (!ok) return
                onFileDelete(file.id)
                setExpandedFolders((prev) => {
                  if (!prev.has(file.id)) return prev
                  const next = new Set(prev)
                  next.delete(file.id)
                  return next
                })
              }}
            >
              ×
            </button>
          )}
        </div>
        {isFolder && isExpanded && (
          <div className="folder-children">
            {children.map((child) => renderFile(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="file-explorer">
      <div className="file-explorer-header">
        <h4>Files</h4>
        <div className="file-actions">
          <button
            className="icon-btn"
            onClick={() => {
              setShowCreateFile(true)
              setShowCreateFolder(false)
            }}
            title="New File"
          >
            <FileCode2 size={16} />
          </button>
          <button
            className="icon-btn"
            onClick={() => {
              setShowCreateFolder(true)
              setShowCreateFile(false)
            }}
            title="New Folder"
          >
            <Folder size={16} />
          </button>
        </div>
      </div>

      <div className="file-search">
        <span className="file-search-icon">
          <Search size={12} />
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter files..."
        />
      </div>

      {showCreateFile && (
        <div className="create-item">
          <input
            type="text"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateFile()
              if (e.key === 'Escape') cancelCreateFile()
            }}
            onBlur={cancelCreateFile}
            placeholder="File name..."
            autoFocus
          />
        </div>
      )}

      {showCreateFolder && (
        <div className="create-item">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateFolder()
              if (e.key === 'Escape') cancelCreateFolder()
            }}
            onBlur={cancelCreateFolder}
            placeholder="Folder name..."
            autoFocus
          />
        </div>
      )}

      <div className="file-tree">
        {folders.map((folder) => renderFile(folder))}
        {rootLevelFiles.map((file) => renderFile(file))}
        {filteredFiles.length === 0 && (
          <div className="empty-state">
            <p>No files yet</p>
            <p className="muted small">Create a file to get started</p>
          </div>
        )}
      </div>
    </div>
  )
}

function getFileIcon(fileName: string): JSX.Element {
  const ext = fileName.split('.').pop()?.toLowerCase()

  switch (ext) {
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
    case 'c':
    case 'cpp':
    case 'java':
      return <FileCode2 size={16} />
    case 'json':
      return <FileJson size={16} />
    case 'md':
    case 'txt':
      return <FileText size={16} />
    case 'html':
    case 'css':
      return <FileCode2 size={16} />
    default:
      return <File size={16} />
  }
}
