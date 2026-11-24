export type RoleLevel = 
  | 'SUPER_ADMIN'     // Level 0: One LogicQ super admin
  | 'UNIVERSITY_ADMIN'// Level 1: CoE, VC
  | 'SCHOOL_ADMIN'    // Level 2: Deans (e.g. SET, SCM, SPS, SSC)
  | 'DEPARTMENT_ADMIN'// Level 3: HODs
  | 'COURSE_OWNER'    // Level 4: Course coordinators
  | 'FACULTY'         // Level 5: Teaching staff
  | 'LAB_ASSISTANT'   // Level 6: Support staff / TA
  | 'STUDENT';        // Level 7: Enrolled students

export type ScopeType = 'university' | 'school' | 'department' | 'course' | 'section' | 'batch' | 'self';

export interface RoleAssignment {
  id: string;
  userId: string;
  role: RoleLevel;
  scopeType: ScopeType;
  scopeId: string; // e.g. "SET", "DEPT_CSE", "COURSE_CS101", etc.
}

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  phone?: string;
  photoUrl?: string;
  status: 'invited' | 'active' | 'inactive' | 'archived';
  roleAssignments: RoleAssignment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentProfile {
  id: string;
  userId: string;
  rollNo: string;
  programId: string;
  admissionYear: number;
  consentAt?: Date;
}

export interface School {
  id: string;
  code: string;
  name: string;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  schoolId: string;
}

export interface Program {
  id: string;
  code: string;
  name: string;
  degree: string;
  departmentId: string;
  pos: string[];
  psos: string[];
}

export interface AcademicTerm {
  id: string;
  academicYear: string;
  semester: number;
  startDate: string; // YYYY-MM-DD
  lastWorkingDay: string; // YYYY-MM-DD
  endSemWindow: { start: string; end: string };
}

export type CalendarEventType = 'holiday' | 'exam' | 'event' | 'no-lab';

export interface CalendarEvent {
  id: string;
  termId: string;
  date: string; // YYYY-MM-DD
  type: CalendarEventType;
  title: string;
  scopeType: ScopeType;
  scopeId: string;
}

export interface CourseOutcome {
  id: string;
  code: string; // CO1, CO2, etc.
  statement: string;
  bloomLevel: string;
}

export interface CoPoMap {
  id: string;
  courseOutcomeId: string;
  poCode: string; // PO1..PO12, PSO1..PSO2
  strength: number; // 0, 1, 2, 3
}

export interface Course {
  id: string;
  code: string;
  title: string;
  L: number;
  T: number;
  P: number;
  C: number;
  status: 'draft' | 'approved';
  departmentId: string;
  coordinatorId: string;
  units: CourseUnit[];
  outcomes: CourseOutcome[];
  coPoMaps: CoPoMap[];
}

export interface CourseUnit {
  id: string;
  courseId: string;
  number: number;
  title: string;
  syllabusHours: number;
  topics: CourseTopic[];
}

export interface CourseTopic {
  id: string;
  unitId: string;
  number: number;
  title: string;
}

export interface Offering {
  id: string;
  courseId: string;
  termId: string;
  status: 'draft' | 'active' | 'completed';
  sections: Section[];
  attainmentConfigId?: string;
}

export interface Section {
  id: string;
  offeringId: string;
  name: string;
  classGroupId: string;
  batches: Batch[];
}

export interface Batch {
  id: string;
  sectionId: string;
  name: string;
  labRoomId: string;
  labWeekday: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  labStartTime: string; // HH:MM (24h)
  durationMin: number; // typically 120 min per BR-15
  studentIds: string[];
}

export interface LabRoom {
  id: string;
  name: string;
  workingSeats: number;
}

export interface SessionPlan {
  id: string;
  batchId: string;
  status: 'draft' | 'approved';
  approvedBy?: string;
  approvedAt?: Date;
  sessions: LabSession[];
}

export interface LabSession {
  id: string;
  planId: string;
  date: string; // YYYY-MM-DD
  periodNo: number;
  topicIds: string[];
  isMakeup: boolean;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  role: string;
  action: 'create' | 'approve' | 'publish' | 'delete' | 'update' | 'tighten';
  objectType: string;
  objectId: string;
  before: any;
  after: any;
  at: Date;
}

export interface EligibilityRule {
  id: string;
  minAttendancePct: number;
  minLabCompletionPct: number;
  scopeType: ScopeType;
  scopeId: string;
}
