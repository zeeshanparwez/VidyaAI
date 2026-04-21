"""Course and enrollment management routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func
from database import get_db
from models.subject import Subject
from models.enrollment import Enrollment
from models.user import User
from schemas.schemas import CourseOut, EnrollRequest, EnrollmentOut, SubjectOut

router = APIRouter(prefix="/api/courses", tags=["Courses"])


@router.get("/", response_model=list[CourseOut])
def list_courses(student_id: int = None, db: Session = Depends(get_db)):
    """List all published courses. If student_id provided, include enrollment status."""
    subjects = db.query(Subject).filter(Subject.is_published == True).all()

    courses = []
    for s in subjects:
        # Get teacher name
        teacher = db.query(User).filter(User.id == s.teacher_id).first()
        # Count enrollments
        enrolled_count = db.query(Enrollment).filter(
            Enrollment.subject_id == s.id,
            Enrollment.status == "active",
        ).count()
        # Check if this student is enrolled
        is_enrolled = False
        if student_id:
            enrollment = db.query(Enrollment).filter(
                Enrollment.student_id == student_id,
                Enrollment.subject_id == s.id,
                Enrollment.status == "active",
            ).first()
            is_enrolled = enrollment is not None

        courses.append(CourseOut(
            id=s.id,
            name=s.name,
            code=s.code,
            teacher_id=s.teacher_id,
            description=s.description,
            is_published=s.is_published,
            teacher_name=teacher.name if teacher else None,
            enrolled_count=enrolled_count,
            is_enrolled=is_enrolled,
        ))

    return courses


@router.post("/{subject_id}/publish", response_model=SubjectOut)
def publish_course(subject_id: int, db: Session = Depends(get_db)):
    """Publish a subject as a course (makes it browsable by students)."""
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found.")
    subject.is_published = True
    db.commit()
    db.refresh(subject)
    return subject


@router.post("/{subject_id}/unpublish", response_model=SubjectOut)
def unpublish_course(subject_id: int, db: Session = Depends(get_db)):
    """Unpublish a course."""
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found.")
    subject.is_published = False
    db.commit()
    db.refresh(subject)
    return subject


@router.post("/{course_id}/enroll", response_model=EnrollmentOut)
def enroll_student(course_id: int, req: EnrollRequest, db: Session = Depends(get_db)):
    """Enroll a student in a course."""
    subject = db.query(Subject).filter(Subject.id == course_id, Subject.is_published == True).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Course not found or not published.")

    # Check if already enrolled
    existing = db.query(Enrollment).filter(
        Enrollment.student_id == req.student_id,
        Enrollment.subject_id == course_id,
    ).first()
    if existing:
        if existing.status == "active":
            raise HTTPException(status_code=400, detail="Already enrolled.")
        existing.status = "active"
        db.commit()
        db.refresh(existing)
        return existing

    enrollment = Enrollment(
        student_id=req.student_id,
        subject_id=course_id,
        status="active",
    )
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    return enrollment


@router.delete("/{course_id}/enroll")
def drop_course(course_id: int, student_id: int, db: Session = Depends(get_db)):
    """Drop a student from a course."""
    enrollment = db.query(Enrollment).filter(
        Enrollment.student_id == student_id,
        Enrollment.subject_id == course_id,
    ).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found.")
    enrollment.status = "dropped"
    db.commit()
    return {"message": "Dropped from course successfully."}


@router.get("/{course_id}/students", response_model=list[dict])
def list_enrolled_students(course_id: int, db: Session = Depends(get_db)):
    """List all students enrolled in a course."""
    enrollments = db.query(Enrollment).filter(
        Enrollment.subject_id == course_id,
        Enrollment.status == "active",
    ).all()

    students = []
    for e in enrollments:
        user = db.query(User).filter(User.id == e.student_id).first()
        if user:
            students.append({
                "student_id": user.id,
                "name": user.name,
                "email": user.email,
                "enrolled_at": e.enrolled_at.isoformat() if e.enrolled_at else None,
            })
    return students


@router.get("/my-courses", response_model=list[CourseOut])
def get_student_courses(student_id: int, db: Session = Depends(get_db)):
    """Get courses a student is enrolled in."""
    enrollments = db.query(Enrollment).filter(
        Enrollment.student_id == student_id,
        Enrollment.status == "active",
    ).all()

    courses = []
    for e in enrollments:
        s = db.query(Subject).filter(Subject.id == e.subject_id).first()
        if s:
            teacher = db.query(User).filter(User.id == s.teacher_id).first()
            enrolled_count = db.query(Enrollment).filter(
                Enrollment.subject_id == s.id,
                Enrollment.status == "active",
            ).count()
            courses.append(CourseOut(
                id=s.id,
                name=s.name,
                code=s.code,
                teacher_id=s.teacher_id,
                description=s.description,
                is_published=s.is_published,
                teacher_name=teacher.name if teacher else None,
                enrolled_count=enrolled_count,
                is_enrolled=True,
            ))
    return courses
