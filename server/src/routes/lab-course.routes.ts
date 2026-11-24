import { Router, Request, Response } from 'express';
import {
  evaluateScopeAccess,
  tightenThreshold,
  validateEndSemRoles,
  createAuditLogEntry,
  validateRosterImport,
  verifySsoLogin,
  validateStudentProfileUpdate,
  partitionBatches,
  canMoveStudent,
  generateSessionPlan,
  checkCalendarChangeImpact,
  canCourseBeOffered,
  filterCoursesForStudent,
  filterMarksForStudent,
  SSO_REFUSAL_MESSAGE,
} from '../domain/lab-course/rules.js';
import {
  assignVariantForStudent,
  validateTestCasesRequirements,
  canApproveCodingQuestion,
  sanitizeTestCaseResultsForStudent,
  calculateEffectiveDueDate,
  evaluateSubmissionTiming,
  calculateWeightedCodingMarks,
  calculateLabInternalMarks,
  generateLabFileVerificationDossier,
  createAiDraftItem,
  canPublishQuestion,
  sanitizePromptForAi,
  validatePrePostLabBank,
  randomizeLabMcqs,
  validateSessionCodingQuestions,
  TestCase,
  QuestionVariant,
  Question,
  McqQuestionItem,
  SessionCodingChoice,
} from '../domain/lab-course/phase2-rules.js';
import {
  canAccessEndSemPaper,
  evaluateStudentExamEligibility,
  reconcileExamDraftOnReconnect,
  computeCourseOutcomeAttainment,
  computeProgramOutcomeAttainment,
  classifyLearners,
  generateBoardOfStudiesGapReport,
  EndSemPaper,
  StudentExamEligibilityCheck,
} from '../domain/lab-course/phase3-rules.js';
import {
  AcademicTerm,
  Course,
  CourseUnit,
  CalendarEvent,
  RoleAssignment,
  RoleLevel,
} from '../domain/lab-course/types.js';

export const labCourseRouter = Router();

// In-memory institutional store
const inMemoryStore = {
  onboardedEmails: new Set<string>([
    'alice.cse@sanjivani.edu.in',
    'bob.cse@sanjivani.edu.in',
    'charlie.it@sanjivani.edu.in',
    'faculty.patil@sanjivani.edu.in',
    'hod.cse@sanjivani.edu.in',
    'dean.set@sanjivani.edu.in',
    'admin@sanjivani.edu.in',
  ]),
  studentProfiles: new Map<string, any>([
    [
      'student_1',
      {
        id: 'sp_1',
        userId: 'student_1',
        rollNo: 'PRN20261001',
        name: 'Alice Patil',
        email: 'alice.cse@sanjivani.edu.in',
        phone: '9876543210',
        programId: 'prog_btech_cse',
        admissionYear: 2026,
        consentAt: new Date(),
      },
    ],
  ]),
  auditLogs: [] as any[],
  calendarEvents: [] as CalendarEvent[],
  courses: new Map<string, Course>(),
  questions: new Map<string, Question>(),
  sessionPlans: new Map<string, any>(),
  batches: new Map<string, any>(),
  enrollments: new Map<string, Set<string>>([['student_1', new Set(['COURSE_CS201'])]]),
  studentMarks: new Map<string, any[]>([
    ['student_1', [{ item: 'Lab 1', marks: 10, maxMarks: 10 }]],
    ['student_2', [{ item: 'Lab 1', marks: 8, maxMarks: 10 }]],
  ]),
  holidays: new Set<string>(['2026-10-02', '2026-11-12']),
  endSemPapers: new Map<string, EndSemPaper>([
    [
      'paper_cs201',
      {
        id: 'paper_cs201',
        courseId: 'COURSE_CS201',
        setterId: 'faculty_setter',
        moderatorId: 'faculty_moderator',
        hodId: 'hod_cse',
        status: 'locked',
        examStartAt: new Date(Date.now() + 3600 * 1000), // In 1 hour
        examEndAt: new Date(Date.now() + 4 * 3600 * 1000),
        blueprint: [],
      },
    ],
  ]),
};

// -----------------------------------------------------------------------------
// 1. SSO LOGIN & AUTHENTICATION (BR-5, BR-6, AC-1)
// -----------------------------------------------------------------------------
labCourseRouter.post('/auth/sso-login', (req: Request, res: Response) => {
  const { ssoEmail } = req.body;
  if (!ssoEmail) {
    return res.status(400).json({ success: false, message: 'SSO email is required' });
  }

  const result = verifySsoLogin(ssoEmail, inMemoryStore.onboardedEmails);
  if (!result.allowed) {
    return res.status(403).json({
      success: false,
      code: 'SSO_NOT_ONBOARDED',
      message: result.message || SSO_REFUSAL_MESSAGE,
    });
  }

  return res.json({
    success: true,
    message: 'SSO authentication successful',
    user: { email: ssoEmail.trim().toLowerCase() },
  });
});

// -----------------------------------------------------------------------------
// 2. ROSTER & STAFF ONBOARDING (BR-5, BR-8, AC-2)
// -----------------------------------------------------------------------------
labCourseRouter.post('/admin/roster/import', (req: Request, res: Response) => {
  const { rows } = req.body;
  if (!Array.isArray(rows)) {
    return res.status(400).json({ success: false, message: 'Invalid roster rows format' });
  }

  const existingRolls = new Set<string>();
  for (const prof of inMemoryStore.studentProfiles.values()) {
    existingRolls.add(prof.rollNo);
  }

  const report = validateRosterImport(rows, existingRolls);
  if (!report.isValid) {
    return res.status(400).json({
      success: false,
      code: 'ROSTER_CONFLICT',
      message: 'Roster import contains validation errors or duplicate roll numbers. Nothing was saved.',
      conflicts: report.conflicts,
    });
  }

  for (const row of report.validRows) {
    inMemoryStore.onboardedEmails.add(row.email);
    const userId = `usr_${row.rollNo.toLowerCase()}`;
    inMemoryStore.studentProfiles.set(userId, {
      id: `sp_${row.rollNo.toLowerCase()}`,
      userId,
      rollNo: row.rollNo,
      name: row.name,
      email: row.email,
      programId: 'prog_btech_cse',
      admissionYear: 2026,
    });
  }

  inMemoryStore.auditLogs.push(
    createAuditLogEntry({
      userId: req.body.adminId || 'admin_sys',
      role: 'ADMIN',
      action: 'create',
      objectType: 'roster_import',
      objectId: `import_${Date.now()}`,
      before: null,
      after: { importedCount: report.validRows.length },
    })
  );

  return res.json({
    success: true,
    message: `Successfully imported ${report.validRows.length} students into roster.`,
    importedCount: report.validRows.length,
  });
});

// -----------------------------------------------------------------------------
// 3. STUDENT PROFILE (AC-4)
// -----------------------------------------------------------------------------
labCourseRouter.get('/student/profile/:studentId', (req: Request, res: Response) => {
  const { studentId } = req.params;
  const profile = inMemoryStore.studentProfiles.get(studentId);
  if (!profile) {
    return res.status(404).json({ success: false, message: 'Profile not found' });
  }
  return res.json({ success: true, profile });
});

labCourseRouter.patch('/student/profile/:studentId', (req: Request, res: Response) => {
  const { studentId } = req.params;
  const updates = req.body;

  const validation = validateStudentProfileUpdate(updates);
  if (!validation.allowed) {
    return res.status(403).json({
      success: false,
      code: 'FORBIDDEN_FIELD_EDIT',
      message: 'AC-4 Violation: Name, Roll Number, and Email are locked by the institution and cannot be modified.',
      forbiddenFields: validation.forbiddenFields,
    });
  }

  const existing = inMemoryStore.studentProfiles.get(studentId);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Profile not found' });
  }

  const updated = { ...existing, ...updates };
  inMemoryStore.studentProfiles.set(studentId, updated);
  return res.json({ success: true, profile: updated });
});

// -----------------------------------------------------------------------------
// 4. BATCHES (BR-10, BR-11, AC-8, BR-12)
// -----------------------------------------------------------------------------
labCourseRouter.post('/sections/partition-batches', (req: Request, res: Response) => {
  const { students, labRoomCapacity } = req.body;
  if (!Array.isArray(students)) {
    return res.status(400).json({ success: false, message: 'Students array required' });
  }

  const result = partitionBatches(students, labRoomCapacity || 65);
  return res.json({
    success: true,
    batchCap: result.batchCap,
    batchesCount: result.batches.length,
    batches: result.batches,
  });
});

labCourseRouter.post('/batches/move-student', (req: Request, res: Response) => {
  const { firstLabSessionStarted, reason } = req.body;
  const check = canMoveStudent(Boolean(firstLabSessionStarted), reason);

  if (!check.allowed) {
    return res.status(400).json({
      success: false,
      code: 'REASON_REQUIRED',
      message: check.error,
    });
  }

  return res.json({
    success: true,
    message: 'Student move approved.',
    logged: check.mustLogReason,
  });
});

// -----------------------------------------------------------------------------
// 5. CALENDAR & COLLISION DETECTION (BR-18, AC-6)
// -----------------------------------------------------------------------------
labCourseRouter.post('/calendar/events', (req: Request, res: Response) => {
  const newEvent: CalendarEvent = req.body;
  inMemoryStore.calendarEvents.push(newEvent);

  const existingPlans = Array.from(inMemoryStore.sessionPlans.values());
  const impact = checkCalendarChangeImpact(newEvent, existingPlans);

  for (const update of impact.updatedPlans) {
    const plan = inMemoryStore.sessionPlans.get(update.planId);
    if (plan) {
      plan.status = 'draft';
      plan.flaggedForReapproval = true;
    }
  }

  return res.json({
    success: true,
    event: newEvent,
    affectedPlanIds: impact.affectedPlanIds,
  });
});

// -----------------------------------------------------------------------------
// 6. SESSION PLAN GENERATION (BR-13..BR-17, AC-9, AC-10)
// -----------------------------------------------------------------------------
labCourseRouter.post('/session-plans/generate', (req: Request, res: Response) => {
  const { term, batchWeekday, blockedDates, units, reserveLastPeriodForMakeup } = req.body;
  const blockedSet = new Set<string>(blockedDates || []);

  const plan = generateSessionPlan({
    term,
    batchWeekday,
    blockedDates: blockedSet,
    units,
    reserveLastPeriodForMakeup,
  });

  return res.json({ success: true, plan });
});

// -----------------------------------------------------------------------------
// 7. COURSE SETUP & OFFERING GATING (AC-7)
// -----------------------------------------------------------------------------
labCourseRouter.post('/offerings/create', (req: Request, res: Response) => {
  const { course } = req.body;
  const check = canCourseBeOffered(course);

  if (!check.canOffer) {
    return res.status(400).json({
      success: false,
      code: 'COURSE_NOT_APPROVED',
      message: check.reason,
    });
  }

  return res.json({ success: true, message: 'Course offering created successfully.' });
});

// -----------------------------------------------------------------------------
// 8. STUDENT SCOPED VISIBILITY (AC-13)
// -----------------------------------------------------------------------------
labCourseRouter.get('/student/:studentId/courses', (req: Request, res: Response) => {
  const { studentId } = req.params;
  const enrolledCourses = inMemoryStore.enrollments.get(studentId) || new Set();

  const allCourses = [
    { courseId: 'COURSE_CS201', title: 'Data Structures & Algorithms in C', code: 'CS201' },
    { courseId: 'COURSE_CS301', title: 'Operating Systems Lab', code: 'CS301' },
    { courseId: 'COURSE_ME201', title: 'Thermal Engineering Lab', code: 'ME201' },
  ];

  const visible = filterCoursesForStudent(enrolledCourses, allCourses);
  return res.json({ success: true, courses: visible });
});

labCourseRouter.get('/student/:studentId/marks', (req: Request, res: Response) => {
  const { studentId } = req.params;
  const studentRecords = inMemoryStore.studentMarks.get(studentId) || [];
  return res.json({ success: true, marks: studentRecords });
});

// -----------------------------------------------------------------------------
// 9. PHASE 2: QUESTION BANK & AI DRAFTING (BR-19, BR-20, BR-36, BR-37, AC-11)
// -----------------------------------------------------------------------------
labCourseRouter.post('/questions/ai-draft', (req: Request, res: Response) => {
  const { topicId, coId, rawPrompt, studentContext, variants } = req.body;

  const sanitizedPrompt = sanitizePromptForAi(rawPrompt || '', studentContext);
  const newQuestion = createAiDraftItem({
    topicId: topicId || 'top_1',
    coId: coId || 'co_1',
    variants: variants || [],
  });

  inMemoryStore.questions.set(newQuestion.id, newQuestion);

  return res.json({
    success: true,
    question: newQuestion,
    sanitizedPrompt: sanitizedPrompt.cleanPrompt,
    piiRedacted: sanitizedPrompt.containsPii,
  });
});

labCourseRouter.post('/questions/approve', (req: Request, res: Response) => {
  const { questionId, variant, judgeResults } = req.body;

  const approvalCheck = canApproveCodingQuestion(variant, judgeResults);
  if (!approvalCheck.canApprove) {
    return res.status(400).json({
      success: false,
      code: 'REFERENCE_SOLUTION_FAILED',
      message: approvalCheck.error,
      passedRatio: approvalCheck.passedRatio,
    });
  }

  const existing = inMemoryStore.questions.get(questionId);
  if (existing) {
    existing.status = 'approved';
    existing.approvedBy = req.body.approverId || 'faculty_reviewer';
  }

  return res.json({
    success: true,
    message: 'Question and reference solution approved by faculty.',
    status: 'approved',
  });
});

// -----------------------------------------------------------------------------
// 10. PHASE 2: SUBMISSIONS & SANITIZATION (BR-21, BR-22, BR-23, BR-26, AC-15)
// -----------------------------------------------------------------------------
labCourseRouter.post('/submissions/evaluate', (req: Request, res: Response) => {
  const {
    itemMaxMarks,
    submittedAt,
    dueAt,
    testCases,
    judgeTestResults,
    lateRule,
    gracePeriodHours,
    penaltyPercentage,
  } = req.body;

  const effectiveDue = calculateEffectiveDueDate(new Date(dueAt), inMemoryStore.holidays);
  const timingEval = evaluateSubmissionTiming({
    submittedAt: new Date(submittedAt),
    dueAt: effectiveDue.effectiveDate,
    gracePeriodHours: gracePeriodHours ?? 24,
    lateRule: lateRule ?? 'accept_and_flag',
    penaltyPercentage: penaltyPercentage ?? 50,
  });

  if (timingEval.isRejected) {
    return res.status(400).json({
      success: false,
      code: 'DEADLINE_PASSED',
      message: 'Submission rejected: Final grace deadline has expired.',
      timing: timingEval,
    });
  }

  const passedIds = new Set<string>(
    judgeTestResults.filter((r: any) => r.passed).map((r: any) => r.testCaseId)
  );

  const marksResult = calculateWeightedCodingMarks({
    itemMaxMarks: itemMaxMarks || 10,
    testCases,
    passedTestCaseIds: passedIds,
    scoreMultiplier: timingEval.scoreMultiplier,
  });

  const fullResults = testCases.map((tc: TestCase) => {
    const jResult = judgeTestResults.find((jr: any) => jr.testCaseId === tc.id);
    return {
      testCase: tc,
      passed: Boolean(jResult?.passed),
      actualOutput: jResult?.actualOutput,
      executionTimeMs: jResult?.executionTimeMs,
      memoryKb: jResult?.memoryKb,
    };
  });

  const studentResults = sanitizeTestCaseResultsForStudent(fullResults);

  return res.json({
    success: true,
    earnedMarks: marksResult.earnedMarks,
    percentage: marksResult.percentage,
    timing: timingEval,
    testResults: studentResults,
  });
});

// -----------------------------------------------------------------------------
// 11. PHASE 2: LAB FILE QR VERIFICATION (AC-16)
// -----------------------------------------------------------------------------
labCourseRouter.get('/reports/lab-file-verification', (req: Request, res: Response) => {
  const { roll, course, marks, maxMarks } = req.query;

  const dossier = generateLabFileVerificationDossier({
    studentRollNo: String(roll || 'PRN20261001'),
    courseCode: String(course || 'CS201'),
    semester: 3,
    academicYear: '2026-2027',
    totalMarksEarned: parseFloat(String(marks || '18.5')),
    totalMarksMax: parseFloat(String(maxMarks || '20.0')),
    totalLabsCompleted: 6,
  });

  return res.json({ success: true, verified: true, dossier });
});

// -----------------------------------------------------------------------------
// 12. PHASE 3: END-SEM PAPER ACCESS RESTRICTION (AC-12)
// -----------------------------------------------------------------------------
labCourseRouter.get('/end-sem/:examId/paper', (req: Request, res: Response) => {
  const { examId } = req.params;
  const { userId, userRole } = req.query;

  const paper = inMemoryStore.endSemPapers.get(examId);
  if (!paper) {
    return res.status(404).json({ success: false, message: 'Exam paper not found' });
  }

  const check = canAccessEndSemPaper({
    userId: String(userId || ''),
    userRole: (userRole as RoleLevel) || 'STUDENT',
    paper,
    now: new Date(),
  });

  if (!check.allowed) {
    return res.status(403).json({
      success: false,
      code: 'PAPER_SEALED',
      message: check.reason,
    });
  }

  return res.json({ success: true, paper });
});

// -----------------------------------------------------------------------------
// 13. PHASE 3: END-SEM ELIGIBILITY CHECK (BR-33, AC-18)
// -----------------------------------------------------------------------------
labCourseRouter.post('/end-sem/check-eligibility', (req: Request, res: Response) => {
  const check: StudentExamEligibilityCheck = req.body;
  const result = evaluateStudentExamEligibility(check);

  if (!result.isEligible) {
    return res.status(403).json({
      success: false,
      code: 'STUDENT_INELIGIBLE',
      message: result.blockReason,
      result,
    });
  }

  return res.json({ success: true, message: 'Student is eligible for exam', result });
});

// -----------------------------------------------------------------------------
// 14. PHASE 3: RECONNECT & RESUME FROM AUTOSAVE (AC-14, NFR-4, NFR-5)
// -----------------------------------------------------------------------------
labCourseRouter.post('/end-sem/reconnect', (req: Request, res: Response) => {
  const { serverDraft, localDraft, examStartedAt, durationMinutes } = req.body;

  const restored = reconcileExamDraftOnReconnect({
    serverDraft: serverDraft ? { ...serverDraft, savedAt: new Date(serverDraft.savedAt) } : undefined,
    localDraft: localDraft ? { ...localDraft, savedAt: new Date(localDraft.savedAt) } : undefined,
    examStartedAt: new Date(examStartedAt),
    durationMinutes: durationMinutes || 60,
    now: new Date(),
  });

  return res.json({ success: true, restored });
});

// -----------------------------------------------------------------------------
// 15. PHASE 3: CO & PO ATTAINMENT (BR-29..BR-31, BR-34, AC-17)
// -----------------------------------------------------------------------------
labCourseRouter.post('/attainment/compute-co', (req: Request, res: Response) => {
  const { coId, studentScores, config } = req.body;
  const result = computeCourseOutcomeAttainment({ coId, studentScores, config });

  // Log attainment recalculation (AC-17, BR-4)
  inMemoryStore.auditLogs.push(
    createAuditLogEntry({
      userId: req.body.userId || 'admin_sys',
      role: 'FACULTY',
      action: 'tighten',
      objectType: 'attainment_recalc',
      objectId: coId,
      before: null,
      after: result,
    })
  );

  return res.json({ success: true, result });
});

// -----------------------------------------------------------------------------
// 16. COMPLETE 7-STEP INSTITUTIONAL COURSE LIFECYCLE (Hariprasad Sir's Flow)
// 1. Faculty course registration
// 2. Batch creation
// 3. Session plan creation
// 4. Lab questions (2 choices max) & Pre/post-lab MCQs (15 in bank, randomize 3 each)
// 5. Realtime monitoring & slow learner alerts
// 6. Download mark sheet & attainment reports anytime
// 7. LMS resources & class announcements
// -----------------------------------------------------------------------------

// In-memory course lifecycle store
const lifecycleStore = {
  courses: new Map<string, any>(),
  batches: new Map<string, any[]>(),
  sessionPlans: new Map<string, any[]>(),
  sessionQuestions: new Map<string, { coding: SessionCodingChoice[]; preLab: McqQuestionItem[]; postLab: McqQuestionItem[] }>(),
  liveTerminals: new Map<string, any[]>(),
  announcements: new Map<string, any[]>(),
  resources: new Map<string, any[]>(),
};

// Seed sample default course for instant preview if empty
const defaultCourseId = 'CS201_LAB';
lifecycleStore.courses.set(defaultCourseId, {
  courseCode: 'CS201',
  courseTitle: 'Data Structures & Algorithms Laboratory',
  department: 'Computer Science & Engineering',
  academicYear: '2026-2027',
  semester: 'III',
  ltpc: '0-0-4-2',
  syllabusHours: 60,
  outcomes: [
    { coId: 'CO1', description: 'Analyze asymptotic time & space complexity of algorithmic solutions', bloomLevel: 'L4: Analyze' },
    { coId: 'CO2', description: 'Implement linear structures (Stacks, Queues, Linked Lists) for memory efficiency', bloomLevel: 'L3: Apply' },
    { coId: 'CO3', description: 'Construct hierarchical tree structures (BST, AVL, Heaps) for rapid search and priority queues', bloomLevel: 'L3: Apply' },
    { coId: 'CO4', description: 'Design graph traversal algorithms (BFS, DFS, Dijkstra) for network routing problems', bloomLevel: 'L5: Evaluate' },
    { coId: 'CO5', description: 'Formulate hash tables with collision resolution strategies for O(1) average lookup', bloomLevel: 'L6: Create' },
  ],
  coPoMapping: [
    { co: 'CO1', po1: 3, po2: 3, po3: 2, po4: 3, po5: 2, pso1: 3, pso2: 2 },
    { co: 'CO2', po1: 3, po2: 3, po3: 3, po4: 2, po5: 3, pso1: 3, pso2: 3 },
    { co: 'CO3', po1: 3, po2: 2, po3: 3, po4: 3, po5: 2, pso1: 3, pso2: 2 },
    { co: 'CO4', po1: 2, po2: 3, po3: 3, po4: 3, po5: 3, pso1: 3, pso2: 3 },
    { co: 'CO5', po1: 3, po2: 3, po3: 3, po4: 2, po5: 2, pso1: 3, pso2: 2 },
  ],
});

// Seed default batches
lifecycleStore.batches.set(defaultCourseId, [
  { batchId: 'BATCH_A', name: 'Batch A (PRN 01-24)', size: 24, room: 'Lab 301 - Turing Hall', slotDay: 'Monday', slotTime: '09:00 - 11:00 AM' },
  { batchId: 'BATCH_B', name: 'Batch B (PRN 25-48)', size: 24, room: 'Lab 302 - Lovelace Hall', slotDay: 'Wednesday', slotTime: '02:00 - 04:00 PM' },
  { batchId: 'BATCH_C', name: 'Batch C (PRN 49-72)', size: 24, room: 'Lab 301 - Turing Hall', slotDay: 'Friday', slotTime: '11:00 AM - 01:00 PM' },
]);

// Seed default session plans
lifecycleStore.sessionPlans.set(defaultCourseId, [
  { sessionId: 'SES_1', sessionNo: 1, title: 'Session 1: Stack & Queue Applications', topics: 'Topic 1: Expression evaluation; Topic 2: Circular queue buffer', date: '2026-10-05', isMakeup: false },
  { sessionId: 'SES_2', sessionNo: 2, title: 'Session 2: Linked Lists & Polynomial Arithmetic', topics: 'Topic 1: Singly and doubly linked lists; Topic 2: Sparse matrix addition', date: '2026-10-12', isMakeup: false },
  { sessionId: 'SES_3', sessionNo: 3, title: 'Session 3: Binary Search Trees & Balanced AVL Trees', topics: 'Topic 1: BST insertion and search; Topic 2: AVL rotations', date: '2026-10-19', isMakeup: false },
  { sessionId: 'SES_4', sessionNo: 4, title: 'Session 4: Heaps & Priority Queues', topics: 'Topic 1: Max-heapify and heap sort; Topic 2: Priority task scheduling', date: '2026-10-26', isMakeup: false },
  { sessionId: 'SES_5', sessionNo: 5, title: 'Session 5: Graph Traversals (BFS & DFS)', topics: 'Topic 1: Breadth-first graph search; Topic 2: Depth-first cycle detection', date: '2026-11-02', isMakeup: false },
  { sessionId: 'SES_6', sessionNo: 6, title: 'Session 6: Shortest Path Algorithms', topics: 'Topic 1: Dijkstra single source shortest path; Topic 2: Bellman-Ford detection', date: '2026-11-09', isMakeup: false },
  { sessionId: 'SES_7', sessionNo: 7, title: 'Session 7: Hashing & Open Addressing', topics: 'Topic 1: Linear & quadratic probing; Topic 2: Double hashing', date: '2026-11-16', isMakeup: false },
  { sessionId: 'SES_8', sessionNo: 8, title: 'Session 8: Lab Internal Assessment & Remedial Makeup', topics: 'Topic 1: Lab Practical Evaluation; Topic 2: Attendance makeup session', date: '2026-11-23', isMakeup: true },
]);

// Seed 15 Pre-Lab & 15 Post-Lab MCQs for SES_1
const samplePreLab15: McqQuestionItem[] = Array.from({ length: 15 }, (_, i) => ({
  id: `pre_${i + 1}`,
  question: `Pre-Lab Q${i + 1}: What is the time complexity of pushing an element onto an array-based stack in worst case with reallocation?`,
  options: ['O(1) amortized', 'O(n) worst case', 'O(log n)', 'O(n^2)'],
  correctOptionIndex: 1,
  bloomLevel: 'L2: Understand',
}));

const samplePostLab15: McqQuestionItem[] = Array.from({ length: 15 }, (_, i) => ({
  id: `post_${i + 1}`,
  question: `Post-Lab Q${i + 1}: In postfix expression evaluation using stack, what happens when an operator is encountered?`,
  options: ['Pop top two operands, evaluate and push result', 'Push operator to operand stack', 'Clear stack', 'Return error'],
  correctOptionIndex: 0,
  bloomLevel: 'L4: Analyze',
}));

lifecycleStore.sessionQuestions.set('SES_1', {
  coding: [
    {
      id: 'q_stack_1',
      choiceLabel: 'A',
      title: 'Choice A: Implement Balanced Parentheses Checker with Stack',
      description: 'Given a string containing brackets (), {}, [], check whether the pairs and the orders of brackets are valid.',
      source: 'ai',
      starterCode: '#include <stdio.h>\n#include <stdbool.h>\n\nbool isBalanced(char* exp) {\n  // Implement logic\n  return true;\n}',
      testCases: [
        { id: 'tc1', input: '{[()]}', expectedOutput: 'true', isHidden: false, weight: 1 },
        { id: 'tc2', input: '{[(])}', expectedOutput: 'false', isHidden: false, weight: 1 },
        { id: 'tc3', input: '{{[[(())]]}}', expectedOutput: 'true', isHidden: true, weight: 1 },
        { id: 'tc4', input: ')(', expectedOutput: 'false', isHidden: true, weight: 1 },
        { id: 'tc5', input: '', expectedOutput: 'true', isHidden: true, weight: 1 },
      ],
    },
    {
      id: 'q_stack_2',
      choiceLabel: 'B',
      title: 'Choice B: Implement Min-Stack with O(1) Retrieval',
      description: 'Design a stack that supports push, pop, top, and retrieving the minimum element in constant O(1) time.',
      source: 'manual',
      starterCode: '#include <stdio.h>\n\ntypedef struct {\n  int data[100];\n  int minData[100];\n  int top;\n} MinStack;\n',
      testCases: [
        { id: 'tc1', input: 'push 5, push 2, getMin', expectedOutput: '2', isHidden: false, weight: 1 },
        { id: 'tc2', input: 'push 3, pop, getMin', expectedOutput: '2', isHidden: false, weight: 1 },
        { id: 'tc3', input: 'push -1, getMin', expectedOutput: '-1', isHidden: true, weight: 1 },
        { id: 'tc4', input: 'pop, getMin', expectedOutput: '2', isHidden: true, weight: 1 },
        { id: 'tc5', input: 'pop, isEmpty', expectedOutput: 'true', isHidden: true, weight: 1 },
      ],
    },
  ],
  preLab: samplePreLab15,
  postLab: samplePostLab15,
});

// Seed sample live terminals for realtime monitoring
lifecycleStore.liveTerminals.set('SES_1', [
  { terminalId: 'WS-01', prn: '2199AIMM0001', name: 'Alice Patil', status: 'CODING', preLabScore: '3/3', testCasesPassed: '5/5', timeSpentMin: 42, attempts: 2, isSlowLearner: false, flagReason: '' },
  { terminalId: 'WS-02', prn: '2199AIMM0002', name: 'Bob Deshmukh', status: 'SLOW_LEARNER', preLabScore: '1/3', testCasesPassed: '1/5', timeSpentMin: 55, attempts: 7, isSlowLearner: true, flagReason: 'Repeated syntax & boundary errors (>4 failures)' },
  { terminalId: 'WS-03', prn: '2199AIMM0003', name: 'Charlie Shinde', status: 'SUBMITTED', preLabScore: '3/3', testCasesPassed: '5/5', timeSpentMin: 38, attempts: 1, isSlowLearner: false, flagReason: '' },
  { terminalId: 'WS-04', prn: '2199AIMM0004', name: 'Divya Kulkarni', status: 'CODING', preLabScore: '2/3', testCasesPassed: '3/5', timeSpentMin: 48, attempts: 3, isSlowLearner: false, flagReason: '' },
  { terminalId: 'WS-05', prn: '2199AIMM0005', name: 'Eshwar Rathod', status: 'POOR_PERFORMANCE', preLabScore: '0/3', testCasesPassed: '0/5', timeSpentMin: 58, attempts: 8, isSlowLearner: true, flagReason: 'Zero test cases passed at 58 min mark' },
  { terminalId: 'WS-06', prn: '2199AIMM0006', name: 'Farhan Shaikh', status: 'SUBMITTED', preLabScore: '3/3', testCasesPassed: '4/5', timeSpentMin: 45, attempts: 2, isSlowLearner: false, flagReason: '' },
]);

// Seed announcements & resources
lifecycleStore.announcements.set(defaultCourseId, [
  { id: 'ann_1', title: 'Lab Session 1 Preparation & Safety Guidelines', body: 'All students must complete Pre-Lab MCQs on LogicQ before entering Lab 301. Ensure your GCC environment is active.', date: '2026-10-04', pinned: true, author: 'Prof. Hariprasath K' },
  { id: 'ann_2', title: 'Batch A Slot Rescheduling Notice', body: 'Batch A session on Oct 12 is scheduled from 09:00 AM sharp. Please be seated at assigned terminals by 08:55 AM.', date: '2026-10-10', pinned: false, author: 'Prof. Hariprasath K' },
]);

lifecycleStore.resources.set(defaultCourseId, [
  { id: 'res_1', title: 'CS201 Complete Lab Manual (PDF)', type: 'PDF', size: '2.4 MB', uploadedAt: '2026-10-01', link: '/downloads/cs201-manual.pdf' },
  { id: 'res_2', title: 'Standard C Boilerplates & Makefile Templates', type: 'ZIP', size: '840 KB', uploadedAt: '2026-10-02', link: '/downloads/c-templates.zip' },
  { id: 'res_3', title: 'Stack & Queue Visual Algorithms Guide', type: 'SLIDES', size: '5.1 MB', uploadedAt: '2026-10-03', link: '/downloads/stack-queue-guide.pptx' },
]);

// 1. Get Course Lifecycle State
labCourseRouter.get('/course-lifecycle/:courseId', (req: Request, res: Response) => {
  const courseId = req.params.courseId || defaultCourseId;
  const course = lifecycleStore.courses.get(courseId) || lifecycleStore.courses.get(defaultCourseId);
  const batches = lifecycleStore.batches.get(courseId) || lifecycleStore.batches.get(defaultCourseId) || [];
  const sessionPlans = lifecycleStore.sessionPlans.get(courseId) || lifecycleStore.sessionPlans.get(defaultCourseId) || [];
  const announcements = lifecycleStore.announcements.get(courseId) || lifecycleStore.announcements.get(defaultCourseId) || [];
  const resources = lifecycleStore.resources.get(courseId) || lifecycleStore.resources.get(defaultCourseId) || [];

  return res.json({
    success: true,
    course,
    batches,
    sessionPlans,
    announcements,
    resources,
  });
});

// 2. Faculty Course Registration (Step 1)
labCourseRouter.post('/course-lifecycle/register-course', (req: Request, res: Response) => {
  const { courseCode, courseTitle, department, academicYear, semester, ltpc, syllabusHours, outcomes, coPoMapping } = req.body;

  if (!courseCode || !courseTitle) {
    return res.status(400).json({ success: false, message: 'Course Code and Course Title are required.' });
  }

  const courseId = `${courseCode}_LAB`;
  const courseData = {
    courseCode,
    courseTitle,
    department: department || 'Computer Science & Engineering',
    academicYear: academicYear || '2026-2027',
    semester: semester || 'III',
    ltpc: ltpc || '0-0-4-2',
    syllabusHours: Number(syllabusHours) || 60,
    outcomes: outcomes || [],
    coPoMapping: coPoMapping || [],
  };

  lifecycleStore.courses.set(courseId, courseData);

  return res.json({
    success: true,
    message: 'Course registered successfully in institutional catalog.',
    courseId,
    course: courseData,
  });
});

// 3. Batch Creation (Step 2)
labCourseRouter.post('/course-lifecycle/create-batches', (req: Request, res: Response) => {
  const { courseId, totalStudents, labRoomCapacity, defaultSlotDurationMin } = req.body;
  const numStudents = Number(totalStudents) || 72;
  const roomCap = Number(labRoomCapacity) || 24;

  const numBatches = Math.ceil(numStudents / roomCap);
  const baseSize = Math.floor(numStudents / numBatches);
  const remainder = numStudents % numBatches;

  const days = ['Monday', 'Wednesday', 'Friday', 'Tuesday', 'Thursday'];
  const times = ['09:00 - 11:00 AM', '02:00 - 04:00 PM', '11:00 AM - 01:00 PM', '09:00 - 11:00 AM'];

  const generatedBatches = [];
  let currentStart = 1;

  for (let i = 0; i < numBatches; i++) {
    const size = baseSize + (i < remainder ? 1 : 0);
    const end = currentStart + size - 1;
    const batchLetter = String.fromCharCode(65 + i);
    generatedBatches.push({
      batchId: `BATCH_${batchLetter}`,
      name: `Batch ${batchLetter} (PRN ${String(currentStart).padStart(2, '0')}-${String(end).padStart(2, '0')})`,
      size,
      room: `Lab 30${(i % 2) + 1} - ${i % 2 === 0 ? 'Turing' : 'Lovelace'} Hall`,
      slotDay: days[i % days.length],
      slotTime: times[i % times.length],
      durationMin: defaultSlotDurationMin || 120,
    });
    currentStart = end + 1;
  }

  lifecycleStore.batches.set(courseId || defaultCourseId, generatedBatches);

  return res.json({
    success: true,
    message: `Partitioned ${numStudents} students into ${numBatches} balanced batches.`,
    batches: generatedBatches,
  });
});

// 4. Session Plan Creation (Step 3)
labCourseRouter.post('/course-lifecycle/session-plans', (req: Request, res: Response) => {
  const { courseId, sessions } = req.body;
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return res.status(400).json({ success: false, message: 'Sessions list required.' });
  }

  lifecycleStore.sessionPlans.set(courseId || defaultCourseId, sessions);
  return res.json({ success: true, message: 'Session plan saved successfully.', sessions });
});

// 5. Session Questions & Pre/Post MCQ Banks (Step 4)
labCourseRouter.post('/course-lifecycle/sessions/:sessionId/questions', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { coding, preLab, postLab } = req.body;

  // Validate coding question choices (max 2 questions)
  if (Array.isArray(coding)) {
    const codingValidation = validateSessionCodingQuestions(coding);
    if (!codingValidation.valid) {
      return res.status(400).json({ success: false, message: codingValidation.error });
    }
  }

  // Validate pre/post lab banks (15 each)
  if (Array.isArray(preLab) && Array.isArray(postLab)) {
    const mcqValidation = validatePrePostLabBank({ preLabQuestions: preLab, postLabQuestions: postLab });
    if (!mcqValidation.valid) {
      return res.status(400).json({ success: false, errors: mcqValidation.errors, message: mcqValidation.errors.join(' ') });
    }
  }

  lifecycleStore.sessionQuestions.set(sessionId, {
    coding: coding || [],
    preLab: preLab || [],
    postLab: postLab || [],
  });

  return res.json({
    success: true,
    message: 'Session coding questions and 15 Pre/Post-Lab MCQs saved.',
    sessionId,
  });
});

labCourseRouter.get('/course-lifecycle/sessions/:sessionId/questions', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const questions = lifecycleStore.sessionQuestions.get(sessionId) || lifecycleStore.sessionQuestions.get('SES_1');
  return res.json({ success: true, questions });
});

// Student Scoped Randomization of 3 Pre-Lab and 3 Post-Lab MCQs
labCourseRouter.get('/course-lifecycle/sessions/:sessionId/student-mcqs', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { prn } = req.query;
  const studentPrn = String(prn || '2199AIMM0001');

  const questions = lifecycleStore.sessionQuestions.get(sessionId) || lifecycleStore.sessionQuestions.get('SES_1');
  if (!questions) {
    return res.status(404).json({ success: false, message: 'Questions not found for session.' });
  }

  const randomizedPreLab = randomizeLabMcqs(questions.preLab, studentPrn, 3);
  const randomizedPostLab = randomizeLabMcqs(questions.postLab, studentPrn, 3);

  return res.json({
    success: true,
    studentPrn,
    sessionId,
    preLab: randomizedPreLab,
    postLab: randomizedPostLab,
    codingChoices: questions.coding,
  });
});

// 6. Realtime Monitoring & Slow Learner Alerts (Step 5)
labCourseRouter.get('/course-lifecycle/realtime-monitoring/:sessionId', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const terminals = lifecycleStore.liveTerminals.get(sessionId) || lifecycleStore.liveTerminals.get('SES_1') || [];

  const slowLearners = terminals.filter((t: any) => t.isSlowLearner);

  return res.json({
    success: true,
    sessionId,
    totalWorkstations: terminals.length,
    activeTerminals: terminals,
    slowLearnerAlertCount: slowLearners.length,
    slowLearners,
  });
});

labCourseRouter.post('/course-lifecycle/realtime-monitoring/log-remediation', (req: Request, res: Response) => {
  const { terminalId, prn, remedialActionNote, facultyName } = req.body;

  const logEntry = {
    terminalId,
    prn,
    remedialActionNote,
    facultyName: facultyName || 'Faculty',
    timestamp: new Date().toISOString(),
  };

  inMemoryStore.auditLogs.push(
    createAuditLogEntry({
      userId: prn,
      role: 'FACULTY',
      action: 'update',
      objectType: 'remedial_intervention',
      objectId: terminalId,
      before: null,
      after: logEntry,
    })
  );

  return res.json({ success: true, message: 'Remedial action recorded.', logEntry });
});

// 7. Attainment & Mark Sheet Download Anytime (Step 6)
labCourseRouter.get('/course-lifecycle/attainment-report/:courseId', (req: Request, res: Response) => {
  const courseId = req.params.courseId || defaultCourseId;
  const course = lifecycleStore.courses.get(courseId) || lifecycleStore.courses.get(defaultCourseId);

  // Mark sheet entries
  const markSheet = [
    { rollNo: '2199AIMM0001', name: 'Alice Patil', batch: 'Batch A', preLab: 3, coding: 14, postLab: 3, totalScaled20: 20, status: 'EXCELLENT' },
    { rollNo: '2199AIMM0002', name: 'Bob Deshmukh', batch: 'Batch A', preLab: 1, coding: 6, postLab: 1, totalScaled20: 8, status: 'REMEDIAL_REQUIRED' },
    { rollNo: '2199AIMM0003', name: 'Charlie Shinde', batch: 'Batch A', preLab: 3, coding: 13, postLab: 3, totalScaled20: 19, status: 'EXCELLENT' },
    { rollNo: '2199AIMM0004', name: 'Divya Kulkarni', batch: 'Batch A', preLab: 2, coding: 10, postLab: 2, totalScaled20: 14, status: 'SATISFACTORY' },
    { rollNo: '2199AIMM0005', name: 'Eshwar Rathod', batch: 'Batch A', preLab: 0, coding: 4, postLab: 1, totalScaled20: 5, status: 'SLOW_LEARNER' },
    { rollNo: '2199AIMM0006', name: 'Farhan Shaikh', batch: 'Batch A', preLab: 3, coding: 11, postLab: 2, totalScaled20: 16, status: 'GOOD' },
  ];

  // Attainment analysis
  const coAttainment = [
    { co: 'CO1', targetPct: 60, attainedPct: 82.5, level: 3, status: 'ATTAINED' },
    { co: 'CO2', targetPct: 60, attainedPct: 78.0, level: 3, status: 'ATTAINED' },
    { co: 'CO3', targetPct: 60, attainedPct: 69.4, level: 2, status: 'ATTAINED' },
    { co: 'CO4', targetPct: 60, attainedPct: 58.2, level: 1, status: 'MARGINAL' },
    { co: 'CO5', targetPct: 60, attainedPct: 74.6, level: 3, status: 'ATTAINED' },
  ];

  const poAttainment = [
    { po: 'PO1', value: 2.8 }, { po: 'PO2', value: 2.6 }, { po: 'PO3', value: 2.7 },
    { po: 'PO4', value: 2.5 }, { po: 'PO5', value: 2.9 }, { po: 'PSO1', value: 2.8 }, { po: 'PSO2', value: 2.7 },
  ];

  return res.json({
    success: true,
    courseId,
    courseTitle: course?.courseTitle || 'Data Structures & Algorithms Laboratory',
    markSheet,
    coAttainment,
    poAttainment,
    overallDirectAttainment: 2.65,
    indirectAttainment: 2.80,
    finalNaacScore: 2.68,
  });
});

// 8. LMS Announcements & Resources (Step 7)
labCourseRouter.post('/course-lifecycle/announcements', (req: Request, res: Response) => {
  const { courseId, title, body, pinned, author } = req.body;
  const current = lifecycleStore.announcements.get(courseId || defaultCourseId) || [];
  const newAnn = {
    id: `ann_${Date.now()}`,
    title,
    body,
    date: new Date().toISOString().split('T')[0],
    pinned: Boolean(pinned),
    author: author || 'Faculty In-Charge',
  };
  current.unshift(newAnn);
  lifecycleStore.announcements.set(courseId || defaultCourseId, current);

  return res.json({ success: true, announcement: newAnn });
});

labCourseRouter.post('/course-lifecycle/resources', (req: Request, res: Response) => {
  const { courseId, title, type, size, link } = req.body;
  const current = lifecycleStore.resources.get(courseId || defaultCourseId) || [];
  const newRes = {
    id: `res_${Date.now()}`,
    title,
    type: type || 'PDF',
    size: size || '1.5 MB',
    uploadedAt: new Date().toISOString().split('T')[0],
    link: link || '#',
  };
  current.unshift(newRes);
  lifecycleStore.resources.set(courseId || defaultCourseId, current);

  return res.json({ success: true, resource: newRes });
});

// -----------------------------------------------------------------------------
// 17. AUDIT LOG (BR-4)
// -----------------------------------------------------------------------------
labCourseRouter.get('/admin/audit-logs', (_req: Request, res: Response) => {
  return res.json({ success: true, logs: inMemoryStore.auditLogs });
});
