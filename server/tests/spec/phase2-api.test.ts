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
import { TestCase } from '../../src/domain/lab-course/phase2-rules.js';

describe('Phase 2: Lab Programs, Judge Validation & QR Verification API', () => {

  const testCases: TestCase[] = [
    { id: 'tc1', input: '10 20', expectedOutput: '30', isHidden: false, weight: 1 },
    { id: 'tc2', input: '5 5', expectedOutput: '10', isHidden: false, weight: 1 },
    { id: 'tc3', input: '-1 1', expectedOutput: '0', isHidden: true, weight: 2 },
    { id: 'tc4', input: '999 1', expectedOutput: '1000', isHidden: true, weight: 3 },
    { id: 'tc5', input: '10000 20000', expectedOutput: '30000', isHidden: true, weight: 3 },
  ]; // Total weight: 10

  // ---------------------------------------------------------------------------
  // BR-36, BR-37: AI Drafting & PII Sanitization
  // ---------------------------------------------------------------------------
  describe('POST /api/lab/questions/ai-draft', () => {
    it('BR-36 & BR-37: Creates draft question with source ai and strips PII from prompt', async () => {
      const res = await request(app)
        .post('/api/lab/questions/ai-draft')
        .send({
          topicId: 'top_1',
          coId: 'co_1',
          rawPrompt: 'Create problem variant for student Alice (PRN20261001, alice@sanjivani.edu.in)',
          studentContext: { name: 'Alice', rollNo: 'PRN20261001', email: 'alice@sanjivani.edu.in' },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.question.source).toBe('ai');
      expect(res.body.question.status).toBe('draft');
      expect(res.body.piiRedacted).toBe(true);
      expect(res.body.sanitizedPrompt).not.toContain('Alice');
      expect(res.body.sanitizedPrompt).not.toContain('PRN20261001');
    });
  });

  // ---------------------------------------------------------------------------
  // AC-11: Question Approval Gated by Reference Solution
  // ---------------------------------------------------------------------------
  describe('POST /api/lab/questions/approve', () => {
    const mockVariant = {
      id: 'var_1',
      variantIndex: 0,
      statement: 'Add two numbers',
      referenceSolution: 'int main(){}',
      timeLimitMs: 1000,
      memoryKb: 65536,
      testCases,
    };

    it('AC-11: Rejects approval when reference solution fails in the judge', async () => {
      const partialJudgeResults = [
        { testCaseId: 'tc1', passed: true },
        { testCaseId: 'tc2', passed: true },
        { testCaseId: 'tc3', passed: true },
        { testCaseId: 'tc4', passed: false }, // Fails!
        { testCaseId: 'tc5', passed: true },
      ];

      const res = await request(app)
        .post('/api/lab/questions/approve')
        .send({
          questionId: 'q_1',
          variant: mockVariant,
          judgeResults: partialJudgeResults,
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('REFERENCE_SOLUTION_FAILED');
      expect(res.body.message).toContain('AC-11 Violation');
    });

    it('AC-11: Approves question when reference solution passes 100% of test cases', async () => {
      const allPassedJudgeResults = testCases.map((tc) => ({
        testCaseId: tc.id,
        passed: true,
      }));

      const res = await request(app)
        .post('/api/lab/questions/approve')
        .send({
          questionId: 'q_1',
          variant: mockVariant,
          judgeResults: allPassedJudgeResults,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('approved');
    });
  });

  // ---------------------------------------------------------------------------
  // AC-15, BR-21, BR-26: Submission Evaluation & Hidden Test Case Sanitization
  // ---------------------------------------------------------------------------
  describe('POST /api/lab/submissions/evaluate', () => {
    it('AC-15: Never leaks hidden test case input or expected output to client response', async () => {
      const judgeResults = [
        { testCaseId: 'tc1', passed: true, actualOutput: '30' },
        { testCaseId: 'tc2', passed: true, actualOutput: '10' },
        { testCaseId: 'tc3', passed: true, actualOutput: '0' },
        { testCaseId: 'tc4', passed: true, actualOutput: '1000' },
        { testCaseId: 'tc5', passed: true, actualOutput: '30000' },
      ];

      const res = await request(app)
        .post('/api/lab/submissions/evaluate')
        .send({
          itemMaxMarks: 20,
          submittedAt: '2026-11-20T10:00:00Z',
          dueAt: '2026-11-20T23:59:00Z',
          testCases,
          judgeTestResults: judgeResults,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.earnedMarks).toBe(20);

      // Verify AC-15: Hidden test cases have NO input or expectedOutput
      const hiddenResults = res.body.testResults.filter((r: any) => r.isHidden);
      expect(hiddenResults.length).toBe(3);
      hiddenResults.forEach((hr: any) => {
        expect(hr.input).toBeUndefined();
        expect(hr.expectedOutput).toBeUndefined();
        expect(hr.actualOutput).toBeUndefined();
        expect(hr.passed).toBe(true);
      });

      // Visible test cases DO contain input and expectedOutput for student learning
      const visibleResults = res.body.testResults.filter((r: any) => !r.isHidden);
      expect(visibleResults.length).toBe(2);
      expect(visibleResults[0].input).toBe('10 20');
      expect(visibleResults[0].expectedOutput).toBe('30');
    });
  });

  // ---------------------------------------------------------------------------
  // AC-16: Tamper-Evident Lab File QR Verification
  // ---------------------------------------------------------------------------
  describe('GET /api/lab/reports/lab-file-verification', () => {
    it('AC-16: Returns verified record and URL that matches student marks', async () => {
      const res = await request(app)
        .get('/api/lab/reports/lab-file-verification')
        .query({
          roll: 'PRN20261001',
          course: 'CS201',
          marks: '18.5',
          maxMarks: '20.0',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.verified).toBe(true);
      expect(res.body.dossier.verificationCode).toContain('LQ-CS201-PRN20261001');
      expect(res.body.dossier.verificationUrl).toContain('marks=18.5');
    });
  });

});
