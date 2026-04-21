import React, { useState, useEffect } from 'react'
import { getAnalytics, getScheduleAdjustments, getAgentDecisions, getHeatmap, getTermReport } from '../api'
import { exportTermReportPDF } from '../utils/pdfExport'

export default function Analytics({ user, selectedSubject }) {
    const [analytics, setAnalytics] = useState(null)
    const [schedule, setSchedule] = useState(null)
    const [decisions, setDecisions] = useState([])
    const [heatmap, setHeatmap] = useState(null)
    const [loadingHeatmap, setLoadingHeatmap] = useState(false)
    const [termReport, setTermReport] = useState(null)
    const [loadingReport, setLoadingReport] = useState(false)
    const [activeTab, setActiveTab] = useState('overview')
    const [loading, setLoading] = useState(false)
    const [expandedDecision, setExpandedDecision] = useState(null)

    useEffect(() => {
        if (selectedSubject) loadData()
    }, [selectedSubject])

    const loadData = async () => {
        setLoading(true)
        try {
            const [a, d] = await Promise.all([
                getAnalytics(selectedSubject.id),
                getAgentDecisions(selectedSubject.id),
            ])
            setAnalytics(a)
            setDecisions(d)
        } catch (err) { console.error(err) }
        setLoading(false)
    }

    const loadSchedule = async () => {
        try {
            const data = await getScheduleAdjustments(selectedSubject.id)
            setSchedule(data)
        } catch (err) { console.error(err) }
    }

    const loadHeatmap = async () => {
        setLoadingHeatmap(true)
        try {
            const data = await getHeatmap(selectedSubject.id)
            setHeatmap(data)
        } catch (err) { console.error(err) }
        setLoadingHeatmap(false)
    }

    const loadTermReport = async () => {
        setLoadingReport(true)
        try {
            const data = await getTermReport(selectedSubject.id)
            setTermReport(data)
        } catch (err) { console.error(err) }
        setLoadingReport(false)
    }

    if (!selectedSubject) {
        return (
            <div>
                <div className="page-header"><h1>📈 Analytics</h1><p>Select a subject from the Dashboard first.</p></div>
            </div>
        )
    }

    if (loading) return <div className="loading"><div className="spinner" /><p>Loading analytics...</p></div>

    return (
        <div>
            <div className="page-header">
                <h1>📈 Analytics — {selectedSubject.name}</h1>
                <p>Performance insights, feedback analysis, and AI decision audit trail</p>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
                {[
                    { id: 'overview', label: '📊 Overview' },
                    { id: 'heatmap', label: '🗺️ Heatmap' },
                    { id: 'schedule', label: '📅 Schedule' },
                    { id: 'decisions', label: '🤖 AI Decisions' },
                    { id: 'report', label: '📋 Term Report' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => {
                            setActiveTab(tab.id)
                            if (tab.id === 'schedule' && !schedule) loadSchedule()
                            if (tab.id === 'heatmap' && !heatmap) loadHeatmap()
                            if (tab.id === 'report' && !termReport) loadTermReport()
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && analytics && (
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
                            <div className="stat-icon">📝</div>
                            <div className="stat-value">{analytics.total_quizzes}</div>
                            <div className="stat-label">Quizzes Created</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">📊</div>
                            <div className="stat-value">{analytics.average_quiz_score != null ? `${analytics.average_quiz_score}%` : '—'}</div>
                            <div className="stat-label">Avg Score</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">🎯</div>
                            <div className="stat-value">{analytics.total_sessions}</div>
                            <div className="stat-label">Sessions Planned</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">🤖</div>
                            <div className="stat-value">{analytics.agent_decisions_count}</div>
                            <div className="stat-label">AI Decisions</div>
                        </div>
                    </div>

                    {/* Coverage Progress */}
                    <div className="card" style={{ marginBottom: 24 }}>
                        <h3 style={{ marginBottom: 16 }}>📊 Coverage Progress</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--success)' }}>{analytics.completed_units}</div>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Completed</div>
                                <div className="progress-bar" style={{ marginTop: 8 }}>
                                    <div className="progress-fill" style={{ width: `${(analytics.completed_units / Math.max(analytics.total_units, 1)) * 100}%`, background: 'var(--success)' }} />
                                </div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--warning)' }}>{analytics.partial_units}</div>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>In Progress</div>
                                <div className="progress-bar" style={{ marginTop: 8 }}>
                                    <div className="progress-fill" style={{ width: `${(analytics.partial_units / Math.max(analytics.total_units, 1)) * 100}%`, background: 'var(--warning)' }} />
                                </div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-muted)' }}>{analytics.pending_units}</div>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Pending</div>
                                <div className="progress-bar" style={{ marginTop: 8 }}>
                                    <div className="progress-fill" style={{ width: `${(analytics.pending_units / Math.max(analytics.total_units, 1)) * 100}%`, background: 'var(--text-muted)' }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Weak Topics */}
                    {analytics.weak_topics?.length > 0 && (
                        <div className="card">
                            <h3 style={{ marginBottom: 16 }}>⚠️ Topics Needing Attention</h3>
                            {analytics.weak_topics.map((topic, i) => (
                                <div key={i} className="alert alert-warning" style={{ marginBottom: 8 }}>
                                    📌 {topic}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Heatmap Tab */}
            {activeTab === 'heatmap' && (
                <div className="card">
                    <div className="card-header" style={{ marginBottom: 16 }}>
                        <span className="card-title">🗺️ Student × Topic Performance Heatmap</span>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                            Quiz scores per student per assessed topic
                        </span>
                    </div>

                    {loadingHeatmap && <div className="loading"><div className="spinner" /><p>Building heatmap...</p></div>}

                    {!loadingHeatmap && heatmap && heatmap.total_topics_assessed === 0 && (
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px 0' }}>
                            No quiz data yet — generate quizzes and collect student responses to see the heatmap.
                        </p>
                    )}

                    {!loadingHeatmap && heatmap && heatmap.total_topics_assessed > 0 && (
                        <>
                            {/* Legend */}
                            <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Legend:</span>
                                {[
                                    { color: '#22c55e', label: '≥ 80% — Strong' },
                                    { color: '#f59e0b', label: '60–79% — Developing' },
                                    { color: '#ef4444', label: '< 60% — Needs help' },
                                    { color: 'var(--bg-primary)', label: 'No data', border: true },
                                ].map(({ color, label, border }) => (
                                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <div style={{
                                            width: 16, height: 16, borderRadius: 3, background: color,
                                            border: border ? '1px solid var(--border)' : 'none',
                                        }} />
                                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Heatmap grid */}
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: `${heatmap.topics.length * 90 + 160}px` }}>
                                    <thead>
                                        <tr>
                                            <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, borderBottom: '2px solid var(--border)', minWidth: 150 }}>
                                                Student
                                            </th>
                                            {heatmap.topics.map(t => (
                                                <th key={t.unit_id} style={{
                                                    padding: '8px 6px', fontSize: 11, color: 'var(--text-secondary)',
                                                    fontWeight: 600, textAlign: 'center', borderBottom: '2px solid var(--border)',
                                                    maxWidth: 90, wordBreak: 'break-word', lineHeight: 1.3,
                                                }}>
                                                    {t.title}
                                                    <div style={{ marginTop: 2 }}>
                                                        <span className={`badge ${t.status === 'completed' ? 'badge-success' : t.status === 'partial' ? 'badge-warning' : 'badge-info'}`} style={{ fontSize: 9 }}>
                                                            {t.status}
                                                        </span>
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {heatmap.students.map((student, idx) => (
                                            <tr key={student.student_id} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                                                <td style={{ padding: '8px 12px', fontSize: 13, fontWeight: 500, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                                                    {student.student_name}
                                                </td>
                                                {heatmap.topics.map(t => {
                                                    const score = student.scores[t.unit_id]
                                                    const bg = score == null
                                                        ? 'var(--bg-primary)'
                                                        : score >= 80 ? 'rgba(34,197,94,0.25)'
                                                        : score >= 60 ? 'rgba(245,158,11,0.25)'
                                                        : 'rgba(239,68,68,0.25)'
                                                    const textColor = score == null
                                                        ? 'var(--text-muted)'
                                                        : score >= 80 ? '#22c55e'
                                                        : score >= 60 ? '#f59e0b'
                                                        : '#ef4444'
                                                    return (
                                                        <td key={t.unit_id} style={{
                                                            padding: '8px 6px', textAlign: 'center', fontSize: 13,
                                                            fontWeight: 700, background: bg, color: textColor,
                                                            borderBottom: '1px solid var(--border)',
                                                            borderLeft: '1px solid var(--border)',
                                                        }}>
                                                            {score != null ? `${score}%` : '—'}
                                                        </td>
                                                    )
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)', textAlign: 'right' }}>
                                {heatmap.total_students} student{heatmap.total_students !== 1 ? 's' : ''} · {heatmap.total_topics_assessed} topic{heatmap.total_topics_assessed !== 1 ? 's' : ''} assessed
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Schedule Tab */}
            {activeTab === 'schedule' && (
                <div className="card">
                    <h3 style={{ marginBottom: 16 }}>📅 AI Schedule Adjustments</h3>
                    {schedule ? (
                        <>
                            {schedule.reasoning && (
                                <div className="explanation-box" style={{ marginBottom: 16 }}>
                                    <h4>🧠 Scheduling Rationale</h4>
                                    <p>{schedule.reasoning}</p>
                                </div>
                            )}

                            {schedule.schedule_adjustments?.adjustments_summary?.map((adj, i) => (
                                <div key={i} className="alert alert-info" style={{ marginBottom: 8 }}>
                                    🔄 {adj}
                                </div>
                            ))}

                            {schedule.feedback?.weak_concepts?.length > 0 && (
                                <div style={{ marginTop: 16 }}>
                                    <h4 style={{ marginBottom: 8 }}>Weak Concepts Driving Adjustments</h4>
                                    {schedule.feedback.weak_concepts.map((w, i) => (
                                        <div key={i} className="concept-card">
                                            <h4>{w.topic}</h4>
                                            <p>{w.evidence}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {schedule.feedback?.recommendations?.length > 0 && (
                                <div style={{ marginTop: 16 }}>
                                    <h4 style={{ marginBottom: 8 }}>Recommendations</h4>
                                    {schedule.feedback.recommendations.map((r, i) => (
                                        <div key={i} className="alert alert-info" style={{ marginBottom: 4 }}>💡 {r}</div>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="loading"><div className="spinner" /><p>Analyzing schedule...</p></div>
                    )}
                </div>
            )}

            {/* Decisions Tab */}
            {activeTab === 'decisions' && (
                <div className="card">
                    <h3 style={{ marginBottom: 16 }}>🤖 AI Agent Decision Audit Trail</h3>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                        Every AI decision is recorded for transparency and auditability.
                    </p>
                    {decisions.length > 0 ? (
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Agent</th>
                                        <th>Reasoning <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 4, color: 'var(--text-muted)' }}>(click to expand)</span></th>
                                        <th>Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {decisions.map(d => (
                                        <React.Fragment key={d.id}>
                                            <tr
                                                className="expandable-row"
                                                onClick={() => setExpandedDecision(expandedDecision === d.id ? null : d.id)}
                                            >
                                                <td><span className="badge badge-accent">{d.agent_name}</span></td>
                                                <td style={{ fontSize: 13, maxWidth: 400 }}>
                                                    {d.reasoning?.slice(0, 150)}{d.reasoning?.length > 150 ? '…' : ''}
                                                    {d.reasoning?.length > 150 && (
                                                        <span style={{ marginLeft: 6, color: 'var(--accent)', fontSize: 12 }}>
                                                            {expandedDecision === d.id ? '▲' : '▼'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                    {d.created_at ? new Date(d.created_at).toLocaleString() : ''}
                                                </td>
                                            </tr>
                                            {expandedDecision === d.id && d.reasoning?.length > 150 && (
                                                <tr className="reasoning-expanded">
                                                    <td />
                                                    <td colSpan={2}>{d.reasoning}</td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p style={{ color: 'var(--text-muted)' }}>No agent decisions recorded yet. Generate a session plan to see AI decisions.</p>
                    )}
                </div>
            )}

            {/* Term Report Tab */}
            {activeTab === 'report' && (
                <div>
                    {loadingReport && <div className="loading"><div className="spinner" /><p>AI is generating your term report...</p></div>}

                    {!loadingReport && !termReport && (
                        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                            <button className="btn btn-primary" onClick={loadTermReport}>📋 Generate Term Report</button>
                            <p style={{ color: 'var(--text-muted)', marginTop: 12, fontSize: 13 }}>AI will analyse your syllabus coverage, quiz results, and sessions to generate a comprehensive report.</p>
                        </div>
                    )}

                    {!loadingReport && termReport && (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => exportTermReportPDF(termReport.ai_report, selectedSubject?.name)}
                                >
                                    📄 Export PDF
                                </button>
                            </div>
                            {/* Stats grid */}
                            <div className="stat-cards" style={{ marginBottom: 24 }}>
                                {[
                                    { icon: '📚', val: `${termReport.stats.completed_units}/${termReport.stats.total_units}`, label: 'Units Covered' },
                                    { icon: '🎯', val: `${termReport.stats.completed_sessions}/${termReport.stats.total_sessions}`, label: 'Sessions Done' },
                                    { icon: '📝', val: termReport.stats.total_quizzes, label: 'Quizzes' },
                                    { icon: '📊', val: termReport.stats.average_score != null ? `${termReport.stats.average_score}%` : 'N/A', label: 'Avg Score' },
                                    { icon: '👥', val: termReport.stats.enrolled_students, label: 'Students' },
                                ].map(s => (
                                    <div key={s.label} className="stat-card">
                                        <div className="stat-icon">{s.icon}</div>
                                        <div className="stat-value">{s.val}</div>
                                        <div className="stat-label">{s.label}</div>
                                    </div>
                                ))}
                            </div>

                            {termReport.report && !termReport.report.error && (
                                <>
                                    {/* Headline */}
                                    <div className="card" style={{ marginBottom: 20, borderColor: 'var(--accent)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                                            <div>
                                                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--text-muted)', marginBottom: 8 }}>Term Summary</div>
                                                <h3 style={{ margin: 0 }}>{termReport.report.headline}</h3>
                                            </div>
                                            <span className={`badge ${termReport.report.overall_rating === 'excellent' ? 'badge-success' : termReport.report.overall_rating === 'good' ? 'badge-accent' : termReport.report.overall_rating === 'satisfactory' ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: 13, padding: '6px 14px' }}>
                                                {termReport.report.overall_rating}
                                            </span>
                                        </div>
                                        {termReport.report.completion_percentage != null && (
                                            <div style={{ marginTop: 16 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                                                    <span style={{ color: 'var(--text-secondary)' }}>Term completion</span>
                                                    <span style={{ fontWeight: 700 }}>{termReport.report.completion_percentage}%</span>
                                                </div>
                                                <div className="progress-bar">
                                                    <div className="progress-fill" style={{ width: `${termReport.report.completion_percentage}%` }} />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                                        {termReport.report.highlights?.length > 0 && (
                                            <div className="card">
                                                <h4 style={{ color: 'var(--success)', marginBottom: 12 }}>✨ Highlights</h4>
                                                {termReport.report.highlights.map((h, i) => <p key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>• {h}</p>)}
                                            </div>
                                        )}
                                        {termReport.report.areas_for_improvement?.length > 0 && (
                                            <div className="card">
                                                <h4 style={{ color: 'var(--warning)', marginBottom: 12 }}>📈 Areas for Improvement</h4>
                                                {termReport.report.areas_for_improvement.map((a, i) => <p key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>• {a}</p>)}
                                            </div>
                                        )}
                                    </div>

                                    {termReport.report.student_performance_summary && (
                                        <div className="card" style={{ marginBottom: 16 }}>
                                            <h4 style={{ marginBottom: 8 }}>👥 Student Performance</h4>
                                            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{termReport.report.student_performance_summary}</p>
                                        </div>
                                    )}

                                    {termReport.report.curriculum_delivery_summary && (
                                        <div className="card" style={{ marginBottom: 16 }}>
                                            <h4 style={{ marginBottom: 8 }}>📚 Curriculum Delivery</h4>
                                            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{termReport.report.curriculum_delivery_summary}</p>
                                        </div>
                                    )}

                                    {termReport.report.recommendations_for_next_term?.length > 0 && (
                                        <div className="card" style={{ marginBottom: 20 }}>
                                            <h4 style={{ marginBottom: 12 }}>🎯 Recommendations for Next Term</h4>
                                            {termReport.report.recommendations_for_next_term.map((r, i) => (
                                                <div key={i} className="alert alert-info" style={{ marginBottom: 6 }}>💡 {r}</div>
                                            ))}
                                        </div>
                                    )}

                                    <button className="btn btn-secondary" onClick={loadTermReport}>🔄 Regenerate Report</button>
                                </>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
