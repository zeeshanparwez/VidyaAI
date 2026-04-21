import React, { useState, useEffect } from 'react'
import { listAvailableCourses, enrollInCourse } from '../api'

export default function CourseBrowser({ user }) {
    const [courses, setCourses] = useState([])
    const [loading, setLoading] = useState(true)
    const [enrolling, setEnrolling] = useState(null)

    useEffect(() => { loadCourses() }, [user])

    const loadCourses = async () => {
        setLoading(true)
        try {
            const data = await listAvailableCourses(user.user_id)
            setCourses(data)
        } catch (err) { console.error(err) }
        setLoading(false)
    }

    const handleEnroll = async (courseId) => {
        setEnrolling(courseId)
        try {
            await enrollInCourse(courseId, user.user_id)
            loadCourses()
        } catch (err) { alert(err.message) }
        setEnrolling(null)
    }

    if (loading) return <div className="loading"><div className="spinner" /><p>Loading courses...</p></div>

    return (
        <div>
            <div className="page-header">
                <h1>📚 Browse Courses</h1>
                <p>Discover and enroll in available courses</p>
            </div>

            {courses.length > 0 ? (
                <div className="cards-grid">
                    {courses.map(c => (
                        <div key={c.id} className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                <h3 style={{ margin: 0 }}>{c.code || '📖'} {c.name}</h3>
                                {c.is_enrolled && <span className="badge badge-success">✅ Enrolled</span>}
                            </div>
                            {c.description && <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>{c.description}</p>}
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                                👩‍🏫 {c.teacher_name || 'Unknown'} • {c.enrolled_count} students
                            </div>
                            {c.is_enrolled ? (
                                <button className="btn btn-sm btn-secondary" disabled>Already Enrolled</button>
                            ) : (
                                <button
                                    className="btn btn-sm btn-primary"
                                    onClick={() => handleEnroll(c.id)}
                                    disabled={enrolling === c.id}
                                >
                                    {enrolling === c.id ? '⏳ Enrolling...' : '📥 Enroll Now'}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📚</div>
                    <p style={{ color: 'var(--text-secondary)' }}>No courses available at this time.</p>
                </div>
            )}
        </div>
    )
}
