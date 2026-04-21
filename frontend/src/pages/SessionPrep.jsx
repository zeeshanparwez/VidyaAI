import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateSession, listSessions, updateCoverage, generateQuiz, saveJournal } from '../api'
import { exportSessionPlanPDF } from '../utils/pdfExport'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function CalendarView({ sessions }) {
    const today = new Date()
    const [calYear, setCalYear] = useState(today.getFullYear())
    const [calMonth, setCalMonth] = useState(today.getMonth())
    const [selectedDay, setSelectedDay] = useState(null)

    // Build lookup: date string → sessions
    const sessionMap = {}
    sessions.forEach(s => {
        const key = s.date?.split('T')[0] || s.date
        if (!sessionMap[key]) sessionMap[key] = []
        sessionMap[key].push(s)
    })

    const statusColor = (st) => {
        if (st === 'completed') return '#22c55e'
        if (st === 'generated') return '#6c63ff'
        if (st === 'partial') return '#f59e0b'
        return '#6b7280'
    }
    const statusBg = (st) => {
        if (st === 'completed') return 'rgba(34,197,94,0.18)'
        if (st === 'generated') return 'rgba(108,99,255,0.18)'
        if (st === 'partial') return 'rgba(245,158,11,0.18)'
        return 'rgba(107,114,128,0.14)'
    }

    const firstDay = new Date(calYear, calMonth, 1).getDay()
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()

    const prevMonth = () => { if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) } else setCalMonth(m => m - 1) }
    const nextMonth = () => { if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) } else setCalMonth(m => m + 1) }

    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`

    const cells = []
    for (let i = 0; i < firstDay; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)

    const selKey = selectedDay ? `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(selectedDay).padStart(2,'0')}` : null
    const selSessions = selKey ? (sessionMap[selKey] || []) : []

    return (
        <div>
            {/* Calendar nav */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                <button className="btn btn-sm btn-secondary" onClick={prevMonth}>‹</button>
                <span style={{ fontWeight: 700, fontSize: 16, minWidth: 160, textAlign: 'center' }}>{MONTHS[calMonth]} {calYear}</span>
                <button className="btn btn-sm btn-secondary" onClick={nextMonth}>›</button>
                <button className="btn btn-sm btn-secondary" style={{ marginLeft: 'auto' }} onClick={() => { setCalYear(today.getFullYear()); setCalMonth(today.getMonth()) }}>Today</button>
            </div>

            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 2 }}>
                {DAYS.map(d => (
                    <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', padding: '4px 0', textTransform: 'uppercase', letterSpacing: 1 }}>{d}</div>
                ))}
            </div>

            {/* Calendar grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                {cells.map((day, idx) => {
                    if (!day) return <div key={`e${idx}`} />
                    const key = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
                    const daySessions = sessionMap[key] || []
                    const isToday = key === todayStr
                    const isSelected = selectedDay === day

                    return (
                        <div
                            key={key}
                            onClick={() => setSelectedDay(isSelected ? null : day)}
                            style={{
                                minHeight: 64, padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
                                background: isSelected ? 'rgba(108,99,255,0.15)' : 'var(--bg-primary)',
                                border: isSelected ? '1.5px solid var(--accent)' : isToday ? '1.5px solid rgba(108,99,255,0.4)' : '1px solid var(--border)',
                                transition: 'background 0.15s',
                            }}
                        >
                            <div style={{ fontSize: 12, fontWeight: isToday ? 800 : 500, color: isToday ? 'var(--accent)' : 'var(--text-primary)', marginBottom: 4 }}>
                                {day}
                            </div>
                            {daySessions.slice(0,2).map((s, i) => (
                                <div key={i} style={{ fontSize: 10, padding: '1px 4px', borderRadius: 3, marginBottom: 2, background: statusBg(s.coverage_status), color: statusColor(s.coverage_status), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {s.title || 'Session'}
                                </div>
                            ))}
                            {daySessions.length > 2 && <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>+{daySessions.length - 2}</div>}
                        </div>
                    )
                })}
            </div>

            {/* Selected day detail */}
            {selectedDay && (
                <div style={{ marginTop: 20, padding: '16px 20px', background: 'var(--bg-primary)', borderRadius: 10, border: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 700, marginBottom: 12 }}>
                        {MONTHS[calMonth]} {selectedDay}, {calYear}
                        {selSessions.length === 0 && <span style={{ marginLeft: 12, fontWeight: 400, color: 'var(--text-muted)', fontSize: 13 }}>No sessions planned</span>}
                    </div>
                    {selSessions.map(s => (
                        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, padding: '8px 12px', background: 'var(--bg-card)', borderRadius: 6, border: `1px solid ${statusColor(s.coverage_status)}33` }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: statusColor(s.coverage_status), flexShrink: 0 }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{s.title || 'Session'}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.prep_time_minutes} min prep</div>
                            </div>
                            <span className={`badge ${s.coverage_status === 'completed' ? 'badge-success' : s.coverage_status === 'generated' ? 'badge-accent' : s.coverage_status === 'partial' ? 'badge-warning' : 'badge-info'}`} style={{ fontSize: 10 }}>
                                {s.coverage_status}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Legend */}
            <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
                {[
                    { color: '#22c55e', label: 'Completed' },
                    { color: '#6c63ff', label: 'Generated' },
                    { color: '#f59e0b', label: 'Partial' },
                    { color: '#6b7280', label: 'Pending' },
                ].map(({ color, label }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default function SessionPrep({ user, selectedSubject }) {
    const navigate = useNavigate()
    const [sessions, setSessions] = useState([])
    const [activePlan, setActivePlan] = useState(null)
    const [generating, setGenerating] = useState(false)
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState('prep')
    const [creatingQuiz, setCreatingQuiz] = useState(null)
    const [quizSuccess, setQuizSuccess] = useState(null)
    const [journalModal, setJournalModal] = useState(null) // {planId, title}
    const [journalText, setJournalText] = useState('')
    const [journalInsights, setJournalInsights] = useState(null)
    const [savingJournal, setSavingJournal] = useState(false)

    useEffect(() => {
        if (selectedSubject) loadSessions()
    }, [selectedSubject])

    const loadSessions = async () => {
        setLoading(true)
        try {
            const data = await listSessions(selectedSubject.id)
            setSessions(data)
        } catch (err) { console.error(err) }
        setLoading(false)
    }

    const handleGenerate = async () => {
        setGenerating(true)
        try {
            const result = await generateSession(selectedSubject.id, user.user_id)
            setActivePlan(result)
            loadSessions()
        } catch (err) { alert(err.message) }
        setGenerating(false)
    }

    const handleCoverage = async (planId, status) => {
        try {
            await updateCoverage(planId, status)
            loadSessions()
        } catch (err) { console.error(err) }
    }

    const handleCreateQuiz = async (topicTitle, unitId) => {
        setCreatingQuiz(topicTitle)
        setQuizSuccess(null)
        try {
            const result = await generateQuiz({
                subject_id: selectedSubject.id,
                syllabus_unit_id: unitId || null,
                topic: topicTitle,
                num_questions: 5,
            })
            setQuizSuccess(result.title || topicTitle)
        } catch (err) { alert(err.message) }
        setCreatingQuiz(null)
    }

    const parsePlan = (planJson) => {
        try { return typeof planJson === 'string' ? JSON.parse(planJson) : planJson } catch { return {} }
    }

    const handleSaveJournal = async () => {
        if (!journalText.trim() || !journalModal) return
        setSavingJournal(true)
        try {
            const result = await saveJournal(journalModal.planId, journalText)
            setJournalInsights(result.insights)
        } catch (err) { alert(err.message) }
        setSavingJournal(false)
    }

    const openJournal = (planId, title) => {
        setJournalModal({ planId, title })
        setJournalText('')
        setJournalInsights(null)
    }

    if (!selectedSubject) {
        return (
            <div>
                <div className="page-header">
                    <h1>🎯 Session Preparation</h1>
                    <p>Select a subject from the Dashboard first.</p>
                </div>
            </div>
        )
    }

    return (
        <div>
            <div className="page-header">
                <h1>🎯 Session Prep — {selectedSubject.name}</h1>
                <p>AI-generated preparation plans for your upcoming class sessions</p>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {[
                    { id: 'prep', label: '🤖 Prep Plans' },
                    { id: 'calendar', label: '📅 Calendar' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Calendar Tab */}
            {activeTab === 'calendar' && (
                <div className="card">
                    <div className="card-header" style={{ marginBottom: 16 }}>
                        <span className="card-title">📅 Session Coverage Calendar</span>
                        <span className="badge badge-info">{sessions.length} sessions total</span>
                    </div>
                    {sessions.length > 0 ? (
                        <CalendarView sessions={sessions} />
                    ) : (
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px 0' }}>
                            No session plans yet — generate your first prep to populate the calendar.
                        </p>
                    )}
                </div>
            )}

            {activeTab === 'prep' && <>
            <button className="btn btn-primary" onClick={handleGenerate} disabled={generating} style={{ marginBottom: 24 }}>
                {generating ? '🔄 AI Agents Working...' : '🤖 Generate Today\'s Prep'}
            </button>

            {generating && (
                <div className="alert alert-info">
                    ⏳ Running 7 AI agents: Schedule → Syllabus → Planning → Content → Feedback → Scheduling → Personalization...
                </div>
            )}

            {/* Quiz Success Alert */}
            {quizSuccess && (
                <div className="alert alert-info" style={{ marginBottom: 16, borderLeft: '4px solid var(--success, #22c55e)' }}>
                    ✅ <strong>Quiz Created!</strong> "{quizSuccess}" is now published and available to all enrolled students.
                    <button onClick={() => setQuizSuccess(null)} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✕</button>
                </div>
            )}

            {/* Active Generated Plan */}
            {activePlan && !activePlan.error && (
                <div className="card" style={{ marginBottom: 24, borderColor: 'var(--accent)' }}>
                    <div className="card-header">
                        <span className="card-title">🆕 {activePlan.title || 'Generated Plan'}</span>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span className="badge badge-accent">⏱ {activePlan.prep_time_minutes} min prep</span>
                            {activePlan.content?.rag_sources_used > 0 && (
                                <span className="badge badge-success" title="Content was enriched using your uploaded syllabus">
                                    📚 {activePlan.content.rag_sources_used} syllabus source{activePlan.content.rag_sources_used !== 1 ? 's' : ''}
                                </span>
                            )}
                            {activePlan.content?.rag_sources_used === 0 && (
                                <span className="badge badge-warning" title="Upload a syllabus document to enable RAG-powered content">
                                    📚 No syllabus sources — upload a document
                                </span>
                            )}
                            {activePlan.plan_id && (
                                <button
                                    className="btn btn-sm btn-secondary"
                                    onClick={() => navigate(`/session/live/${activePlan.plan_id}`)}
                                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--accent)', color: 'var(--accent)' }}
                                    title="Launch fullscreen presentation mode"
                                >
                                    🖥️ Present
                                </button>
                            )}
                            <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => exportSessionPlanPDF(activePlan, selectedSubject?.name)}
                                title="Export as PDF"
                            >
                                📄 Export PDF
                            </button>
                            <button
                                className="btn btn-sm btn-primary"
                                onClick={() => handleCreateQuiz(activePlan.title || 'Session Topic', activePlan.syllabus_unit_id)}
                                disabled={creatingQuiz !== null}
                            >
                                {creatingQuiz === (activePlan.title || 'Session Topic') ? '🔄 Creating...' : '📝 Create Quiz'}
                            </button>
                        </div>
                    </div>

                    {/* Content sections */}
                    {(() => {
                        const content = activePlan.content || {}
                        return (
                            <>
                                {content.key_concepts?.length > 0 && (
                                    <div className="plan-section">
                                        <h3 style={{ display: 'flex', alignItems: 'center' }}>💡 Key Concepts <span className="agent-label">Content Curation Agent</span></h3>
                                        {content.key_concepts.map((c, i) => (
                                            <div key={i} className="concept-card">
                                                <h4>{c.concept} <span className={`badge badge-${c.importance === 'high' ? 'danger' : 'info'}`} style={{ marginLeft: 8 }}>{c.importance}</span></h4>
                                                <p>{c.explanation}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {content.common_misconceptions?.length > 0 && (
                                    <div className="plan-section">
                                        <h3 style={{ display: 'flex', alignItems: 'center' }}>⚠️ Common Misconceptions <span className="agent-label">Content Curation Agent</span></h3>
                                        {content.common_misconceptions.map((m, i) => (
                                            <div key={i} className="concept-card">
                                                <h4>❌ {m.misconception}</h4>
                                                <p>✅ {m.correction}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {content.explanation_flow?.length > 0 && (
                                    <div className="plan-section">
                                        <h3 style={{ display: 'flex', alignItems: 'center' }}>🔄 Teaching Flow <span className="agent-label">Session Planning Agent</span></h3>
                                        {content.explanation_flow.map((step, i) => (
                                            <div key={i} className="flow-step">
                                                <div className="step-num">{step.step || i + 1}</div>
                                                <div>
                                                    <strong>{step.activity}</strong>
                                                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                                                        ⏱ {step.duration_minutes} min • {step.notes}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {content.examples?.length > 0 && (
                                    <div className="plan-section">
                                        <h3 style={{ display: 'flex', alignItems: 'center' }}>📋 Examples <span className="agent-label">Content Curation Agent</span></h3>
                                        {content.examples.map((ex, i) => (
                                            <div key={i} className="concept-card">
                                                <h4>{ex.title} <span className="badge badge-info">{ex.difficulty}</span></h4>
                                                <p>{ex.content}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {content.quick_questions?.length > 0 && (
                                    <div className="plan-section">
                                        <h3 style={{ display: 'flex', alignItems: 'center' }}>❓ Quick Questions <span className="agent-label">Session Planning Agent</span></h3>
                                        {content.quick_questions.map((q, i) => (
                                            <div key={i} className="concept-card">
                                                <h4>Q{i + 1}: {q.question}</h4>
                                                <p><strong>Expected:</strong> {q.expected_answer}</p>
                                                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Purpose: {q.purpose}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )
                    })()}

                    {activePlan.explanation && (
                        <div className="explanation-box">
                            <h4>🧠 Why This Content?</h4>
                            <p>{activePlan.explanation}</p>
                        </div>
                    )}

                    {activePlan.personalization_adjustments?.length > 0 && (
                        <div style={{ marginTop: 12, padding: '12px 16px', background: 'var(--success-bg)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 'var(--radius-sm)' }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)', marginBottom: 6 }}>✨ Personalised for your teaching style:</p>
                            {activePlan.personalization_adjustments.map((adj, i) => (
                                <p key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>• {adj}</p>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Past Sessions */}
            {sessions.length > 0 && (
                <div className="card">
                    <h3 style={{ marginBottom: 16 }}>📋 Session History</h3>
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Title</th>
                                    <th>Prep Time</th>
                                    <th>Coverage</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sessions.map(s => (
                                    <tr key={s.id}>
                                        <td>{s.date}</td>
                                        <td>{s.title || 'Session'}</td>
                                        <td>{s.prep_time_minutes} min</td>
                                        <td>
                                            <span className={`badge ${s.coverage_status === 'completed' ? 'badge-success' : s.coverage_status === 'partial' ? 'badge-warning' : 'badge-info'}`}>
                                                {s.coverage_status}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                                <button className="btn btn-sm btn-success" onClick={() => handleCoverage(s.id, 'completed')}>✅</button>
                                                <button className="btn btn-sm btn-secondary" onClick={() => handleCoverage(s.id, 'partial')} style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>🔄</button>
                                                <button className="btn btn-sm btn-secondary" onClick={() => handleCoverage(s.id, 'pending')}>⏳</button>
                                                <button className="btn btn-sm btn-secondary" onClick={() => {
                                                    const plan = parsePlan(s.plan_json)
                                                    setActivePlan({ ...s, content: plan, prep_time_minutes: s.prep_time_minutes })
                                                }}>👁 View</button>
                                                <button className="btn btn-sm btn-secondary" onClick={() => openJournal(s.id, s.title || 'Session')} title="Post-session journal">✍️</button>
                                                <button
                                                    className="btn btn-sm btn-secondary"
                                                    onClick={() => navigate(`/session/live/${s.id}`)}
                                                    style={{ border: '1px solid var(--accent)', color: 'var(--accent)' }}
                                                    title="Launch presentation mode"
                                                >
                                                    🖥️
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-primary"
                                                    onClick={() => handleCreateQuiz(s.title || 'Session Topic', s.syllabus_unit_id)}
                                                    disabled={creatingQuiz !== null}
                                                >
                                                    {creatingQuiz === (s.title || 'Session Topic') ? '🔄...' : '📝 Quiz'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            </>}

            {/* Journal Modal */}
            {journalModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.65)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
                    onClick={(e) => { if (e.target === e.currentTarget) { setJournalModal(null); setJournalInsights(null) } }}>
                    <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius)', padding: 28, maxWidth: 560, width: '100%', border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                            <div>
                                <h3 style={{ margin: 0 }}>✍️ Session Journal</h3>
                                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{journalModal.title}</p>
                            </div>
                            <button onClick={() => { setJournalModal(null); setJournalInsights(null) }} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }}>✕</button>
                        </div>

                        {!journalInsights ? (
                            <>
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>How did this session go? Share your reflections and AI will extract key insights.</p>
                                <textarea
                                    value={journalText}
                                    onChange={e => setJournalText(e.target.value)}
                                    placeholder="What went well? What was challenging? How did students respond? Any adjustments for next time?"
                                    rows={6}
                                    style={{ width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', color: 'var(--text-primary)', fontSize: 14, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                                />
                                <button
                                    className="btn btn-primary"
                                    onClick={handleSaveJournal}
                                    disabled={savingJournal || !journalText.trim()}
                                    style={{ marginTop: 14, width: '100%' }}
                                >
                                    {savingJournal ? '🔄 AI Analysing...' : '💾 Save & Get Insights'}
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="alert alert-info" style={{ marginBottom: 16 }}>✅ Journal saved — here are your AI insights:</div>
                                {journalInsights.what_went_well?.length > 0 && (
                                    <div style={{ marginBottom: 14 }}>
                                        <h4 style={{ color: 'var(--success)', marginBottom: 8 }}>✅ What Went Well</h4>
                                        {journalInsights.what_went_well.map((item, i) => <p key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>• {item}</p>)}
                                    </div>
                                )}
                                {journalInsights.challenges?.length > 0 && (
                                    <div style={{ marginBottom: 14 }}>
                                        <h4 style={{ color: 'var(--warning)', marginBottom: 8 }}>⚠️ Challenges</h4>
                                        {journalInsights.challenges.map((item, i) => <p key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>• {item}</p>)}
                                    </div>
                                )}
                                {journalInsights.improvements?.length > 0 && (
                                    <div style={{ marginBottom: 14 }}>
                                        <h4 style={{ color: 'var(--accent)', marginBottom: 8 }}>💡 Improvements</h4>
                                        {journalInsights.improvements.map((item, i) => <p key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>• {item}</p>)}
                                    </div>
                                )}
                                {journalInsights.suggested_follow_up && (
                                    <div className="explanation-box" style={{ marginBottom: 14 }}>
                                        <h4>🎯 Suggested Follow-up</h4>
                                        <p>{journalInsights.suggested_follow_up}</p>
                                    </div>
                                )}
                                {journalInsights.student_engagement && (
                                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                        Student engagement: <strong style={{ color: journalInsights.student_engagement === 'high' ? 'var(--success)' : journalInsights.student_engagement === 'low' ? '#ef4444' : 'var(--warning)' }}>{journalInsights.student_engagement}</strong>
                                    </div>
                                )}
                                <button className="btn btn-secondary" onClick={() => setJournalInsights(null)} style={{ marginTop: 16, width: '100%' }}>← Edit Journal</button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
