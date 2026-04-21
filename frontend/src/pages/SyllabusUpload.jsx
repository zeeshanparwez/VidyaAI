import React, { useState, useEffect, useRef } from 'react'
import { uploadSyllabus, uploadSyllabusFile, getSyllabus, updateUnitStatus, getTopicInsights } from '../api'

export default function SyllabusUpload({ user, selectedSubject }) {
    const [units, setUnits] = useState([])
    const [content, setContent] = useState('')
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [uploadMode, setUploadMode] = useState('text') // 'text' or 'file'
    const [selectedFile, setSelectedFile] = useState(null)
    const [dragOver, setDragOver] = useState(false)
    const [insightsModal, setInsightsModal] = useState(null) // {unit, data} or null
    const [loadingInsights, setLoadingInsights] = useState(null) // unit id being loaded
    const fileInputRef = useRef(null)

    const ACCEPTED_TYPES = '.pdf,.docx,.txt,.md'
    const ACCEPTED_EXTENSIONS = ['pdf', 'docx', 'txt', 'md']

    useEffect(() => {
        if (selectedSubject) loadUnits()
    }, [selectedSubject])

    const loadUnits = async () => {
        setLoading(true)
        try {
            const data = await getSyllabus(selectedSubject.id)
            setUnits(data)
        } catch (err) { console.error(err) }
        setLoading(false)
    }

    const handleUpload = async () => {
        if (!content.trim()) return
        setUploading(true)
        try {
            const created = await uploadSyllabus(selectedSubject.id, content, user?.user_id)
            setUnits([...units, ...created])
            setContent('')
        } catch (err) { alert(err.message) }
        setUploading(false)
    }

    const handleViewInsights = async (unit) => {
        setLoadingInsights(unit.id)
        try {
            const data = await getTopicInsights(unit.id)
            setInsightsModal({ unit, data })
        } catch (err) { alert('Could not load insights: ' + err.message) }
        setLoadingInsights(null)
    }

    const validateFile = (file) => {
        if (!file) return false
        const ext = file.name.split('.').pop().toLowerCase()
        if (!ACCEPTED_EXTENSIONS.includes(ext)) {
            alert(`Unsupported file type: .${ext}\nSupported formats: PDF, DOCX, TXT, MD`)
            return false
        }
        if (file.size > 20 * 1024 * 1024) {
            alert('File too large. Maximum size is 20MB.')
            return false
        }
        return true
    }

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0]
        if (file && validateFile(file)) {
            setSelectedFile(file)
        }
    }

    const handleDragOver = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setDragOver(true)
    }

    const handleDragLeave = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setDragOver(false)
    }

    const handleDrop = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setDragOver(false)
        const file = e.dataTransfer.files?.[0]
        if (file && validateFile(file)) {
            setSelectedFile(file)
        }
    }

    const handleFileUpload = async () => {
        if (!selectedFile) return
        setUploading(true)
        try {
            const created = await uploadSyllabusFile(selectedSubject.id, selectedFile)
            setUnits([...units, ...created])
            setSelectedFile(null)
            if (fileInputRef.current) fileInputRef.current.value = ''
        } catch (err) { alert(err.message) }
        setUploading(false)
    }

    const handleStatusChange = async (unitId, newStatus) => {
        try {
            const updated = await updateUnitStatus(unitId, newStatus)
            setUnits(units.map(u => u.id === unitId ? updated : u))
        } catch (err) { console.error(err) }
    }

    const getFileIcon = (filename) => {
        if (!filename) return '📄'
        const ext = filename.split('.').pop().toLowerCase()
        if (ext === 'pdf') return '📕'
        if (ext === 'docx') return '📘'
        if (ext === 'txt') return '📝'
        if (ext === 'md') return '📋'
        return '📄'
    }

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    if (!selectedSubject) {
        return (
            <div>
                <div className="page-header">
                    <h1>📚 Syllabus Management</h1>
                    <p>Please select a subject from the Dashboard first.</p>
                </div>
            </div>
        )
    }

    const statusIcon = { completed: '✅', partial: '🔄', pending: '⏳' }
    const statusBadge = { completed: 'badge-success', partial: 'badge-warning', pending: 'badge-info' }

    return (
        <div>
            <div className="page-header">
                <h1>📚 Syllabus — {selectedSubject.name}</h1>
                <p>Upload syllabus content and track coverage for each topic</p>
            </div>

            {/* Upload Section */}
            <div className="card" style={{ marginBottom: 24 }}>
                <h3 style={{ marginBottom: 16 }}>📤 Upload Syllabus Content</h3>

                {/* Upload Mode Tabs */}
                <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid var(--border)' }}>
                    <button
                        onClick={() => setUploadMode('text')}
                        style={{
                            padding: '10px 24px',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: uploadMode === 'text' ? '2px solid var(--accent)' : '2px solid transparent',
                            color: uploadMode === 'text' ? 'var(--accent)' : 'var(--text-secondary)',
                            fontWeight: uploadMode === 'text' ? 600 : 400,
                            cursor: 'pointer',
                            marginBottom: -2,
                            fontSize: 14,
                            transition: 'all 0.2s ease',
                        }}
                    >
                        ✏️ Paste Text
                    </button>
                    <button
                        onClick={() => setUploadMode('file')}
                        style={{
                            padding: '10px 24px',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: uploadMode === 'file' ? '2px solid var(--accent)' : '2px solid transparent',
                            color: uploadMode === 'file' ? 'var(--accent)' : 'var(--text-secondary)',
                            fontWeight: uploadMode === 'file' ? 600 : 400,
                            cursor: 'pointer',
                            marginBottom: -2,
                            fontSize: 14,
                            transition: 'all 0.2s ease',
                        }}
                    >
                        📁 Upload File
                    </button>
                </div>

                {/* Text Upload Mode */}
                {uploadMode === 'text' && (
                    <>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 12 }}>
                            Paste your syllabus text below. AI will automatically parse it into structured topics.
                        </p>
                        <div className="form-group">
                            <textarea
                                className="form-textarea"
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                placeholder="Paste your syllabus content here...&#10;&#10;Example:&#10;Unit 1: Introduction to Programming — Variables, data types, basic I/O, operators (2 hours)&#10;Unit 2: Control Flow — If-else, loops, switch statements (3 hours)&#10;..."
                                style={{ minHeight: 160 }}
                            />
                        </div>
                        <button className="btn btn-primary" onClick={handleUpload} disabled={uploading || !content.trim()}>
                            {uploading ? '🔄 AI is parsing...' : '🤖 Upload & Parse with AI'}
                        </button>
                    </>
                )}

                {/* File Upload Mode */}
                {uploadMode === 'file' && (
                    <>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 12 }}>
                            Upload a PDF, DOCX, TXT, or MD file. AI will extract and parse the content automatically.
                        </p>

                        {/* Drag & Drop Zone */}
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                border: `2px dashed ${dragOver ? 'var(--accent)' : selectedFile ? 'var(--success, #22c55e)' : 'var(--border)'}`,
                                borderRadius: 12,
                                padding: selectedFile ? '20px 24px' : '40px 24px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                background: dragOver ? 'rgba(99, 102, 241, 0.08)' : selectedFile ? 'rgba(34, 197, 94, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                                marginBottom: 16,
                            }}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={ACCEPTED_TYPES}
                                onChange={handleFileSelect}
                                style={{ display: 'none' }}
                            />

                            {selectedFile ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                                    <span style={{ fontSize: 32 }}>{getFileIcon(selectedFile.name)}</span>
                                    <div style={{ textAlign: 'left' }}>
                                        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
                                            {selectedFile.name}
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                            {formatFileSize(selectedFile.size)} • Click or drop to replace
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setSelectedFile(null)
                                            if (fileInputRef.current) fileInputRef.current.value = ''
                                        }}
                                        style={{
                                            background: 'rgba(239, 68, 68, 0.15)',
                                            border: 'none',
                                            borderRadius: 6,
                                            color: '#ef4444',
                                            padding: '4px 10px',
                                            cursor: 'pointer',
                                            fontSize: 13,
                                            marginLeft: 8,
                                        }}
                                    >
                                        ✕ Remove
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div style={{ fontSize: 40, marginBottom: 8 }}>
                                        {dragOver ? '📥' : '📂'}
                                    </div>
                                    <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                                        {dragOver ? 'Drop your file here' : 'Drag & drop your syllabus file here'}
                                    </p>
                                    <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                                        or click to browse • Supports <strong>PDF</strong>, <strong>DOCX</strong>, <strong>TXT</strong>, <strong>MD</strong>
                                    </p>
                                </>
                            )}
                        </div>

                        <button className="btn btn-primary" onClick={handleFileUpload} disabled={uploading || !selectedFile}>
                            {uploading ? '🔄 AI is extracting & parsing...' : '🤖 Upload & Parse with AI'}
                        </button>
                    </>
                )}
            </div>

            {/* Units Table */}
            {loading ? (
                <div className="loading"><div className="spinner" /><p>Loading syllabus...</p></div>
            ) : units.length > 0 ? (
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">Syllabus Units ({units.length})</span>
                        <span className="badge badge-accent">
                            {units.filter(u => u.status === 'completed').length}/{units.length} completed
                        </span>
                    </div>
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Topic</th>
                                    <th>Hours</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {units.map(unit => (
                                    <tr key={unit.id}>
                                        <td>{unit.order}</td>
                                        <td>
                                            <strong>{unit.title}</strong>
                                            {unit.description && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{unit.description}</p>}
                                        </td>
                                        <td>{unit.estimated_hours}h</td>
                                        <td>
                                            <span className={`badge ${statusBadge[unit.status]}`}>
                                                {statusIcon[unit.status]} {unit.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                                <button className="btn btn-sm btn-success" onClick={() => handleStatusChange(unit.id, 'completed')} title="Mark completed">✅</button>
                                                <button className="btn btn-sm btn-secondary" onClick={() => handleStatusChange(unit.id, 'partial')} title="Mark partial" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>🔄</button>
                                                <button className="btn btn-sm btn-secondary" onClick={() => handleStatusChange(unit.id, 'pending')} title="Mark pending">⏳</button>
                                                <button
                                                    className="btn btn-sm btn-secondary"
                                                    onClick={() => handleViewInsights(unit)}
                                                    disabled={loadingInsights === unit.id}
                                                    title="AI-generated topic insights"
                                                    style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}
                                                >
                                                    {loadingInsights === unit.id ? '⏳' : '🔍 Insights'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
                    <p style={{ color: 'var(--text-secondary)' }}>No syllabus units yet. Upload content above to get started.</p>
                </div>
            )}

            {/* Topic Insights Modal */}
            {insightsModal && (
                <div className="modal-overlay" onClick={() => setInsightsModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                            <div>
                                <h2 style={{ marginBottom: 4 }}>🔍 {insightsModal.unit.title}</h2>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <span className={`badge ${statusBadge[insightsModal.unit.status]}`}>{insightsModal.unit.status}</span>
                                    {insightsModal.data.engagement_metrics?.total_quizzes > 0 && (
                                        <span className="badge badge-info">
                                            Avg score: {insightsModal.data.engagement_metrics.average_score ?? '—'}%
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button className="btn btn-sm btn-secondary" onClick={() => setInsightsModal(null)}>✕ Close</button>
                        </div>

                        {insightsModal.data.key_areas?.length > 0 && (
                            <div className="plan-section">
                                <h3>📌 Key Areas</h3>
                                {insightsModal.data.key_areas.map((area, i) => (
                                    <div key={i} className="concept-card">
                                        <h4>{area.area} <span className={`badge badge-${area.importance === 'high' ? 'danger' : area.importance === 'medium' ? 'warning' : 'info'}`}>{area.importance}</span></h4>
                                        <p>{area.description}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {insightsModal.data.teaching_flow && Object.keys(insightsModal.data.teaching_flow).length > 0 && (
                            <div className="plan-section">
                                <h3>🔄 Teaching Flow</h3>
                                {Object.entries(insightsModal.data.teaching_flow).map(([phase, text], i) => (
                                    <div key={i} className="flow-step">
                                        <div className="step-num">{i + 1}</div>
                                        <div>
                                            <strong style={{ textTransform: 'capitalize' }}>{phase.replace('_', ' ')}</strong>
                                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{text}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {insightsModal.data.common_misconceptions?.length > 0 && (
                            <div className="plan-section">
                                <h3>⚠️ Common Misconceptions</h3>
                                {insightsModal.data.common_misconceptions.map((m, i) => (
                                    <div key={i} className="concept-card">
                                        <h4>❌ {m.misconception}</h4>
                                        <p>✅ {m.correction}</p>
                                        {m.how_to_address && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>💡 {m.how_to_address}</p>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
