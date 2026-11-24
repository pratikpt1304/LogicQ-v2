import {
  RoleLevel,
  ScopeType,
  RoleAssignment,
  UserAccount,
  AuditLogEntry,
  EligibilityRule,
  AcademicTerm,
  CalendarEvent,
  CourseUnit,
  CourseTopic,
  LabSession,
  SessionPlan,
  Batch,
  Course,
  CourseOutcome,
  CoPoMap,
} from './types.js';

// Hierarchy levels per page 3
export const ROLE_HIERARCHY_LEVELS: Record<RoleLevel, number> = {
  SUPER_ADMIN: 0,
  UNIVERSITY_ADMIN: 1,
  SCHOOL_ADMIN: 2,
  DEPARTMENT_ADMIN: 3,
  COURSE_OWNER: 4,
  FACULTY: 5,
  LAB_ASSISTANT: 6,
  STUDENT: 7,
};

// -----------------------------------------------------------------------------
// BR-1: A role's rights apply only inside its scope; higher levels see everything below them.
// AC-5: A dean cannot see or edit another school's departments, rosters or reports.
// -----------------------------------------------------------------------------
export interface EntityScopeRef {
  schoolId?: string;
  departmentId?: string;
  courseId?: string;
  sectionId?: string;
  batchId?: string;
  studentId?: string;
}

export function evaluateScopeAccess(
  userRole: RoleAssignment,
  targetScope: EntityScopeRef
): boolean {
  // Level 0 (Super Admin) & Level 1 (University Admin) see everything in university
  if (userRole.role === 'SUPER_ADMIN' || userRole.role === 'UNIVERSITY_ADMIN') {
    return true;
  }

  // Level 2 (School Admin / Dean): Only within their assigned school
  if (userRole.role === 'SCHOOL_ADMIN') {
    if (userRole.scopeType === 'school' && targetScope.schoolId) {
      return userRole.scopeId === targetScope.schoolId;
    }
    return false;
  }

  // Level 3 (Department Admin / HOD): Only within their department
  if (userRole.role === 'DEPARTMENT_ADMIN') {
    if (userRole.scopeType === 'department' && targetScope.departmentId) {
      return userRole.scopeId === targetScope.departmentId;
    }
    return false;
  }

  // Level 4 (Course Owner / Coordinator): Only within their assigned course
  if (userRole.role === 'COURSE_OWNER') {
    if (userRole.scopeType === 'course' && targetScope.courseId) {
      return userRole.scopeId === targetScope.courseId;
    }
    return false;
  }

  // Level 5 (Faculty): Only assigned sections or batches
  if (userRole.role === 'FACULTY') {
    if (userRole.scopeType === 'section' && targetScope.sectionId) {
      return userRole.scopeId === targetScope.sectionId;
    }
    if (userRole.scopeType === 'batch' && targetScope.batchId) {
      return userRole.scopeId === targetScope.batchId;
    }
    return false;
  }

  // Level 6 (Lab Assistant / TA): Only assigned batches
  if (userRole.role === 'LAB_ASSISTANT') {
    if (userRole.scopeType === 'batch' && targetScope.batchId) {
      return userRole.scopeId === targetScope.batchId;
    }
    return false;
  }

  // Level 7 (Student): Only self
  if (userRole.role === 'STUDENT') {
    if (targetScope.studentId) {
      return userRole.userId === targetScope.studentId;
    }
    return false;
  }

  return false;
}

// -----------------------------------------------------------------------------
// BR-2: A lower level can tighten a threshold set above it (for example raise minimum attendance) but never loosen it.
// -----------------------------------------------------------------------------
export function tightenThreshold(
  parentThreshold: number,
  proposedThreshold: number,
  isMinimumRequirement = true
): { allowed: boolean; effectiveValue: number; error?: string } {
  // If it's a minimum requirement (like min attendance 75%), tightening means increasing it (e.g. to 80%).
  // Loosening (e.g. lowering to 70%) is strictly forbidden.
  if (isMinimumRequirement) {
    if (proposedThreshold < parentThreshold) {
      return {
        allowed: false,
        effectiveValue: parentThreshold,
        error: `BR-2 Violation: Cannot loosen threshold below parent level requirement (${parentThreshold}%). Proposed: ${proposedThreshold}%`,
      };
    }
    return {
      allowed: true,
      effectiveValue: proposedThreshold,
    };
  } else {
    // If it's a maximum allowance, tightening means decreasing it.
    if (proposedThreshold > parentThreshold) {
      return {
        allowed: false,
        effectiveValue: parentThreshold,
        error: `BR-2 Violation: Cannot loosen maximum threshold above parent level limit (${parentThreshold}%).`,
      };
    }
    return {
      allowed: true,
      effectiveValue: proposedThreshold,
    };
  }
}

// -----------------------------------------------------------------------------
// BR-3: The person who sets an end-sem paper cannot also be its moderator.
// -----------------------------------------------------------------------------
export function validateEndSemRoles(
  setterId: string,
  moderatorId: string
): { valid: boolean; error?: string } {
  if (setterId === moderatorId) {
    return {
      valid: false,
      error: 'BR-3 Violation: The person who sets an end-sem paper cannot also be its moderator.',
    };
  }
  return { valid: true };
}

// -----------------------------------------------------------------------------
// BR-4: Every create, approve, publish and delete is written to an append-only audit log with user, role, time and before/after values.
// -----------------------------------------------------------------------------
export function createAuditLogEntry(params: {
  userId: string;
  role: string;
  action: 'create' | 'approve' | 'publish' | 'delete' | 'update' | 'tighten';
  objectType: string;
  objectId: string;
  before: any;
  after: any;
}): AuditLogEntry {
  return {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    userId: params.userId,
    role: params.role,
    action: params.action,
    objectType: params.objectType,
    objectId: params.objectId,
    before: params.before,
    after: params.after,
    at: new Date(),
  };
}

// -----------------------------------------------------------------------------
// BR-5: No self-signup. Accounts are created only by roster import (students) or staff import (staff).
// BR-6: Sign-in is by institutional SSO. Email must match onboarded email exactly, or refused with exact message.
// BR-8: Roll no/PRN is unique student key; one account per student across all courses.
// AC-1: A user whose SSO email is not onboarded cannot reach any page beyond refusal message.
// AC-2: Importing a roster with a duplicate roll number shows the conflict and saves nothing until resolved.
// -----------------------------------------------------------------------------
export const SSO_REFUSAL_MESSAGE =
  'Your email is not registered on LogicQ. Contact your faculty or HOD.';

export interface RosterRow {
  rollNo: string;
  name: string;
  email: string;
}

export function validateRosterImport(
  rows: RosterRow[],
  existingRollNumbers: Set<string>,
  institutionalDomain = 'sanjivani.edu.in'
): {
  isValid: boolean;
  conflicts: { row: number; rollNo: string; reason: string }[];
  validRows: RosterRow[];
} {
  const conflicts: { row: number; rollNo: string; reason: string }[] = [];
  const seenInBatch = new Set<string>();
  const validRows: RosterRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    // Check empty fields
    if (!row.rollNo?.trim() || !row.name?.trim() || !row.email?.trim()) {
      conflicts.push({
        row: rowNum,
        rollNo: row.rollNo || 'UNKNOWN',
        reason: 'Missing required field (Roll No, Name, or Email)',
      });
      continue;
    }

    const cleanRollNo = row.rollNo.trim().toUpperCase();
    const cleanEmail = row.email.trim().toLowerCase();

    // Institutional domain check
    if (!cleanEmail.endsWith(`@${institutionalDomain}`)) {
      conflicts.push({
        row: rowNum,
        rollNo: cleanRollNo,
        reason: `Email does not belong to institutional domain (@${institutionalDomain})`,
      });
      continue;
    }

    // Duplicate check within uploaded file
    if (seenInBatch.has(cleanRollNo)) {
      conflicts.push({
        row: rowNum,
        rollNo: cleanRollNo,
        reason: `Duplicate Roll No '${cleanRollNo}' found inside the uploaded batch`,
      });
      continue;
    }

    // Duplicate check against existing database accounts (BR-8)
    if (existingRollNumbers.has(cleanRollNo)) {
      conflicts.push({
        row: rowNum,
        rollNo: cleanRollNo,
        reason: `Roll No '${cleanRollNo}' already exists in the system`,
      });
      continue;
    }

    seenInBatch.add(cleanRollNo);
    validRows.push({
      rollNo: cleanRollNo,
      name: row.name.trim(),
      email: cleanEmail,
    });
  }

  // AC-2: Saves NOTHING until resolved if any conflict exists
  const isValid = conflicts.length === 0;
  return {
    isValid,
    conflicts,
    validRows: isValid ? validRows : [],
  };
}

export function verifySsoLogin(
  ssoEmail: string,
  onboardedEmails: Set<string>
): { allowed: boolean; message?: string } {
  const normalized = ssoEmail.trim().toLowerCase();
  if (!onboardedEmails.has(normalized)) {
    return {
      allowed: false,
      message: SSO_REFUSAL_MESSAGE,
    };
  }
  return { allowed: true };
}

// -----------------------------------------------------------------------------
// AC-4: A student cannot edit name, roll no or email.
// -----------------------------------------------------------------------------
export function validateStudentProfileUpdate(
  proposedUpdates: Record<string, any>
): { allowed: boolean; forbiddenFields?: string[] } {
  const lockedFields = ['name', 'rollNo', 'roll_no', 'email', 'prn'];
  const forbidden = Object.keys(proposedUpdates).filter((k) =>
    lockedFields.includes(k)
  );

  if (forbidden.length > 0) {
    return {
      allowed: false,
      forbiddenFields: forbidden,
    };
  }
  return { allowed: true };
}

// -----------------------------------------------------------------------------
// BR-10: Batch cap = the smaller of 65 and the lab room's working seats.
// BR-11: Number of batches = section size ÷ cap, rounded up. Students sorted by roll no
//        are split into consecutive batches whose sizes differ by at most one
//        (60 → 1 batch; 64 → 1; 70 → 35 + 35; 125 → 63 + 62; 180 → 60 × 3).
// AC-8: A 125-student section in a 65-seat lab produces two batches of 63 and 62.
// -----------------------------------------------------------------------------
export function partitionBatches<T extends { rollNo: string }>(
  students: T[],
  roomWorkingSeats: number
): { batchCap: number; batches: T[][] } {
  const batchCap = Math.min(65, roomWorkingSeats);
  const totalStudents = students.length;

  if (totalStudents === 0) {
    return { batchCap, batches: [] };
  }

  const numBatches = Math.ceil(totalStudents / batchCap);

  // Sort students strictly by roll no
  const sorted = [...students].sort((a, b) => a.rollNo.localeCompare(b.rollNo));

  // Partition so sizes differ by at most 1
  const baseSize = Math.floor(totalStudents / numBatches);
  const remainder = totalStudents % numBatches;

  const batches: T[][] = [];
  let currentIndex = 0;

  for (let i = 0; i < numBatches; i++) {
    // Distribute remainder 1 by 1 across the first few batches
    const currentBatchSize = baseSize + (i < remainder ? 1 : 0);
    const batchGroup = sorted.slice(currentIndex, currentIndex + currentBatchSize);
    batches.push(batchGroup);
    currentIndex += currentBatchSize;
  }

  return { batchCap, batches };
}

// -----------------------------------------------------------------------------
// BR-12: Faculty may move students between batches until the batch's first lab session;
// afterwards a move needs a reason and is logged.
// -----------------------------------------------------------------------------
export function canMoveStudent(
  firstLabSessionStarted: boolean,
  reason?: string
): { allowed: boolean; mustLogReason: boolean; error?: string } {
  if (!firstLabSessionStarted) {
    return { allowed: true, mustLogReason: false };
  }

  if (!reason || reason.trim().length === 0) {
    return {
      allowed: false,
      mustLogReason: true,
      error: 'BR-12 Violation: Student movement after the first lab session requires a documented reason.',
    };
  }

  return { allowed: true, mustLogReason: true };
}

// -----------------------------------------------------------------------------
// BR-13 to BR-17, AC-9, AC-10: Session plan generator
// BR-13: Available lab periods for a batch = dates on its lab weekday from term start to last working day, minus holidays, exam days and no-lab days.
// BR-14: Periods are allocated to units in proportion to syllabus hours, rounding so the total matches; equal by default (5 units × 3 periods = 15).
// BR-15: One lab period = 2 consecutive hours = 2 sessions = 2 topics; 3 periods give a unit 6 topics; 15 periods give 30 lab programs.
// BR-16: If available periods are fewer than needed, show the shortfall and offer 3 options:
//        1) two programs in one session, 2) an extra lab period, 3) chosen topics as take-home practice. Faculty must choose before approval.
// BR-17: The last available period is reserved for makeup and a practical exam unless faculty switch it off.
// AC-9: No lab session is ever placed on a holiday, exam day or no-lab day.
// -----------------------------------------------------------------------------
export interface ShortfallResolution {
  option: 'two_in_one' | 'extra_period' | 'take_home_practice';
  extraDates?: string[];
  takeHomeTopicIds?: string[];
}

export function computeAvailableLabDates(
  termStartDate: string, // YYYY-MM-DD
  lastWorkingDay: string, // YYYY-MM-DD
  labWeekday: number, // 0..6 (0=Sun, 1=Mon, ..., 6=Sat)
  blockedDates: Set<string> // holidays, exams, no-lab days
): string[] {
  const available: string[] = [];
  const start = new Date(termStartDate);
  const end = new Date(lastWorkingDay);

  const curr = new Date(start);
  while (curr <= end) {
    if (curr.getDay() === labWeekday) {
      const dateStr = curr.toISOString().split('T')[0];
      if (!blockedDates.has(dateStr)) {
        available.push(dateStr);
      }
    }
    curr.setDate(curr.getDate() + 1);
  }

  return available;
}

export function generateSessionPlan(params: {
  term: AcademicTerm;
  batchWeekday: number;
  blockedDates: Set<string>;
  units: CourseUnit[];
  reserveLastPeriodForMakeup?: boolean; // Default true per BR-17
}): {
  periods: string[];
  makeupPeriod?: string;
  neededPeriods: number;
  shortfall: number;
  optionsRequired: boolean;
  shortfallOptions: string[];
  unitAllocations: { unitId: string; periodsAllocated: number; topicsAllocated: string[][] }[];
  sessions: { date: string; periodNo: number; topicIds: string[]; isMakeup: boolean }[];
} {
  const reserveLast = params.reserveLastPeriodForMakeup ?? true;
  let allDates = computeAvailableLabDates(
    params.term.startDate,
    params.term.lastWorkingDay,
    params.batchWeekday,
    params.blockedDates
  );

  let makeupPeriod: string | undefined = undefined;
  let teachingPeriods = [...allDates];

  if (reserveLast && teachingPeriods.length > 0) {
    makeupPeriod = teachingPeriods[teachingPeriods.length - 1];
    teachingPeriods = teachingPeriods.slice(0, -1);
  }

  // Calculate needed periods: default 3 periods per unit (6 topics = 2 topics / period per BR-15)
  const totalSyllabusHours = params.units.reduce((acc, u) => acc + (u.syllabusHours || 6), 0);
  const neededPeriods = params.units.reduce((acc, u) => acc + Math.ceil((u.topics?.length || 6) / 2), 0) || (params.units.length * 3);

  const shortfall = Math.max(0, neededPeriods - teachingPeriods.length);
  const optionsRequired = shortfall > 0;
  const shortfallOptions = [
    'two_programs_in_one_session',
    'extra_lab_period',
    'take_home_practice',
  ];

  // Proportional allocation of available periods to units (BR-14)
  const availableCount = Math.min(teachingPeriods.length, neededPeriods);
  const unitAllocations: { unitId: string; periodsAllocated: number; topicsAllocated: string[][] }[] = [];

  let periodsAssigned = 0;
  for (let i = 0; i < params.units.length; i++) {
    const unit = params.units[i];
    let count: number;
    if (i === params.units.length - 1) {
      count = availableCount - periodsAssigned;
    } else {
      const ratio = (unit.syllabusHours || 6) / totalSyllabusHours;
      count = Math.round(ratio * availableCount);
    }
    periodsAssigned += count;

    // 2 topics per period (BR-15)
    const topicsAllocated: string[][] = [];
    const allUnitTopics = unit.topics || [];
    for (let p = 0; p < count; p++) {
      const t1 = allUnitTopics[p * 2]?.id || `U${unit.number}_T${p * 2 + 1}`;
      const t2 = allUnitTopics[p * 2 + 1]?.id || `U${unit.number}_T${p * 2 + 2}`;
      topicsAllocated.push([t1, t2]);
    }

    unitAllocations.push({
      unitId: unit.id,
      periodsAllocated: count,
      topicsAllocated,
    });
  }

  // Map to planned sessions
  const sessions: { date: string; periodNo: number; topicIds: string[]; isMakeup: boolean }[] = [];
  let periodIdx = 0;

  for (const alloc of unitAllocations) {
    for (const topicPair of alloc.topicsAllocated) {
      if (periodIdx < teachingPeriods.length) {
        sessions.push({
          date: teachingPeriods[periodIdx],
          periodNo: periodIdx + 1,
          topicIds: topicPair,
          isMakeup: false,
        });
        periodIdx++;
      }
    }
  }

  if (makeupPeriod) {
    sessions.push({
      date: makeupPeriod,
      periodNo: periodIdx + 1,
      topicIds: [],
      isMakeup: true, // BR-17
    });
  }

  return {
    periods: teachingPeriods,
    makeupPeriod,
    neededPeriods,
    shortfall,
    optionsRequired,
    shortfallOptions,
    unitAllocations,
    sessions,
  };
}

// -----------------------------------------------------------------------------
// BR-18: Any calendar change touching a batch's lab dates sets its plan back to draft and notifies faculty.
// AC-6: Adding a holiday to the calendar flags every affected session plan for re-approval.
// -----------------------------------------------------------------------------
export function checkCalendarChangeImpact(
  newCalendarEvent: CalendarEvent,
  plans: { planId: string; batchId: string; status: 'draft' | 'approved'; sessions: LabSession[] }[]
): {
  affectedPlanIds: string[];
  updatedPlans: { planId: string; status: 'draft'; flaggedForReapproval: boolean }[];
} {
  const eventDate = newCalendarEvent.date;
  const isBlocking = ['holiday', 'exam', 'no-lab'].includes(newCalendarEvent.type);

  if (!isBlocking) {
    return { affectedPlanIds: [], updatedPlans: [] };
  }

  const affectedPlanIds: string[] = [];
  const updatedPlans: { planId: string; status: 'draft'; flaggedForReapproval: boolean }[] = [];

  for (const plan of plans) {
    const hasCollision = plan.sessions.some((s) => s.date === eventDate);
    if (hasCollision) {
      affectedPlanIds.push(plan.planId);
      updatedPlans.push({
        planId: plan.planId,
        status: 'draft',
        flaggedForReapproval: true,
      });
    }
  }

  return { affectedPlanIds, updatedPlans };
}

// -----------------------------------------------------------------------------
// AC-7: A course cannot be offered until its COs and CO-PO matrix are approved.
// -----------------------------------------------------------------------------
export function canCourseBeOffered(course: {
  id: string;
  status: 'draft' | 'approved';
  outcomes: CourseOutcome[];
  coPoMaps: CoPoMap[];
}): { canOffer: boolean; reason?: string } {
  if (course.status !== 'approved') {
    return {
      canOffer: false,
      reason: 'AC-7: Course is not in approved status.',
    };
  }

  if (!course.outcomes || course.outcomes.length === 0) {
    return {
      canOffer: false,
      reason: 'AC-7: Course has no Course Outcomes (COs) defined.',
    };
  }

  if (!course.coPoMaps || course.coPoMaps.length === 0) {
    return {
      canOffer: false,
      reason: 'AC-7: Course CO-PO mapping matrix has not been configured.',
    };
  }

  return { canOffer: true };
}

// -----------------------------------------------------------------------------
// AC-13: A student sees only courses they are enrolled in and only their own marks.
// -----------------------------------------------------------------------------
export function filterCoursesForStudent<T extends { courseId: string }>(
  enrolledCourseIds: Set<string>,
  allCourses: T[]
): T[] {
  return allCourses.filter((c) => enrolledCourseIds.has(c.courseId));
}

export function filterMarksForStudent<T extends { studentId: string }>(
  requestingStudentId: string,
  marksRecords: T[]
): T[] {
  return marksRecords.filter((m) => m.studentId === requestingStudentId);
}
