"""Seed data script — populates the database with demo data."""

import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from datetime import date, datetime
from database import init_db, SessionLocal
from models.user import User
from models.subject import Subject
from models.syllabus import SyllabusUnit
from models.timetable import TimetableEntry
from models.enrollment import Enrollment


def seed():
    """Create demo data for testing."""
    init_db()
    db = SessionLocal()

    # Check if data already exists
    if db.query(User).count() > 0:
        print("Database already has data. Skipping seed.")
        db.close()
        return

    # ── Users ─────────────────────────────────────────────────────────
    teacher = User(name="Dr. Sarah Johnson", email="sarah@school.edu", role="teacher",
                   preferences_json='{"style": "detailed", "examples": "real-world", "quiz_difficulty": "medium"}')
    teacher2 = User(name="Prof. Mike Chen", email="mike@school.edu", role="teacher",
                    preferences_json='{"style": "concise", "examples": "theoretical", "quiz_difficulty": "hard"}')
    admin = User(name="Admin User", email="admin@school.edu", role="admin")
    student1 = User(name="Alice Smith", email="alice@school.edu", role="student")
    student2 = User(name="Bob Wilson", email="bob@school.edu", role="student")
    student3 = User(name="Carol Davis", email="carol@school.edu", role="student")

    db.add_all([teacher, teacher2, admin, student1, student2, student3])
    db.commit()

    # ── Subjects (Courses) ────────────────────────────────────────────
    cs101 = Subject(
        name="Introduction to Computer Science",
        code="CS101",
        teacher_id=teacher.id,
        term_start=date(2025, 1, 15),
        term_end=date(2025, 5, 30),
        description="Foundational computer science concepts covering programming, data structures, and algorithms.",
        is_published=True,  # Published as a course
    )
    math201 = Subject(
        name="Linear Algebra",
        code="MATH201",
        teacher_id=teacher.id,
        term_start=date(2025, 1, 15),
        term_end=date(2025, 5, 30),
        description="Vectors, matrices, linear transformations, eigenvalues, and applications.",
        is_published=True,  # Published as a course
    )
    db.add_all([cs101, math201])
    db.commit()

    # ── Syllabus Units (CS101) ────────────────────────────────────────
    cs_units = [
        ("Introduction to Programming", "Variables, data types, basic I/O, operators", 2.0, "completed"),
        ("Control Flow", "If-else, loops, switch statements, flow charts", 3.0, "completed"),
        ("Functions & Modularity", "Function definition, parameters, return values, scope", 2.5, "partial"),
        ("Arrays & Lists", "Array operations, list comprehensions, multi-dimensional arrays", 3.0, "pending"),
        ("Strings & Text Processing", "String methods, regex basics, text parsing", 2.0, "pending"),
        ("Object-Oriented Programming", "Classes, objects, inheritance, polymorphism", 4.0, "pending"),
        ("File I/O & Exception Handling", "Reading/writing files, try-catch, error types", 2.0, "pending"),
        ("Basic Data Structures", "Stacks, queues, linked lists, hash tables", 4.0, "pending"),
        ("Sorting & Searching Algorithms", "Bubble sort, merge sort, binary search, complexity", 3.0, "pending"),
        ("Introduction to Databases", "SQL basics, CRUD operations, normalization", 2.5, "pending"),
    ]
    for i, (title, desc, hours, status) in enumerate(cs_units):
        db.add(SyllabusUnit(
            subject_id=cs101.id, title=title, description=desc,
            order=i+1, estimated_hours=hours, status=status,
        ))

    # ── Syllabus Units (MATH201) ──────────────────────────────────────
    math_units = [
        ("Systems of Linear Equations", "Gaussian elimination, row reduction, solution types", 3.0, "completed"),
        ("Vectors in Rn", "Vector operations, dot product, cross product, projections", 3.0, "partial"),
        ("Matrix Operations", "Addition, multiplication, transpose, inverse", 3.0, "pending"),
        ("Determinants", "Cofactor expansion, properties, Cramer's rule", 2.5, "pending"),
        ("Vector Spaces", "Subspaces, basis, dimension, null space, column space", 4.0, "pending"),
        ("Eigenvalues & Eigenvectors", "Characteristic polynomial, diagonalization", 4.0, "pending"),
        ("Linear Transformations", "Kernel, image, matrix representation", 3.0, "pending"),
        ("Applications", "Least squares, Markov chains, computer graphics", 3.0, "pending"),
    ]
    for i, (title, desc, hours, status) in enumerate(math_units):
        db.add(SyllabusUnit(
            subject_id=math201.id, title=title, description=desc,
            order=i+1, estimated_hours=hours, status=status,
        ))

    # ── Timetable (use today's weekday for demo) ──────────────────────
    today_dow = date.today().weekday()
    timetable_entries = [
        # CS101: today + 2 days later
        (cs101.id, today_dow, "09:00", "10:30", "Room A101"),
        (cs101.id, (today_dow + 2) % 7, "09:00", "10:30", "Room A101"),
        # CS101: 4 days later
        (cs101.id, (today_dow + 4) % 7, "14:00", "15:30", "Lab B201"),
        # MATH201: tomorrow + 3 days later
        (math201.id, (today_dow + 1) % 7, "10:00", "11:30", "Room C301"),
        (math201.id, (today_dow + 3) % 7, "10:00", "11:30", "Room C301"),
        # Extra: CS101 today afternoon for richer demo
        (cs101.id, today_dow, "14:00", "15:00", "Lab B201"),
    ]
    for subj_id, day, start, end, room in timetable_entries:
        db.add(TimetableEntry(
            subject_id=subj_id, day_of_week=day,
            start_time=start, end_time=end, room=room,
        ))

    # ── Enrollments ───────────────────────────────────────────────────
    # Enroll all students in CS101
    for student in [student1, student2, student3]:
        db.add(Enrollment(student_id=student.id, subject_id=cs101.id, status="active"))

    # Enroll Alice and Bob in MATH201
    for student in [student1, student2]:
        db.add(Enrollment(student_id=student.id, subject_id=math201.id, status="active"))

    db.commit()
    db.close()

    print("[OK] Seed data created successfully!")
    print("   - 6 users (2 teachers, 1 admin, 3 students)")
    print("   - 2 subjects/courses (CS101, MATH201) — both published")
    print("   - 18 syllabus units")
    print("   - 6 timetable entries (includes today)")
    print("   - 5 enrollments (students in courses)")
    print()
    print("Login credentials:")
    print("  Teacher: sarah@school.edu  (any password)")
    print("  Teacher: mike@school.edu   (any password)")
    print("  Admin:   admin@school.edu  (any password)")
    print("  Student: alice@school.edu  (any password)")


if __name__ == "__main__":
    seed()
