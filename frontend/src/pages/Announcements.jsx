import React, { useState, useEffect } from 'react'
import {
    createAnnouncement, getTeacherAnnouncements, getStudentAnnouncements,
    togglePin, deleteAnnouncement, listSubjects,
} from '../api'

const PRIORITY_META = {
    info: { label: 'Info', color: 'var(--accent)', icon: 'ℹ️' },
    reminder: { label: 'Reminder', color: '#f59e0b', icon: '🔔' },
    urgent: { label: 'Urgent', color: '#ef4444', icon: '🚨' },
}

function AnnouncementCard({ ann, isTeacher, onPin, onDelete }) {
    const meta = PRIORITY_META[ann.priority] || PRIORITY_META.info
    const dateStr = new Date(ann.created_at).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
    })
    return (
        <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderLeft: `4px solid ${meta.color}`, borderRadius: 10,
            padding: '16px 20px', marginBottom: 12,
            boxShadow: ann.pinned ? '0 2px 12px rgba(0,0,0,0.15)' : 'none',
        }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 20, lineHeight: 1 }}>{meta.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{ann.title}</span>
                        {ann.pinned && <span style={{ fontSize: 11, background: 'var(--accent)', color: '#fff', borderRadius: 4, padding: '1px 6px' }}>📌 Pinned</span>}
                        <span style={{ fontSize: 11, background: `${meta.color}22`, color: meta.color, borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>{meta.label}</span>
                    </div>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '4px 0 8px', lineHeight: 1.5 }}>{ann.body}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                        <span>👤 {ann.teacher_name}</span>
                        <span>📅 {dateStr}</span>
                    </div>
                </div>
                {isTeacher && (
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button
                            onClick={() => onPin(ann.id)}
                            title={ann.pinned ? 'Unpin' : 'Pin to top'}
                            style={{ background: ann.pinned ? 'var(--accent)' : 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 14 }}
                        >📌</button>
                        <button
                            onClick={() => onDelete(ann.id)}
                            title="Delete"
                            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 14, color: '#ef4444' }}
                        >🗑️</button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default function Announcements({ user, selectedSubject }) {
    const isTeacher = user?.role === 'teacher'
    const [announcements, setAnnouncements] = useState([])
    const [loading, setLoading] = useState(true)
    const [subjects, setSubjects] = useState([])
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({ title: '', body: '', priority: 'info', subject_id: '', pinned: false })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [filterPriority, setFilterPriority] = useState('all')

    useEffect(() => { load() }, [user])
    useEffect(() => {
        if (isTeacher && user?.user_id) {
            listSubjects(user.user_id).then(setSubjects).catch(() => {})
        }
    }, [user, isTeacher])

    const load = async () => {
        setLoading(true)
        try {
            if (isTeacher) {
                const data = await getTeacherAnnouncements(user.user_id)
                setAnnouncements(data)
            } else {
                const data = await getStudentAnnouncements(user.user_id)
                setAnnouncements(data)
            }
        } catch (e) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = async (e) => {
        e.preventDefault()
        if (!form.title.trim() || !form.body.trim()) {
            setError('Title and message are required.')
            return
        }
        setSaving(true)
        setError('')
        try {
            await createAnnouncement({
                teacher_id: user.user_id,
                subject_id: form.subject_id ? parseInt(form.subject_id) : null,
                title: form.title,
                body: form.body,
                priority: form.priority,
                pinned: form.pinned,
            })
            setForm({ title: '', body: '', priority: 'info', subject_id: '', pinned: false })
            setShowForm(false)
            load()
        } catch (e) {
            setError(e.message)
        } finally {
            setSaving(false)
        }
    }

    const handlePin = async (id) => {
        await togglePin(id)
        load()
    }

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this announcement?')) return
        await deleteAnnouncement(id)
        load()
    }

    const filtered = filterPriority === 'all'
        ? announcements
        : announcements.filter(a => a.priority === filterPriority)

    return (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 8px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: 22 }}>📢 Announcements</h2>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
                        {isTeacher ? 'Post updates and reminders to your students' : 'Updates from your teachers'}
                    </p>
                </div>
                {isTeacher && (
                    <button
                        className="btn btn-primary"
                        onClick={() => { setShowForm(v => !v); setError('') }}
                    >
                        {showForm ? '✕ Cancel' : '+ New Announcement'}
                    </button>
                )}
            </div>

            {/* Create form */}
            {isTeacher && showForm && (
                <form onSubmit={handleCreate} style={{
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 12, padding: 20, marginBottom: 24,
                }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: 15 }}>New Announcement</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Title *</label>
                            <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Quiz this Friday" required />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Course (optional)</label>
                            <select className="form-select" value={form.subject_id} onChange={e => setForm(f => ({ ...f, subject_id: e.target.value }))}>
                                <option value="">All my courses</option>
                                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Message *</label>
                        <textarea
                            className="form-input"
                            value={form.body}
                            onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                            placeholder="Write your announcement..."
                            rows={3}
                            style={{ resize: 'vertical' }}
                            required
                        />
                    </div>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 140 }}>
                            <label>Priority</label>
                            <select className="form-select" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                                <option value="info">ℹ️ Info</option>
                                <option value="reminder">🔔 Reminder</option>
                                <option value="urgent">🚨 Urgent</option>
                            </select>
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, paddingTop: 18 }}>
                            <input type="checkbox" checked={form.pinned} onChange={e => setForm(f => ({ ...f, pinned: e.target.checked }))} />
                            📌 Pin to top
                        </label>
                        <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: 18 }}>
                            {saving ? '⏳ Posting...' : '📢 Post Announcement'}
                        </button>
                    </div>
                    {error && <div className="alert alert-warning" style={{ marginTop: 12 }}>{error}</div>}
                </form>
            )}

            {/* Filters */}
            {announcements.length > 0 && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                    {['all', 'info', 'reminder', 'urgent'].map(p => (
                        <button
                            key={p}
                            onClick={() => setFilterPriority(p)}
                            style={{
                                padding: '4px 12px', borderRadius: 20, border: '1px solid var(--border)',
                                cursor: 'pointer', fontSize: 12, fontWeight: 600,
                                background: filterPriority === p ? 'var(--accent)' : 'var(--bg-primary)',
                                color: filterPriority === p ? '#fff' : 'var(--text-secondary)',
                            }}
                        >
                            {p === 'all' ? '📋 All' : `${PRIORITY_META[p].icon} ${PRIORITY_META[p].label}`}
                            {p !== 'all' && ` (${announcements.filter(a => a.priority === p).length})`}
                        </button>
                    ))}
                </div>
            )}

            {/* List */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>Loading...</div>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
                    <p style={{ fontSize: 15 }}>
                        {announcements.length === 0
                            ? isTeacher ? 'No announcements yet. Post one to notify students.' : 'No announcements from your teachers yet.'
                            : 'No announcements match this filter.'}
                    </p>
                </div>
            ) : (
                <div>
                    {filtered.map(ann => (
                        <AnnouncementCard
                            key={ann.id}
                            ann={ann}
                            isTeacher={isTeacher}
                            onPin={handlePin}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
