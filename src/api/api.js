// ============================================================
//  SSIS Mock API Service
//  Simulates real backend responses using in-memory mock data.
//  Groupmates: when the backend is ready, replace each function
//  body with a real fetch() call to the Express API.
//
//  API contract expected by the backend:
//    POST /api/auth/login              { student_number, password }
//    GET  /api/student/dashboard
//    GET  /api/student/profile
//    GET  /api/student/grades
//    GET  /api/student/enrollment
//    GET  /api/student/clearance
//    GET  /api/documents
//    GET  /api/documents/types
//    POST /api/documents               { document_type, quantity, payment_method, purpose }
// ============================================================

import {
  MOCK_STUDENTS,
  MOCK_GRADES,
  MOCK_DOCUMENTS,
  MOCK_DOCUMENT_TYPES,
  MOCK_CLEARANCE,
  MOCK_ENROLLMENT,
} from './mockData.js';

// Simulate network latency (ms)
const DELAY = 400;
const wait  = (ms = DELAY) => new Promise(r => setTimeout(r, ms));

// In-memory document list (persists during session)
let _documents = [...MOCK_DOCUMENTS];
let _nextId    = _documents.length + 1;

// ── Auth ──────────────────────────────────────────────────
export async function loginUser(student_number, password) {
  await wait();
  const student = MOCK_STUDENTS.find(
    s => s.student_number === student_number.trim() && s.password === password
  );
  if (!student) {
    const err = new Error('Invalid student number or password.');
    err.status = 401;
    throw err;
  }
  // Return same shape the real backend JWT would decode to
  const user = {
    student_id:     student.student_id,
    student_number: student.student_number,
    full_name:      student.full_name,
    course_name:    student.course_name,
    year_level:     student.year_level,
    email:          student.email,
  };
  // Store in localStorage so ProtectedRoute can read it
  localStorage.setItem('ssis_user', JSON.stringify(user));
  return user;
}

// ── Dashboard ─────────────────────────────────────────────
export async function getDashboard() {
  await wait();
  const totalUnits = MOCK_GRADES.reduce((s, g) => s + g.units, 0);
  const gwa = (
    MOCK_GRADES.reduce((s, g) => s + parseFloat(g.final_grade) * g.units, 0) / totalUnits
  ).toFixed(2);
  const pendingDocs     = _documents.filter(d => ['Pending','Processing'].includes(d.status)).length;
  const pendingClear    = MOCK_CLEARANCE.filter(c => c.status === 'Pending').length;
  const clearanceStatus = pendingClear === 0 ? 'CLEARED' : 'PENDING';
  const feed = [..._documents].slice(0, 5).map(d => ({
    request_id:    d.request_id,
    document_type: d.document_type,
    status:        d.status,
    request_date:  d.request_date,
  }));
  return { total_units: totalUnits, gwa, pending_docs: pendingDocs, clearance_status: clearanceStatus, feed };
}

// ── Profile ───────────────────────────────────────────────
export async function getProfile() {
  await wait();
  const stored = localStorage.getItem('ssis_user');
  if (!stored) throw new Error('Not authenticated.');
  const user    = JSON.parse(stored);
  const student = MOCK_STUDENTS.find(s => s.student_id === user.student_id);
  return student || user;
}

// ── Grades ────────────────────────────────────────────────
export async function getGrades() {
  await wait();
  return MOCK_GRADES;
}

// ── Enrollment ────────────────────────────────────────────
export async function getEnrollment() {
  await wait();
  return MOCK_ENROLLMENT;
}

// ── Clearance ─────────────────────────────────────────────
export async function getClearance() {
  await wait();
  return MOCK_CLEARANCE;
}

// ── Document Types ────────────────────────────────────────
export async function getDocumentTypes() {
  await wait(100);
  return MOCK_DOCUMENT_TYPES;
}

// ── My Documents ──────────────────────────────────────────
export async function getDocuments() {
  await wait();
  return [..._documents];
}

// ── Submit Document Request ───────────────────────────────
export async function submitDocument({ document_type, quantity, payment_method, purpose }) {
  await wait(600);
  const typeInfo = MOCK_DOCUMENT_TYPES.find(t => t.value === document_type);
  const amount   = typeInfo ? typeInfo.price * quantity : 0;
  const today    = new Date().toISOString().split('T')[0];
  const newReq   = {
    request_id:     _nextId++,
    document_type,
    quantity,
    amount,
    payment_method: payment_method || 'Cash',
    purpose:        purpose || '',
    status:         'Pending',
    request_date:   today,
    release_date:   null,
  };
  _documents = [newReq, ..._documents];
  return newReq;
}
