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

describe('Phase 3: End-Sem Exam, Eligibility & Attainment API Integration', () => {

  // ---------------------------------------------------------------------------
  // AC-12: End-Sem Exam Paper Access Gating
  // ---------------------------------------------------------------------------
  describe('GET /api/lab/end-sem/:examId/paper', () => {
    it('AC-12: Blocks unauthorized student from viewing sealed paper before exam start', async () => {
      const res = await request(app)
        .get('/api/lab/end-sem/paper_cs201/paper')
        .query({ userId: 'student_alice', userRole: 'STUDENT' });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('PAPER_SEALED');
      expect(res.body.message).toContain('AC-12 Violation');
    });

    it('AC-12: Permits paper setter to view paper before exam start', async () => {
      const res = await request(app)
        .get('/api/lab/end-sem/paper_cs201/paper')
        .query({ userId: 'faculty_setter', userRole: 'FACULTY' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.paper.id).toBe('paper_cs201');
    });
  });

  // ---------------------------------------------------------------------------
  // BR-33, AC-18: Student Eligibility Check & CoE Exemption
  // ---------------------------------------------------------------------------
  describe('POST /api/lab/end-sem/check-eligibility', () => {
    it('AC-18: Blocks ineligible student below attendance threshold with no exemption', async () => {
      const res = await request(app)
        .post('/api/lab/end-sem/check-eligibility')
        .send({
          studentId: 's_low',
          rollNo: 'PRN1009',
          attendancePct: 65,
          labCompletionPct: 85,
          effectiveMinAttendance: 75,
          effectiveMinCompletion: 80,
          hasCoeExemption: false,
        });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('STUDENT_INELIGIBLE');
      expect(res.body.message).toContain('AC-18');
    });

    it('AC-18: Permits student below threshold if CoE exemption is recorded', async () => {
      const res = await request(app)
        .post('/api/lab/end-sem/check-eligibility')
        .send({
          studentId: 's_exempt',
          rollNo: 'PRN1010',
          attendancePct: 65,
          labCompletionPct: 70,
          effectiveMinAttendance: 75,
          effectiveMinCompletion: 80,
          hasCoeExemption: true,
          exemptionReason: 'Approved sports representation',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.result.exemptionApplied).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // AC-14, NFR-4, NFR-5: Reconnect & Resume from Autosave
  // ---------------------------------------------------------------------------
  describe('POST /api/lab/end-sem/reconnect', () => {
    it('AC-14: Reconciles draft and restores server-computed remaining time', async () => {
      const examStartedAt = new Date(Date.now() - 15 * 60 * 1000).toISOString(); // 15 mins ago
      const serverDraft = {
        code: 'int a = 1;',
        savedAt: new Date(Date.now() - 10 * 1000).toISOString(),
        assessmentId: 'exam_1',
        questionId: 'q_1',
      };
      const localDraft = {
        code: 'int a = 1; int b = 2;',
        savedAt: new Date(Date.now() - 4 * 1000).toISOString(), // newer
        assessmentId: 'exam_1',
        questionId: 'q_1',
      };

      const res = await request(app)
        .post('/api/lab/end-sem/reconnect')
        .send({
          serverDraft,
          localDraft,
          examStartedAt,
          durationMinutes: 60,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.restored.source).toBe('local');
      expect(res.body.restored.activeCode).toContain('int b = 2;');
      // ~45 minutes remaining = ~2700s
      expect(res.body.restored.remainingSeconds).toBeGreaterThan(2600);
      expect(res.body.restored.remainingSeconds).toBeLessThanOrEqual(2705);
    });
  });

  // ---------------------------------------------------------------------------
  // AC-17: Attainment Immediate Re-computation & Audit Logging
  // ---------------------------------------------------------------------------
  describe('POST /api/lab/attainment/compute-co', () => {
    it('AC-17: Computes CO attainment and logs change to audit trail', async () => {
      const studentScores = [
        { studentId: 's1', marksEarned: 18, marksMax: 20 },
        { studentId: 's2', marksEarned: 14, marksMax: 20 },
        { studentId: 's3', marksEarned: 12, marksMax: 20 },
      ];

      const res = await request(app)
        .post('/api/lab/attainment/compute-co')
        .send({
          coId: 'CO1',
          studentScores,
          config: {
            studentTargetPct: 50,
            classThresholdPct: 60,
            completionThresholdPct: 80,
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.result.pctStudentsMeeting).toBe(100.0);
      expect(res.body.result.attained).toBe(true);

      // Verify audit log has attainment recalc entry (BR-4)
      const auditRes = await request(app).get('/api/lab/admin/audit-logs');
      expect(auditRes.status).toBe(200);
      const log = auditRes.body.logs.find((l: any) => l.objectType === 'attainment_recalc');
      expect(log).toBeDefined();
    });
  });

});
