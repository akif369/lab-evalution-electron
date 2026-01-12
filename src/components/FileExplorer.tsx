import { useState } from 'react'
import type { ProjectFile } from '../types'
import './FileExplorer.css'

interface FileExplorerProps {
  files: ProjectFile[]
  activeFileId: string | null
  onFileSelect: (fileId: string) => void
  onFileCreate: (name: string) => void
  onFileDelete: (fileId: string) => void
  onFolderCreate: (name: string) => void
}

export function FileExplorer({
  files,
  activeFileId,
  onFileSelect,
  onFileCreate,
  onFileDelete,
  onFolderCreate,
}: FileExplorerProps) {
  const [showCreateFile, setShowCreateFile] = useState(false)
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [newFileName, setNewFileName] = useState('')
  const [newFolderName, setNewFolderName] = useState('')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  const rootFiles = files.filter((f) => !f.path.includes('/') || f.path.split('/').length === 1)
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

  const handleCreateFile = () => {
    if (newFileName.trim()) {
      onFileCreate(newFileName.trim())
      setNewFileName('')
      setShowCreateFile(false)
    }
  }

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onFolderCreate(newFolderName.trim())
      setNewFolderName('')
      setShowCreateFolder(false)
    }
  }

  const renderFile = (file: ProjectFile, level: number = 0) => {
    const isActive = file.id === activeFileId
    const isFolder = file.type === 'folder'
    const isExpanded = expandedFolders.has(file.id)
    const children = files.filter(
      (f) => f.path.startsWith(file.path + '/') && f.path.split('/').length === file.path.split('/').length + 1,
    )

    return (
      <div key={file.id} style={{ paddingLeft: `${level * 16}px` }}>
        <div
          className={`file-item ${isActive ? 'active' : ''} ${isFolder ? 'folder' : ''}`}
          onClick={() => {
            if (isFolder) {
              toggleFolder(file.id)
            } else {
              onFileSelect(file.id)
            }
          }}
        >
          <span className="file-icon">
            {isFolder ? (isExpanded ? '📂' : '📁') : getFileIcon(file.name)}
          </span>
          <span className="file-name">{file.name}</span>
          {!isFolder && !file.isReadonly && (
            <button
              className="file-delete-btn"
              onClick={(e) => {
                e.stopPropagation()
                if (confirm(`Delete ${file.name}?`)) {
                  onFileDelete(file.id)
                }
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
            📄
          </button>
          <button
            className="icon-btn"
            onClick={() => {
              setShowCreateFolder(true)
              setShowCreateFile(false)
            }}
            title="New Folder"
          >
            📁
          </button>
        </div>
      </div>

      {showCreateFile && (
        <div className="create-item">
          <input
            type="text"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCreateFile()}
            onBlur={handleCreateFile}
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
            onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
            onBlur={handleCreateFolder}
            placeholder="Folder name..."
            autoFocus
          />
        </div>
      )}

      <div className="file-tree">
        {folders.map((folder) => renderFile(folder))}
        {rootLevelFiles.map((file) => renderFile(file))}
        {files.length === 0 && (
          <div className="empty-state">
            <p>No files yet</p>
            <p className="muted small">Create a file to get started</p>
          </div>
        )}
      </div>
    </div>
  )
}

function getFileIcon(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase()
  const iconMap: Record<string, string> = {
    js: '📜',
    ts: '📘',
    jsx: '⚛️',
    tsx: '⚛️',
    py: '🐍',
    java: '☕',
    cpp: '⚙️',
    c: '⚙️',
    html: '🌐',
    css: '🎨',
    json: '📋',
    md: '📝',
    txt: '📄',
  }
  return iconMap[ext || ''] || '📄'
}
