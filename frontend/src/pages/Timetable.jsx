import React, { useState, useEffect } from 'react'
import { getTimetable, createTimetableEntry, deleteTimetableEntry } from '../api'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function Timetable({ user, selectedSubject }) {
    const [entries, setEntries] = useState([])
    const [showAdd, setShowAdd] = useState(false)
    const [form, setForm] = useState({ day_of_week: 0, start_time: '09:00', end_time: '10:00', room: '' })
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (selectedSubject) loadTimetable()
    }, [selectedSubject])

    const loadTimetable = async () => {
        setLoading(true)
        try {
            const data = await getTimetable(selectedSubject.id)
            setEntries(data)
        } catch (err) { console.error(err) }
        setLoading(false)
    }

    const handleAdd = async (e) => {
        e.preventDefault()
        try {
            const created = await createTimetableEntry({
                subject_id: selectedSubject.id,
                ...form,
                day_of_week: parseInt(form.day_of_week),
            })
            setEntries([...entries, created])
            setShowAdd(false)
        } catch (err) { alert(err.message) }
    }

    const handleDelete = async (id) => {
        try {
            await deleteTimetableEntry(id)
            setEntries(entries.filter(e => e.id !== id))
        } catch (err) { console.error(err) }
    }

    if (!selectedSubject) {
        return (
            <div>
                <div className="page-header">
                    <h1>📅 Timetable</h1>
                    <p>Select a subject from the Dashboard first.</p>
                </div>
            </div>
        )
    }

    // Group entries by day
    const byDay = {}
    DAYS.forEach((_, i) => { byDay[i] = entries.filter(e => e.day_of_week === i) })

    return (
        <div>
            <div className="page-header">
                <h1>📅 Timetable — {selectedSubject.name}</h1>
                <p>Weekly schedule for this subject</p>
            </div>

            <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)} style={{ marginBottom: 20 }}>
                + Add Time Slot
            </button>

            {showAdd && (
                <div className="card" style={{ marginBottom: 24 }}>
                    <h3 style={{ marginBottom: 16 }}>Add Timetable Entry</h3>
                    <form onSubmit={handleAdd}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                            <div className="form-group">
                                <label>Day</label>
                                <select className="form-select" value={form.day_of_week} onChange={e => setForm({ ...form, day_of_week: e.target.value })}>
                                    {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Start Time</label>
                                <input type="time" className="form-input" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>End Time</label>
                                <input type="time" className="form-input" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Room</label>
                                <input className="form-input" value={form.room} onChange={e => setForm({ ...form, room: e.target.value })} placeholder="Room A101" />
                            </div>
                        </div>
                        <button type="submit" className="btn btn-success">Save Entry</button>
                    </form>
                </div>
            )}

            {/* Weekly Grid */}
            <div className="card">
                <div className="timetable-grid">
                    {DAYS.slice(0, 5).map((day, i) => (
                        <div key={i} className="timetable-day">
                            <h4>{day}</h4>
                            {byDay[i]?.length > 0 ? byDay[i].map(entry => (
                                <div key={entry.id} className="timetable-slot">
                                    <div className="slot-time">{entry.start_time} — {entry.end_time}</div>
                                    {entry.room && <div className="slot-room">📍 {entry.room}</div>}
                                    <button
                                        className="btn btn-sm btn-secondary"
                                        style={{ marginTop: 8, fontSize: 11, padding: '2px 8px' }}
                                        onClick={() => handleDelete(entry.id)}
                                    >
                                        🗑 Remove
                                    </button>
                                </div>
                            )) : (
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 20 }}>No class</div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Weekend slots if any */}
            {(byDay[5]?.length > 0 || byDay[6]?.length > 0) && (
                <div className="card" style={{ marginTop: 16 }}>
                    <h4>Weekend</h4>
                    <div className="timetable-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                        {[5, 6].map(i => (
                            <div key={i} className="timetable-day">
                                <h4>{DAYS[i]}</h4>
                                {byDay[i]?.map(entry => (
                                    <div key={entry.id} className="timetable-slot">
                                        <div className="slot-time">{entry.start_time} — {entry.end_time}</div>
                                        {entry.room && <div className="slot-room">📍 {entry.room}</div>}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
