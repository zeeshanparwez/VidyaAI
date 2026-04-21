import React, { useState, useEffect, useRef } from 'react'

const BASE = '/api'

async function apiFetch(path, options = {}) {
    const token = localStorage.getItem('ac_access_token')
    const res = await fetch(`${BASE}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail || 'Request failed')
    }
    if (res.status === 204) return null
    return res.json()
}

const ROLE_COLORS = {
    admin:   { bg: '#fef3c7', color: '#92400e', label: 'Admin' },
    teacher: { bg: '#dbeafe', color: '#1e40af', label: 'Teacher' },
    student: { bg: '#dcfce7', color: '#166534', label: 'Student' },
}

function RoleBadge({ role }) {
    const s = ROLE_COLORS[role] || { bg: '#f3f4f6', color: '#374151', label: role }
    return (
        <span style={{ background: s.bg, color: s.color, borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
            {s.label}
        </span>
    )
}

function StatCard({ icon, value, label, sub }) {
    return (
        <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16,
        }}>
            <div style={{ fontSize: 32, lineHeight: 1 }}>{icon}</div>
            <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>{value ?? '—'}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{label}</div>
                {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
            </div>
        </div>
    )
}

export default function AdminPanel({ user }) {
    const [tab, setTab]           = useState('overview')
    const [stats, setStats]       = useState(null)
    const [users, setUsers]       = useState([])
    const [courses, setCourses]   = useState([])
    const [loading, setLoading]   = useState(true)
    const [search, setSearch]     = useState('')
    const [roleFilter, setRoleFilter] = useState('all')
    const [showAdd, setShowAdd]   = useState(false)
    const [editUser, setEditUser] = useState(null)
    const [form, setForm]         = useState({ name: '', email: '', password: '', role: 'student' })
    const [saving, setSaving]     = useState(false)
    const [error, setError]       = useState('')
    const [success, setSuccess]   = useState('')
    const [importing, setImporting] = useState(false)
    const [importResult, setImportResult] = useState(null)
    const fileRef = useRef(null)

    useEffect(() => { loadAll() }, [])

    const loadAll = async () => {
        setLoading(true)
        try {
            const [s, u, c] = await Promise.all([
                apiFetch('/admin/stats'),
                apiFetch('/admin/users'),
                apiFetch('/admin/courses'),
            ])
            setStats(s); setUsers(u); setCourses(c)
        } catch (e) { setError(e.message) }
        finally { setLoading(false) }
    }

    const handleAddUser = async (e) => {
        e.preventDefault()
        setSaving(true); setError('')
        try {
            await apiFetch('/admin/users', { method: 'POST', body: JSON.stringify(form) })
            setSuccess(`User ${form.name} created.`)
            setForm({ name: '', email: '', password: '', role: 'student' })
            setShowAdd(false)
            loadAll()
        } catch (e) { setError(e.message) }
        finally { setSaving(false) }
    }

    const handleEditSave = async (e) => {
        e.preventDefault()
        setSaving(true); setError('')
        try {
            await apiFetch(`/admin/users/${editUser.id}`, {
                method: 'PUT',
                body: JSON.stringify({ name: editUser.name, email: editUser.email, role: editUser.role }),
            })
            setSuccess('User updated.')
            setEditUser(null)
            loadAll()
        } catch (e) { setError(e.message) }
        finally { setSaving(false) }
    }

    const handleDelete = async (u) => {
        if (!window.confirm(`Delete ${u.name}? This cannot be undone.`)) return
        try {
            await apiFetch(`/admin/users/${u.id}`, { method: 'DELETE' })
            setSuccess(`${u.name} deleted.`)
            loadAll()
        } catch (e) { setError(e.message) }
    }

    const handleImport = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        setImporting(true); setImportResult(null); setError('')
        try {
            const token = localStorage.getItem('ac_access_token')
            const fd = new FormData()
            fd.append('file', file)
            const res = await fetch(`${BASE}/admin/bulk-import`, {
                method: 'POST',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                body: fd,
            })
            const data = await res.json()
            setImportResult(data)
            loadAll()
        } catch (e) { setError(e.message) }
        finally { setImporting(false); e.target.value = '' }
    }

    const downloadTemplate = () => {
        const csv = 'name,email,password,role\nPriya Sharma,priya@school.edu,Pass@123,teacher\nRahul Verma,rahul@school.edu,Pass@123,teacher\nAarav Patel,aarav@school.edu,Pass@123,student'
        const blob = new Blob([csv], { type: 'text/csv' })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = 'users_template.csv'
        a.click()
    }

    const filtered = users.filter(u => {
        const matchRole = roleFilter === 'all' || u.role === roleFilter
        const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
        return matchRole && matchSearch
    })

    const TABS = [
        { id: 'overview', label: '📊 Overview' },
        { id: 'users',    label: `👥 Users (${users.length})` },
        { id: 'courses',  label: `📚 Courses (${courses.length})` },
        { id: 'import',   label: '📥 Bulk Import' },
    ]

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 8px' }}>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <h2 style={{ margin: 0, fontSize: 22 }}>🛡️ Admin Panel</h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
                    VidyaTech Institute — User &amp; course management
                </p>
            </div>

            {/* Alerts */}
            {error   && <div className="alert alert-warning" style={{ marginBottom: 16 }}>{error} <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>✕</button></div>}
            {success && <div className="alert alert-success" style={{ marginBottom: 16 }}>{success} <button onClick={() => setSuccess('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>✕</button></div>}

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg-primary)', borderRadius: 8, padding: 4, flexWrap: 'wrap' }}>
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} style={{
                        padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
                        fontWeight: 600, fontSize: 13, transition: 'all 0.15s',
                        background: tab === t.id ? 'var(--accent)' : 'transparent',
                        color: tab === t.id ? '#fff' : 'var(--text-secondary)',
                    }}>{t.label}</button>
                ))}
            </div>

            {loading && <div className="loading"><div className="spinner" /><p>Loading...</p></div>}

            {/* ── Overview Tab ── */}
            {!loading && tab === 'overview' && stats && (
                <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                        <StatCard icon="👥" value={stats.total_users}     label="Total Users"     sub={`${stats.total_teachers} teachers · ${stats.total_students} students`} />
                        <StatCard icon="📚" value={stats.total_courses}   label="Courses"         sub={`${stats.published_courses} published`} />
                        <StatCard icon="🎯" value={stats.total_sessions}  label="Session Plans"   sub={`${stats.completed_sessions} completed`} />
                        <StatCard icon="📝" value={stats.total_quizzes}   label="Quizzes"         sub={`${stats.total_responses} responses`} />
                        <StatCard icon="🎓" value={stats.total_enrollments} label="Enrollments"   sub="active" />
                        <StatCard icon="📊" value={stats.avg_quiz_score != null ? `${stats.avg_quiz_score}%` : '—'} label="Avg Quiz Score" sub="across all quizzes" />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        {/* Role breakdown */}
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
                            <h3 style={{ margin: '0 0 16px', fontSize: 15 }}>User Breakdown</h3>
                            {[
                                { role: 'admin',   count: users.filter(u => u.role === 'admin').length,   icon: '🛡️' },
                                { role: 'teacher', count: users.filter(u => u.role === 'teacher').length, icon: '👩‍🏫' },
                                { role: 'student', count: users.filter(u => u.role === 'student').length, icon: '🎓' },
                            ].map(({ role, count, icon }) => (
                                <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                    <span style={{ fontSize: 18 }}>{icon}</span>
                                    <span style={{ flex: 1, fontSize: 14, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{role}s</span>
                                    <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--accent)' }}>{count}</span>
                                    <div style={{ width: 80, height: 6, background: 'var(--bg-primary)', borderRadius: 3, overflow: 'hidden' }}>
                                        <div style={{ height: '100%', background: 'var(--accent)', borderRadius: 3, width: `${users.length ? (count / users.length) * 100 : 0}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Course summary */}
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
                            <h3 style={{ margin: '0 0 16px', fontSize: 15 }}>Active Courses</h3>
                            {courses.slice(0, 5).map(c => (
                                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.teacher} · {c.code}</div>
                                    </div>
                                    <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, flexShrink: 0 }}>{c.enrolled_students} enrolled</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Users Tab ── */}
            {!loading && tab === 'users' && (
                <div>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                        <input
                            className="form-input"
                            placeholder="🔍 Search by name or email..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ flex: 1, minWidth: 200 }}
                        />
                        <select className="form-select" value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ width: 130 }}>
                            <option value="all">All Roles</option>
                            <option value="admin">Admin</option>
                            <option value="teacher">Teacher</option>
                            <option value="student">Student</option>
                        </select>
                        <button className="btn btn-primary" onClick={() => { setShowAdd(v => !v); setError('') }}>
                            {showAdd ? '✕ Cancel' : '+ Add User'}
                        </button>
                    </div>

                    {/* Add user form */}
                    {showAdd && (
                        <form onSubmit={handleAddUser} style={{ background: 'var(--bg-card)', border: '1px solid var(--accent)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                            <h4 style={{ margin: '0 0 12px', fontSize: 14 }}>New User</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Full Name *</label>
                                    <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Aarav Patel" required />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Email *</label>
                                    <input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@vidyatech.edu" required />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Password *</label>
                                    <input className="form-input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 6 chars" required minLength={6} />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Role *</label>
                                    <select className="form-select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                                        <option value="student">Student</option>
                                        <option value="teacher">Teacher</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ marginTop: 12 }} disabled={saving}>
                                {saving ? '⏳ Creating...' : '✅ Create User'}
                            </button>
                        </form>
                    )}

                    {/* Edit user form */}
                    {editUser && (
                        <form onSubmit={handleEditSave} style={{ background: 'var(--bg-card)', border: '1px solid var(--accent)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
                            <h4 style={{ margin: '0 0 12px', fontSize: 14 }}>Edit — {editUser.name}</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Full Name</label>
                                    <input className="form-input" value={editUser.name} onChange={e => setEditUser(u => ({ ...u, name: e.target.value }))} required />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Email</label>
                                    <input className="form-input" type="email" value={editUser.email} onChange={e => setEditUser(u => ({ ...u, email: e.target.value }))} required />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label>Role</label>
                                    <select className="form-select" value={editUser.role} onChange={e => setEditUser(u => ({ ...u, role: e.target.value }))}>
                                        <option value="student">Student</option>
                                        <option value="teacher">Teacher</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? '⏳ Saving...' : '💾 Save Changes'}</button>
                                <button type="button" className="btn btn-secondary" onClick={() => setEditUser(null)}>Cancel</button>
                            </div>
                        </form>
                    )}

                    {/* Users table */}
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border)' }}>
                                    {['Name', 'Email', 'Role', 'Courses/Enrolled', 'Actions'].map(h => (
                                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 && (
                                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 13 }}>No users found.</td></tr>
                                )}
                                {filtered.map((u, i) => (
                                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-primary)' }}>
                                        <td style={{ padding: '10px 14px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                                                    {u.name.charAt(0)}
                                                </div>
                                                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-secondary)' }}>{u.email}</td>
                                        <td style={{ padding: '10px 14px' }}><RoleBadge role={u.role} /></td>
                                        <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-muted)' }}>
                                            {u.role === 'teacher' ? `${u.courses_taught} course${u.courses_taught !== 1 ? 's' : ''}` :
                                             u.role === 'student' ? `${u.enrolled_in} enrolled` : '—'}
                                        </td>
                                        <td style={{ padding: '10px 14px' }}>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button onClick={() => { setEditUser({ ...u }); setShowAdd(false) }} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', fontSize: 12 }}>✏️ Edit</button>
                                                {u.id !== user?.user_id && (
                                                    <button onClick={() => handleDelete(u)} style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 5, padding: '3px 8px', cursor: 'pointer', fontSize: 12, color: '#dc2626' }}>🗑️</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
                            Showing {filtered.length} of {users.length} users
                        </div>
                    </div>
                </div>
            )}

            {/* ── Courses Tab ── */}
            {!loading && tab === 'courses' && (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border)' }}>
                                {['Course', 'Code', 'Teacher', 'Enrolled', 'Status', 'Term'].map(h => (
                                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {courses.map((c, i) => (
                                <tr key={c.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-primary)' }}>
                                    <td style={{ padding: '12px 14px' }}>
                                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</div>
                                    </td>
                                    <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-muted)' }}>{c.code}</td>
                                    <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-secondary)' }}>{c.teacher}</td>
                                    <td style={{ padding: '12px 14px' }}>
                                        <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
                                            {c.enrolled_students}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 14px' }}>
                                        <span style={{ background: c.is_published ? '#dcfce7' : '#fef3c7', color: c.is_published ? '#166534' : '#92400e', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                                            {c.is_published ? '✅ Published' : '⏳ Draft'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-muted)' }}>
                                        {c.term_start && c.term_end ? `${c.term_start} → ${c.term_end}` : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Bulk Import Tab ── */}
            {!loading && tab === 'import' && (
                <div style={{ maxWidth: 600 }}>
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 20 }}>
                        <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>📥 Bulk User Import</h3>
                        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-muted)' }}>
                            Upload a CSV file to create multiple users at once. Duplicate emails are automatically skipped.
                        </p>

                        <div style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: 14, marginBottom: 16, fontSize: 13 }}>
                            <strong>CSV format:</strong>
                            <code style={{ display: 'block', marginTop: 6, color: 'var(--accent)', fontSize: 12 }}>
                                name, email, password, role<br />
                                Aarav Patel, aarav@school.edu, Pass@123, student<br />
                                Dr. Priya Sharma, priya@school.edu, Pass@123, teacher
                            </code>
                        </div>

                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <button className="btn btn-secondary" onClick={downloadTemplate}>
                                📄 Download Template
                            </button>
                            <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
                                {importing ? '⏳ Importing...' : '📂 Choose CSV File'}
                                <input ref={fileRef} type="file" accept=".csv" onChange={handleImport} style={{ display: 'none' }} disabled={importing} />
                            </label>
                        </div>
                    </div>

                    {importResult && (
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
                            <h4 style={{ margin: '0 0 12px', fontSize: 15 }}>Import Results</h4>
                            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: 28, fontWeight: 800, color: '#22c55e' }}>{importResult.created}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Created</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: 28, fontWeight: 800, color: '#f59e0b' }}>{importResult.skipped}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Skipped</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: 28, fontWeight: 800, color: '#ef4444' }}>{importResult.errors}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Errors</div>
                                </div>
                            </div>
                            {importResult.details?.skipped?.length > 0 && (
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                    <strong>Skipped:</strong> {importResult.details.skipped.map(s => s.email).join(', ')}
                                </div>
                            )}
                            {importResult.details?.errors?.length > 0 && (
                                <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>
                                    <strong>Errors:</strong> {importResult.details.errors.map(e => `Row ${e.row}: ${e.reason}`).join('; ')}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
