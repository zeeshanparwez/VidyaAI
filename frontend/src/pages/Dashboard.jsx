import React, { useState, useEffect } from 'react'
import { listSubjects, createSubject, getAnalytics, getTodaySessions, updatePreferences, getUser } from '../api'

export default function Dashboard({ user, selectedSubject, onSelectSubject }) {
    const [subjects, setSubjects] = useState([])
    const [analytics, setAnalytics] = useState(null)
    const [todaySessions, setTodaySessions] = useState(null)
    const [showCreate, setShowCreate] = useState(false)
    const [showPrefs, setShowPrefs] = useState(false)
    const [prefs, setPrefs] = useState({ style: 'detailed', examples: 'real-world', quiz_difficulty: 'medium', pace: 'moderate' })
    const [savingPrefs, setSavingPrefs] = useState(false)
    const [newSubject, setNewSubject] = useState({ name: '', code: '', description: '' })
    const [loading, setLoading] = useState(true)

    useEffect(() => { loadSubjects(); loadTodaySessions() }, [user])
    useEffect(() => {
        if (selectedSubject) loadAnalytics(selectedSubject.id)
    }, [selectedSubject])

    const loadSubjects = async () => {
        try {
            const data = await listSubjects(user?.user_id)
            setSubjects(data)
            if (data.length > 0 && !selectedSubject) onSelectSubject(data[0])
            // Load user preferences
            if (user?.user_id) {
                const me = await getUser(user.user_id)
                if (me.preferences_json) {
                    try { setPrefs(JSON.parse(me.preferences_json)) } catch {}
                }
            }
        } catch (err) { console.error(err) }
        setLoading(false)
    }

    const loadTodaySessions = async () => {
        if (!user?.user_id) return
        try {
            const data = await getTodaySessions(user.user_id)
            setTodaySessions(data)
        } catch (err) { console.error(err) }
    }

    const loadAnalytics = async (subjectId) => {
        try {
            const data = await getAnalytics(subjectId)
            setAnalytics(data)
        } catch (err) { console.error(err) }
    }

    const handleSavePrefs = async () => {
        setSavingPrefs(true)
        try {
            await updatePreferences(user.user_id, prefs)
            setShowPrefs(false)
        } catch (err) { alert(err.message) }
        setSavingPrefs(false)
    }

    const handleCreate = async (e) => {
        e.preventDefault()
        try {
            const yr = new Date().getFullYear()
            const created = await createSubject({
                ...newSubject,
                teacher_id: user.user_id,
                term_start: `${yr}-01-15`,
                term_end: `${yr}-06-30`,
            })
            setSubjects([...subjects, created])
            onSelectSubject(created)
            setShowCreate(false)
            setNewSubject({ name: '', code: '', description: '' })
        } catch (err) { console.error(err) }
    }

    if (loading) return <div className="loading"><div className="spinner" /><p>Loading dashboard...</p></div>

    return (
        <div>
            <div className="page-header">
                <h1>Welcome, {user?.name} 👋</h1>
                <p>Your AI-powered session preparation dashboard</p>
            </div>

            {/* Subject selector + actions */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
                {subjects.map(s => (
                    <button
                        key={s.id}
                        className={`btn ${selectedSubject?.id === s.id ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => onSelectSubject(s)}
                    >
                        {s.code || '📖'} {s.name}
                    </button>
                ))}
                <button className="btn btn-secondary" onClick={() => setShowCreate(!showCreate)}>
                    + New Subject
                </button>
                <button className="btn btn-secondary" onClick={() => setShowPrefs(!showPrefs)} style={{ marginLeft: 'auto' }}>
                    ⚙️ My Preferences
                </button>
            </div>

            {/* Preferences editor */}
            {showPrefs && (
                <div className="card" style={{ marginBottom: 24, borderColor: 'var(--accent)' }}>
                    <div className="card-header">
                        <span className="card-title">⚙️ Teaching Preferences</span>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Controls how AI personalises content for you</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Content Style</label>
                            <select className="form-select" value={prefs.style} onChange={e => setPrefs({ ...prefs, style: e.target.value })}>
                                <option value="detailed">Detailed</option>
                                <option value="concise">Concise</option>
                            </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Example Type</label>
                            <select className="form-select" value={prefs.examples} onChange={e => setPrefs({ ...prefs, examples: e.target.value })}>
                                <option value="real-world">Real-world</option>
                                <option value="theoretical">Theoretical</option>
                            </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Quiz Difficulty</label>
                            <select className="form-select" value={prefs.quiz_difficulty} onChange={e => setPrefs({ ...prefs, quiz_difficulty: e.target.value })}>
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                            </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Teaching Pace</label>
                            <select className="form-select" value={prefs.pace} onChange={e => setPrefs({ ...prefs, pace: e.target.value })}>
                                <option value="slow">Slow</option>
                                <option value="moderate">Moderate</option>
                                <option value="fast">Fast</option>
                            </select>
                        </div>
                    </div>
                    <button className="btn btn-primary" onClick={handleSavePrefs} disabled={savingPrefs}>
                        {savingPrefs ? '⏳ Saving...' : '💾 Save Preferences'}
                    </button>
                </div>
            )}

            {/* Create subject form */}
            {showCreate && (
                <div className="card" style={{ marginBottom: 24 }}>
                    <h3 style={{ marginBottom: 16 }}>Create New Subject</h3>
                    <form onSubmit={handleCreate}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div className="form-group">
                                <label>Subject Name</label>
                                <input className="form-input" value={newSubject.name} onChange={e => setNewSubject({ ...newSubject, name: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Subject Code</label>
                                <input className="form-input" value={newSubject.code} onChange={e => setNewSubject({ ...newSubject, code: e.target.value })} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Description</label>
                            <input className="form-input" value={newSubject.description} onChange={e => setNewSubject({ ...newSubject, description: e.target.value })} />
                        </div>
                        <button type="submit" className="btn btn-primary">Create Subject</button>
                    </form>
                </div>
            )}

            {/* Today's Sessions */}
            {todaySessions && todaySessions.total_sessions > 0 && (
                <div className="card" style={{ marginBottom: 24 }}>
                    <div className="card-header">
                        <span className="card-title">📅 Today — {todaySessions.day_name}</span>
                        <span className="badge badge-accent">{todaySessions.total_sessions} session{todaySessions.total_sessions !== 1 ? 's' : ''}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {todaySessions.sessions.map((s, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                                <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 13, minWidth: 110 }}>{s.time}</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: 14 }}>{s.subject_name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.topic} • {s.room}</div>
                                </div>
                                <span className={`badge ${s.status === 'generated' ? 'badge-success' : s.status === 'completed' ? 'badge-accent' : 'badge-warning'}`}>
                                    {s.status === 'generated' ? '✅ Prepared' : s.status === 'completed' ? '✔ Done' : '⏳ Not prepared'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Stats */}
            {selectedSubject && analytics && (
                <>
                    <div className="stat-cards">
                        <div className="stat-card">
                            <div className="stat-icon">📚</div>
                            <div className="stat-value">{analytics.total_units}</div>
                            <div className="stat-label">Total Units</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">✅</div>
                            <div className="stat-value">{analytics.completed_units}</div>
                            <div className="stat-label">Completed</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">🔄</div>
                            <div className="stat-value">{analytics.partial_units}</div>
                            <div className="stat-label">In Progress</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">⏳</div>
                            <div className="stat-value">{analytics.pending_units}</div>
                            <div className="stat-label">Pending</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">📝</div>
                            <div className="stat-value">{analytics.total_quizzes}</div>
                            <div className="stat-label">Quizzes</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">📊</div>
                            <div className="stat-value">{analytics.average_quiz_score != null ? `${analytics.average_quiz_score}%` : 'N/A'}</div>
                            <div className="stat-label">Avg Quiz Score</div>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="card" style={{ marginBottom: 24 }}>
                        <div className="card-header">
                            <span className="card-title">Syllabus Progress — {selectedSubject.name}</span>
                            <span className="badge badge-info">{((analytics.completed_units / Math.max(analytics.total_units, 1)) * 100).toFixed(0)}%</span>
                        </div>
                        <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${(analytics.completed_units / Math.max(analytics.total_units, 1)) * 100}%` }} />
                        </div>
                    </div>

                    {/* Weak topics */}
                    {analytics.weak_topics?.length > 0 && (
                        <div className="alert alert-warning">
                            ⚠️ <strong>Attention needed:</strong> {analytics.weak_topics.join(', ')}
                        </div>
                    )}

                    {/* Agent decisions */}
                    <div className="card">
                        <div className="card-header">
                            <span className="card-title">🤖 AI Agent Activity</span>
                            <span className="badge badge-accent">{analytics.agent_decisions_count} decisions</span>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                            {analytics.total_sessions} session plans generated • {analytics.agent_decisions_count} AI decisions made for this subject
                        </p>
                    </div>
                </>
            )}

            {!selectedSubject && (
                <div className="card" style={{ textAlign: 'center', padding: 60 }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>📖</div>
                    <h3>No Subject Selected</h3>
                    <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
                        Create a subject or select one above to get started.
                    </p>
                </div>
            )}
        </div>
    )
}
