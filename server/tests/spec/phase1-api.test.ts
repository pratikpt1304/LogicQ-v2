import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/utils/prisma.js', () => ({
  prisma: {
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    user: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  },
}));

import request from 'supertest';
import { app } from '../../src/app.js';
import { SSO_REFUSAL_MESSAGE } from '../../src/domain/lab-course/rules.js';

describe('Phase 1: Institutional Lab Course API Integration', () => {

  // ---------------------------------------------------------------------------
  // AC-1, BR-5, BR-6: Institutional SSO Login
  // ---------------------------------------------------------------------------
  describe('POST /api/lab/auth/sso-login', () => {
    it('AC-1: Rejects unauthorized / non-onboarded SSO email with exact message', async () => {
      const res = await request(app)
        .post('/api/lab/auth/sso-login')
        .send({ ssoEmail: 'outsider@gmail.com' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('SSO_NOT_ONBOARDED');
      expect(res.body.message).toBe(SSO_REFUSAL_MESSAGE);
    });

    it('AC-1: Accepts valid onboarded institutional email', async () => {
      const res = await request(app)
        .post('/api/lab/auth/sso-login')
        .send({ ssoEmail: 'alice.cse@sanjivani.edu.in' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe('alice.cse@sanjivani.edu.in');
    });
  });

  // ---------------------------------------------------------------------------
  // AC-2, BR-8: Roster Import Validation & Conflict Rejection
  // ---------------------------------------------------------------------------
  describe('POST /api/lab/admin/roster/import', () => {
    it('AC-2: Rejects roster with duplicate roll numbers and saves nothing', async () => {
      const res = await request(app)
        .post('/api/lab/admin/roster/import')
        .send({
          rows: [
            { rollNo: 'PRN20269999', name: 'Student 1', email: 's1@sanjivani.edu.in' },
            { rollNo: 'PRN20269999', name: 'Student 1 Duplicate', email: 's2@sanjivani.edu.in' },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('ROSTER_CONFLICT');
      expect(res.body.conflicts.length).toBe(1);
    });

    it('AC-2, BR-4: Imports clean roster and writes to append-only audit log', async () => {
      const res = await request(app)
        .post('/api/lab/admin/roster/import')
        .send({
          adminId: 'admin_hod_cse',
          rows: [
            { rollNo: 'PRN20263001', name: 'Kavita Shinde', email: 'kavita.shinde@sanjivani.edu.in' },
            { rollNo: 'PRN20263002', name: 'Rohan Joshi', email: 'rohan.joshi@sanjivani.edu.in' },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.importedCount).toBe(2);

      // Verify audit log entry was created (BR-4)
      const auditRes = await request(app).get('/api/lab/admin/audit-logs');
      expect(auditRes.status).toBe(200);
      expect(auditRes.body.logs.length).toBeGreaterThan(0);
      const latest = auditRes.body.logs[auditRes.body.logs.length - 1];
      expect(latest.action).toBe('create');
      expect(latest.objectType).toBe('roster_import');
    });
  });

  // ---------------------------------------------------------------------------
  // AC-4: Student Profile Locked Roster Fields
  // ---------------------------------------------------------------------------
  describe('PATCH /api/lab/student/profile/:studentId', () => {
    it('AC-4: Forbids student from editing locked fields (name, rollNo, email)', async () => {
      const res = await request(app)
        .patch('/api/lab/student/profile/student_1')
        .send({ name: 'Changed Name', rollNo: 'NEW_PRN' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('FORBIDDEN_FIELD_EDIT');
      expect(res.body.forbiddenFields).toContain('name');
      expect(res.body.forbiddenFields).toContain('rollNo');
    });

    it('AC-4: Allows editing unlocked fields (phone, photoUrl)', async () => {
      const res = await request(app)
        .patch('/api/lab/student/profile/student_1')
        .send({ phone: '9988776655' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.profile.phone).toBe('9988776655');
    });
  });

  // ---------------------------------------------------------------------------
  // BR-10, BR-11, AC-8: Batch Partitioning
  // ---------------------------------------------------------------------------
  describe('POST /api/lab/sections/partition-batches', () => {
    it('AC-8: 125 students in 65-seat lab partitions into 63 and 62', async () => {
      const students = Array.from({ length: 125 }, (_, i) => ({
        rollNo: `PRN2026_${(1000 + i).toString()}`,
      }));

      const res = await request(app)
        .post('/api/lab/sections/partition-batches')
        .send({ students, labRoomCapacity: 65 });

      expect(res.status).toBe(200);
      expect(res.body.batchCap).toBe(65);
      expect(res.body.batchesCount).toBe(2);
      expect(res.body.batches[0].length).toBe(63);
      expect(res.body.batches[1].length).toBe(62);
    });
  });

  // ---------------------------------------------------------------------------
  // BR-12: Student Movement Between Batches
  // ---------------------------------------------------------------------------
  describe('POST /api/lab/batches/move-student', () => {
    it('BR-12: Rejects move without documented reason after first lab session', async () => {
      const res = await request(app)
        .post('/api/lab/batches/move-student')
        .send({ firstLabSessionStarted: true, reason: '' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('REASON_REQUIRED');
    });

    it('BR-12: Approves move after first lab session with reason', async () => {
      const res = await request(app)
        .post('/api/lab/batches/move-student')
        .send({ firstLabSessionStarted: true, reason: 'Official schedule clash' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.logged).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // AC-13: Student Scoped Course & Mark Visibility
  // ---------------------------------------------------------------------------
  describe('GET /api/lab/student/:studentId/courses and marks', () => {
    it('AC-13: Student sees only enrolled courses', async () => {
      const res = await request(app).get('/api/lab/student/student_1/courses');
      expect(res.status).toBe(200);
      expect(res.body.courses.length).toBe(1);
      expect(res.body.courses[0].courseId).toBe('COURSE_CS201');
    });

    it('AC-13: Student sees only own marks', async () => {
      const res = await request(app).get('/api/lab/student/student_1/marks');
      expect(res.status).toBe(200);
      expect(res.body.marks.length).toBe(1);
      expect(res.body.marks[0].item).toBe('Lab 1');
      expect(res.body.marks[0].marks).toBe(10);
    });
  });

});
