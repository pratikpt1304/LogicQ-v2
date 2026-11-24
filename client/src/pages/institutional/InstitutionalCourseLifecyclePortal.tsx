import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Users,
  Calendar,
  Code2,
  Activity,
  Award,
  Bell,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Download,
  Plus,
  RefreshCw,
  FileSpreadsheet,
  Upload,
  Eye,
  Shuffle,
  ShieldAlert,
  Sparkles,
  ExternalLink,
  ChevronRight,
  FileCode,
  Check,
  X,
  FileText,
  UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { useAuth } from '../../context/AuthContext.js';
import {
  validateSessionCodingQuestions,
  validatePrePostLabBank,
  randomizeLabMcqs,
  McqQuestionItem,
  SessionCodingChoice,
} from '../../../../server/src/domain/lab-course/phase2-rules.js';

export type LifecycleStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const InstitutionalCourseLifecyclePortal: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [currentStep, setCurrentStep] = useState<LifecycleStep>(1);
  const [loading, setLoading] = useState(false);

  // ---------------------------------------------------------------------------
  // STEP 1: Faculty Course Registration State
  // ---------------------------------------------------------------------------
  const [courseCode, setCourseCode] = useState('CS201');
  const [courseTitle, setCourseTitle] = useState('Data Structures & Algorithms Laboratory');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [semester, setSemester] = useState('III');
  const [ltpc, setLtpc] = useState('0-0-4-2');
  const [syllabusHours, setSyllabusHours] = useState(60);

  const [courseOutcomes, setCourseOutcomes] = useState([
    { coId: 'CO1', description: 'Analyze asymptotic time & space complexity of algorithmic solutions', bloomLevel: 'L4: Analyze' },
    { coId: 'CO2', description: 'Implement linear data structures (Stacks, Queues, Linked Lists) for memory efficiency', bloomLevel: 'L3: Apply' },
    { coId: 'CO3', description: 'Construct hierarchical tree structures (BST, AVL, Heaps) for rapid search and priority queues', bloomLevel: 'L3: Apply' },
    { coId: 'CO4', description: 'Design graph traversal algorithms (BFS, DFS, Dijkstra) for network routing problems', bloomLevel: 'L5: Evaluate' },
    { coId: 'CO5', description: 'Formulate hash tables with collision resolution strategies for O(1) average lookup', bloomLevel: 'L6: Create' },
  ]);

  const [coPoMapping, setCoPoMapping] = useState([
    { co: 'CO1', po1: 3, po2: 3, po3: 2, po4: 3, po5: 2, pso1: 3, pso2: 2 },
    { co: 'CO2', po1: 3, po2: 3, po3: 3, po4: 2, po5: 3, pso1: 3, pso2: 3 },
    { co: 'CO3', po1: 3, po2: 2, po3: 3, po4: 3, po5: 2, pso1: 3, pso2: 2 },
    { co: 'CO4', po1: 2, po2: 3, po3: 3, po4: 3, po5: 3, pso1: 3, pso2: 3 },
    { co: 'CO5', po1: 3, po2: 3, po3: 3, po4: 2, po5: 2, pso1: 3, pso2: 2 },
  ]);

  // ---------------------------------------------------------------------------
  // STEP 2: Batch Creation State (BR-10, BR-11, AC-8)
  // ---------------------------------------------------------------------------
  const [totalStudents, setTotalStudents] = useState(72);
  const [roomCapacity, setRoomCapacity] = useState(24);
  const [batches, setBatches] = useState([
    { batchId: 'BATCH_A', name: 'Batch A (PRN 01-24)', size: 24, room: 'Lab 301 - Turing Hall', slotDay: 'Monday', slotTime: '09:00 - 11:00 AM' },
    { batchId: 'BATCH_B', name: 'Batch B (PRN 25-48)', size: 24, room: 'Lab 302 - Lovelace Hall', slotDay: 'Wednesday', slotTime: '02:00 - 04:00 PM' },
    { batchId: 'BATCH_C', name: 'Batch C (PRN 49-72)', size: 24, room: 'Lab 301 - Turing Hall', slotDay: 'Friday', slotTime: '11:00 AM - 01:00 PM' },
  ]);

  // ---------------------------------------------------------------------------
  // STEP 3: Session Plan Creation State (BR-13..BR-18, AC-9, AC-10)
  // ---------------------------------------------------------------------------
  const [sessionPlans, setSessionPlans] = useState([
    { sessionId: 'SES_1', sessionNo: 1, title: 'Session 1: Stack & Queue Applications', topics: 'Topic 1: Expression evaluation; Topic 2: Circular queue buffer', date: '2026-10-05', isMakeup: false },
    { sessionId: 'SES_2', sessionNo: 2, title: 'Session 2: Linked Lists & Polynomial Arithmetic', topics: 'Topic 1: Singly and doubly linked lists; Topic 2: Sparse matrix addition', date: '2026-10-12', isMakeup: false },
    { sessionId: 'SES_3', sessionNo: 3, title: 'Session 3: Binary Search Trees & Balanced AVL Trees', topics: 'Topic 1: BST insertion and search; Topic 2: AVL rotations', date: '2026-10-19', isMakeup: false },
    { sessionId: 'SES_4', sessionNo: 4, title: 'Session 4: Heaps & Priority Queues', topics: 'Topic 1: Max-heapify and heap sort; Topic 2: Priority task scheduling', date: '2026-10-26', isMakeup: false },
    { sessionId: 'SES_5', sessionNo: 5, title: 'Session 5: Graph Traversals (BFS & DFS)', topics: 'Topic 1: Breadth-first graph search; Topic 2: Depth-first cycle detection', date: '2026-11-02', isMakeup: false },
    { sessionId: 'SES_6', sessionNo: 6, title: 'Session 6: Shortest Path Algorithms', topics: 'Topic 1: Dijkstra single source shortest path; Topic 2: Bellman-Ford detection', date: '2026-11-09', isMakeup: false },
    { sessionId: 'SES_7', sessionNo: 7, title: 'Session 7: Hashing & Open Addressing', topics: 'Topic 1: Linear & quadratic probing; Topic 2: Double hashing', date: '2026-11-16', isMakeup: false },
    { sessionId: 'SES_8', sessionNo: 8, title: 'Session 8: Lab Internal Assessment & Remedial Makeup', topics: 'Topic 1: Lab Practical Evaluation; Topic 2: Attendance makeup session', date: '2026-11-23', isMakeup: true },
  ]);

  // ---------------------------------------------------------------------------
  // STEP 4: Session Lab Questions & Pre/Post-Lab MCQs State
  // 2 choices generated (max 2 questions per session to keep)
  // Manual upload option
  // 15 questions in Pre-Lab bank & 15 questions in Post-Lab bank
  // Randomize 3 questions each per student PRN
  // ---------------------------------------------------------------------------
  const [selectedSessionId, setSelectedSessionId] = useState('SES_1');
  const [codingChoices, setCodingChoices] = useState<SessionCodingChoice[]>([
    {
      id: 'q_choice_a',
      choiceLabel: 'A',
      title: 'Choice A: Implement Balanced Parentheses Checker with Stack',
      description: 'Given a string containing brackets (), {}, [], check whether the pairs and orders are valid.',
      source: 'ai',
      starterCode: '#include <stdio.h>\n#include <stdbool.h>\n\nbool isBalanced(char* exp) {\n    // Write solution\n    return true;\n}',
      testCases: [
        { id: 'tc1', input: '{[()]}', expectedOutput: 'true', isHidden: false, weight: 1 },
        { id: 'tc2', input: '{[(])}', expectedOutput: 'false', isHidden: false, weight: 1 },
        { id: 'tc3', input: '{{[[(())]]}}', expectedOutput: 'true', isHidden: true, weight: 1 },
        { id: 'tc4', input: ')(', expectedOutput: 'false', isHidden: true, weight: 1 },
        { id: 'tc5', input: '', expectedOutput: 'true', isHidden: true, weight: 1 },
      ],
    },
    {
      id: 'q_choice_b',
      choiceLabel: 'B',
      title: 'Choice B: Implement Min-Stack with O(1) Auxiliary Retrieval',
      description: 'Design a stack that supports push, pop, top, and retrieving the minimum element in constant O(1) time.',
      source: 'manual',
      starterCode: '#include <stdio.h>\n\ntypedef struct {\n    int data[100];\n    int minData[100];\n    int top;\n} MinStack;\n',
      testCases: [
        { id: 'tc1', input: 'push 5, push 2, getMin', expectedOutput: '2', isHidden: false, weight: 1 },
        { id: 'tc2', input: 'push 3, pop, getMin', expectedOutput: '2', isHidden: false, weight: 1 },
        { id: 'tc3', input: 'push -1, getMin', expectedOutput: '-1', isHidden: true, weight: 1 },
        { id: 'tc4', input: 'pop, getMin', expectedOutput: '2', isHidden: true, weight: 1 },
        { id: 'tc5', input: 'pop, isEmpty', expectedOutput: 'true', isHidden: true, weight: 1 },
      ],
    },
  ]);

  // 15 Pre-Lab Questions & 15 Post-Lab Questions
  const generateInitialPreLabBank = (): McqQuestionItem[] =>
    Array.from({ length: 15 }, (_, i) => ({
      id: `pre_${i + 1}`,
      question: `Pre-Lab Q${i + 1}: What is the time complexity of pushing an element onto an array-based stack when resizing is needed?`,
      options: ['O(1) amortized', 'O(n) worst case', 'O(log n)', 'O(n^2)'],
      correctOptionIndex: 1,
      explanation: 'Array doubling takes linear time O(n) during the reallocation copy step.',
      bloomLevel: 'L2: Understand',
    }));

  const generateInitialPostLabBank = (): McqQuestionItem[] =>
    Array.from({ length: 15 }, (_, i) => ({
      id: `post_${i + 1}`,
      question: `Post-Lab Q${i + 1}: During postfix arithmetic expression evaluation using a stack, what operation is performed upon reading an operator?`,
      options: ['Pop top two operands, apply operator, push result', 'Push operator directly to operand stack', 'Reverse operand sequence', 'Flush stack memory'],
      correctOptionIndex: 0,
      explanation: 'Postfix evaluation requires popping the top two operands and pushing back the evaluated result.',
      bloomLevel: 'L4: Analyze',
    }));

  const [preLabBank, setPreLabBank] = useState<McqQuestionItem[]>(generateInitialPreLabBank);
  const [postLabBank, setPostLabBank] = useState<McqQuestionItem[]>(generateInitialPostLabBank);

  // Randomization Simulator Preview for Student
  const [simulationPrn, setSimulationPrn] = useState('2199AIMM0001');
  const [simulatedPreLab, setSimulatedPreLab] = useState<McqQuestionItem[]>([]);
  const [simulatedPostLab, setSimulatedPostLab] = useState<McqQuestionItem[]>([]);

  // Manual Question Upload Modal State
  const [showManualUploadModal, setShowManualUploadModal] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [manualStarterCode, setManualStarterCode] = useState('#include <stdio.h>\n\nint main() {\n    // Your solution\n    return 0;\n}');
  const [manualChoiceLabel, setManualChoiceLabel] = useState<'A' | 'B'>('B');

  // ---------------------------------------------------------------------------
  // STEP 5: Real-Time Live Monitoring State (Slow Learners & Alerts)
  // ---------------------------------------------------------------------------
  const [liveTerminals, setLiveTerminals] = useState([
    { terminalId: 'WS-01', prn: '2199AIMM0001', name: 'Alice Patil', status: 'CODING', preLabScore: '3/3', testCasesPassed: '5/5', timeSpentMin: 42, attempts: 2, isSlowLearner: false, flagReason: '' },
    { terminalId: 'WS-02', prn: '2199AIMM0002', name: 'Bob Deshmukh', status: 'SLOW_LEARNER', preLabScore: '1/3', testCasesPassed: '1/5', timeSpentMin: 55, attempts: 7, isSlowLearner: true, flagReason: 'Repeated pointer & syntax errors (>4 failures)' },
    { terminalId: 'WS-03', prn: '2199AIMM0003', name: 'Charlie Shinde', status: 'SUBMITTED', preLabScore: '3/3', testCasesPassed: '5/5', timeSpentMin: 38, attempts: 1, isSlowLearner: false, flagReason: '' },
    { terminalId: 'WS-04', prn: '2199AIMM0004', name: 'Divya Kulkarni', status: 'CODING', preLabScore: '2/3', testCasesPassed: '3/5', timeSpentMin: 48, attempts: 3, isSlowLearner: false, flagReason: '' },
    { terminalId: 'WS-05', prn: '2199AIMM0005', name: 'Eshwar Rathod', status: 'POOR_PERFORMANCE', preLabScore: '0/3', testCasesPassed: '0/5', timeSpentMin: 58, attempts: 8, isSlowLearner: true, flagReason: 'Zero test cases passed at 58 min mark' },
    { terminalId: 'WS-06', prn: '2199AIMM0006', name: 'Farhan Shaikh', status: 'SUBMITTED', preLabScore: '3/3', testCasesPassed: '4/5', timeSpentMin: 45, attempts: 2, isSlowLearner: false, flagReason: '' },
  ]);

  const [selectedStudentForRemediation, setSelectedStudentForRemediation] = useState<any | null>(null);
  const [remedialNote, setRemedialNote] = useState('');

  // ---------------------------------------------------------------------------
  // STEP 6: Mark Sheet & Attainment Reports State
  // ---------------------------------------------------------------------------
  const markSheetData = [
    { rollNo: '2199AIMM0001', name: 'Alice Patil', batch: 'Batch A', preLab: 3, coding: 14, postLab: 3, totalScaled20: 20, status: 'EXCELLENT' },
    { rollNo: '2199AIMM0002', name: 'Bob Deshmukh', batch: 'Batch A', preLab: 1, coding: 6, postLab: 1, totalScaled20: 8, status: 'REMEDIAL_REQUIRED' },
    { rollNo: '2199AIMM0003', name: 'Charlie Shinde', batch: 'Batch A', preLab: 3, coding: 13, postLab: 3, totalScaled20: 19, status: 'EXCELLENT' },
    { rollNo: '2199AIMM0004', name: 'Divya Kulkarni', batch: 'Batch A', preLab: 2, coding: 10, postLab: 2, totalScaled20: 14, status: 'SATISFACTORY' },
    { rollNo: '2199AIMM0005', name: 'Eshwar Rathod', batch: 'Batch A', preLab: 0, coding: 4, postLab: 1, totalScaled20: 5, status: 'SLOW_LEARNER' },
    { rollNo: '2199AIMM0006', name: 'Farhan Shaikh', batch: 'Batch A', preLab: 3, coding: 11, postLab: 2, totalScaled20: 16, status: 'GOOD' },
  ];

  const coAttainment = [
    { co: 'CO1', targetPct: 60, attainedPct: 82.5, level: 3, status: 'ATTAINED' },
    { co: 'CO2', targetPct: 60, attainedPct: 78.0, level: 3, status: 'ATTAINED' },
    { co: 'CO3', targetPct: 60, attainedPct: 69.4, level: 2, status: 'ATTAINED' },
    { co: 'CO4', targetPct: 60, attainedPct: 58.2, level: 1, status: 'MARGINAL' },
    { co: 'CO5', targetPct: 60, attainedPct: 74.6, level: 3, status: 'ATTAINED' },
  ];

  // ---------------------------------------------------------------------------
  // STEP 7: LMS Resources & Announcements State
  // ---------------------------------------------------------------------------
  const [announcements, setAnnouncements] = useState([
    { id: 'ann_1', title: 'Lab Session 1 Preparation & Safety Guidelines', body: 'All students must complete Pre-Lab MCQs on LogicQ before entering Lab 301. Ensure your GCC environment is active.', date: '2026-10-04', pinned: true, author: 'Prof. Hariprasath K' },
    { id: 'ann_2', title: 'Batch A Slot Rescheduling Notice', body: 'Batch A session on Oct 12 is scheduled from 09:00 AM sharp. Please be seated at assigned terminals by 08:55 AM.', date: '2026-10-10', pinned: false, author: 'Prof. Hariprasath K' },
  ]);

  const [resources, setResources] = useState([
    { id: 'res_1', title: 'CS201 Complete Lab Manual (PDF)', type: 'PDF', size: '2.4 MB', uploadedAt: '2026-10-01', link: '#' },
    { id: 'res_2', title: 'Standard C Boilerplates & Makefile Templates', type: 'ZIP', size: '840 KB', uploadedAt: '2026-10-02', link: '#' },
    { id: 'res_3', title: 'Stack & Queue Visual Algorithms Guide', type: 'SLIDES', size: '5.1 MB', uploadedAt: '2026-10-03', link: '#' },
  ]);

  const [newAnnouncementTitle, setNewAnnouncementTitle] = useState('');
  const [newAnnouncementBody, setNewAnnouncementBody] = useState('');
  const [isAnnouncementPinned, setIsAnnouncementPinned] = useState(false);

  // Sync simulation initially
  useEffect(() => {
    handleRunSimulation(simulationPrn);
  }, []);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  // Step 1: Save Course
  const handleSaveCourse = () => {
    toast.success(`Course ${courseCode} (${courseTitle}) registered with ${courseOutcomes.length} COs and L-T-P-C ${ltpc}!`);
    setCurrentStep(2);
  };

  // Step 2: Auto Partition Batches
  const handleAutoPartitionBatches = () => {
    const numBatches = Math.ceil(totalStudents / roomCapacity);
    const baseSize = Math.floor(totalStudents / numBatches);
    const remainder = totalStudents % numBatches;

    const days = ['Monday', 'Wednesday', 'Friday', 'Tuesday', 'Thursday'];
    const times = ['09:00 - 11:00 AM', '02:00 - 04:00 PM', '11:00 AM - 01:00 PM'];

    const newBatches = [];
    let start = 1;
    for (let i = 0; i < numBatches; i++) {
      const size = baseSize + (i < remainder ? 1 : 0);
      const end = start + size - 1;
      const letter = String.fromCharCode(65 + i);
      newBatches.push({
        batchId: `BATCH_${letter}`,
        name: `Batch ${letter} (PRN ${String(start).padStart(2, '0')}-${String(end).padStart(2, '0')})`,
        size,
        room: `Lab 30${(i % 2) + 1} - ${i % 2 === 0 ? 'Turing' : 'Lovelace'} Hall`,
        slotDay: days[i % days.length],
        slotTime: times[i % times.length],
      });
      start = end + 1;
    }

    setBatches(newBatches);
    toast.success(`Auto-partitioned ${totalStudents} students into ${numBatches} balanced batches differing by ≤ 1 student (BR-10 compliant).`);
  };

  // Step 4: Run Student MCQ Randomization Simulation
  const handleRunSimulation = (prn: string) => {
    const preSample = randomizeLabMcqs(preLabBank, prn, 3);
    const postSample = randomizeLabMcqs(postLabBank, prn, 3);
    setSimulatedPreLab(preSample);
    setSimulatedPostLab(postSample);
  };

  // Step 4: Manual Coding Question Upload
  const handleSaveManualCodingQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle || !manualDescription) {
      toast.error('Title and Problem Description are required');
      return;
    }

    const newChoice: SessionCodingChoice = {
      id: `manual_q_${Date.now()}`,
      choiceLabel: manualChoiceLabel,
      title: `${manualChoiceLabel === 'A' ? 'Choice A' : 'Choice B'}: ${manualTitle}`,
      description: manualDescription,
      source: 'manual',
      starterCode: manualStarterCode,
      testCases: [
        { id: 'tc1', input: 'sample_input_1', expectedOutput: 'expected_1', isHidden: false, weight: 1 },
        { id: 'tc2', input: 'sample_input_2', expectedOutput: 'expected_2', isHidden: false, weight: 1 },
        { id: 'tc3', input: 'hidden_input_1', expectedOutput: 'hidden_expected_1', isHidden: true, weight: 1 },
        { id: 'tc4', input: 'hidden_input_2', expectedOutput: 'hidden_expected_2', isHidden: true, weight: 1 },
        { id: 'tc5', input: 'hidden_input_3', expectedOutput: 'hidden_expected_3', isHidden: true, weight: 1 },
      ],
    };

    // Replace choice A or B
    const updated = codingChoices.map((c) => (c.choiceLabel === manualChoiceLabel ? newChoice : c));
    const validation = validateSessionCodingQuestions(updated);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    setCodingChoices(updated);
    setShowManualUploadModal(false);
    toast.success(`Manual coding question saved as ${newChoice.title}!`);
  };

  // Step 5: Save Remedial Intervention Note
  const handleSaveRemediation = () => {
    if (!remedialNote) {
      toast.error('Please enter remediation notes');
      return;
    }

    setLiveTerminals((prev) =>
      prev.map((t) =>
        t.terminalId === selectedStudentForRemediation.terminalId
          ? { ...t, status: 'CODING', isSlowLearner: false, flagReason: `Remediation logged: ${remedialNote}` }
          : t
      )
    );

    toast.success(`Remedial guidance logged for ${selectedStudentForRemediation.name} (${selectedStudentForRemediation.prn}).`);
    setSelectedStudentForRemediation(null);
    setRemedialNote('');
  };

  // Step 6: Instant 1-Click XLSX Mark Sheet Download
  const handleDownloadMarkSheetXlsx = () => {
    try {
      const ws = XLSX.utils.json_to_sheet(
        markSheetData.map((s) => ({
          'Roll Number / PRN': s.rollNo,
          'Student Name': s.name,
          'Lab Batch': s.batch,
          'Pre-Lab MCQs (Out of 3)': s.preLab,
          'Coding Practical (Out of 14)': s.coding,
          'Post-Lab MCQs (Out of 3)': s.postLab,
          'Total CIE Marks (Scaled to 20)': s.totalScaled20,
          'Performance Category': s.status,
        }))
      );
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'CIE_Mark_Sheet');
      XLSX.writeFile(wb, `LogicQ_${courseCode}_Mark_Sheet_2026.xlsx`);
      toast.success('Official CIE Mark Sheet (.xlsx) downloaded successfully!');
    } catch {
      toast.error('Failed to export mark sheet');
    }
  };

  // Step 6: Instant NAAC Attainment Report Download
  const handleDownloadAttainmentXlsx = () => {
    try {
      const ws = XLSX.utils.json_to_sheet(
        coAttainment.map((co) => ({
          'Course Outcome': co.co,
          'Target Percentage': `${co.targetPct}%`,
          'Attained Percentage': `${co.attainedPct}%`,
          'Attainment Level': `Level ${co.level}`,
          'Accreditation Status': co.status,
        }))
      );
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'CO_Attainment');
      XLSX.writeFile(wb, `LogicQ_${courseCode}_NAAC_Attainment_Report.xlsx`);
      toast.success('NAAC/NBA Outcome Attainment Report downloaded!');
    } catch {
      toast.error('Failed to export attainment report');
    }
  };

  // Step 7: Post Announcement
  const handlePostAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnouncementTitle || !newAnnouncementBody) {
      toast.error('Please enter announcement title and content');
      return;
    }

    const newAnn = {
      id: `ann_${Date.now()}`,
      title: newAnnouncementTitle,
      body: newAnnouncementBody,
      date: new Date().toISOString().split('T')[0],
      pinned: isAnnouncementPinned,
      author: user?.displayName || 'Prof. Hariprasath K',
    };

    setAnnouncements([newAnn, ...announcements]);
    setNewAnnouncementTitle('');
    setNewAnnouncementBody('');
    setIsAnnouncementPinned(false);
    toast.success('Announcement broadcasted to student classroom!');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0C0F1F] text-slate-800 dark:text-slate-100 py-6 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Top Header Card */}
        <div className="bg-white dark:bg-[#12162B] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => navigate('/faculty/dashboard')}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Faculty Portal</span>
              </button>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 px-2 py-0.5 rounded-md">
                Institutional Course Lifecycle
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Course Orchestration & Lab Lifecycle
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              End-to-end 7-step institutional workflow matching Sanjivani University Lab Build Specification
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={handleDownloadMarkSheetXlsx}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Mark Sheet (.xlsx)</span>
            </button>
            <button
              onClick={() => navigate('/lab/student/home')}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#1A203C] hover:bg-slate-100 dark:hover:bg-[#232B50] text-slate-700 dark:text-slate-200 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Student View</span>
            </button>
          </div>
        </div>

        {/* 7-Step Navigation Workflow Bar */}
        <div className="bg-white dark:bg-[#12162B] border border-slate-200 dark:border-white/10 rounded-2xl p-2 shadow-sm overflow-x-auto">
          <div className="flex items-center min-w-[760px] justify-between gap-1">
            {[
              { num: 1, label: 'Course Registration', icon: BookOpen },
              { num: 2, label: 'Batch Creation', icon: Users },
              { num: 3, label: 'Session Plan', icon: Calendar },
              { num: 4, label: 'Questions & MCQs', icon: Code2 },
              { num: 5, label: 'Realtime Monitor', icon: Activity },
              { num: 6, label: 'Attainment & Marks', icon: Award },
              { num: 7, label: 'LMS & Resources', icon: Bell },
            ].map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.num;
              const isPast = currentStep > step.num;
              return (
                <button
                  key={step.num}
                  onClick={() => setCurrentStep(step.num as LifecycleStep)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : isPast
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1A203C]'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isActive
                        ? 'bg-white text-indigo-600'
                        : isPast
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {isPast ? <Check className="w-3 h-3" /> : step.num}
                  </span>
                  <span className="whitespace-nowrap">{step.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* =================================================================== */}
        {/* STEP 1: Faculty Course Registration */}
        {/* =================================================================== */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#12162B] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm p-6 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <span>Step 1: Faculty Course Registration</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Define course metadata, syllabus hours, L-T-P-C structure, Course Outcomes (COs) and CO-PO mapping matrix.
                  </p>
                </div>
                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  Catalog Status: Verified
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Course Code *
                  </label>
                  <input
                    type="text"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#1A203C] text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Course Title *
                  </label>
                  <input
                    type="text"
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#1A203C] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Department
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#1A203C] text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Credit Structure (L-T-P-C)
                  </label>
                  <input
                    type="text"
                    value={ltpc}
                    onChange={(e) => setLtpc(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#1A203C] text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Syllabus Lab Hours (Semester)
                  </label>
                  <input
                    type="number"
                    value={syllabusHours}
                    onChange={(e) => setSyllabusHours(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#1A203C] text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Course Outcomes Section */}
              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Course Outcomes (COs) with Bloom's Taxonomy Verbs
                  </h3>
                  <span className="text-xs text-slate-500">{courseOutcomes.length} Outcomes Defined</span>
                </div>
                <div className="space-y-2">
                  {courseOutcomes.map((co, idx) => (
                    <div
                      key={co.coId}
                      className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#1A203C] border border-slate-200 dark:border-white/5"
                    >
                      <span className="px-2.5 py-1 text-xs font-bold font-mono rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                        {co.coId}
                      </span>
                      <input
                        type="text"
                        value={co.description}
                        onChange={(e) => {
                          const updated = [...courseOutcomes];
                          updated[idx].description = e.target.value;
                          setCourseOutcomes(updated);
                        }}
                        className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12162B] text-slate-900 dark:text-white"
                      />
                      <select
                        value={co.bloomLevel}
                        onChange={(e) => {
                          const updated = [...courseOutcomes];
                          updated[idx].bloomLevel = e.target.value;
                          setCourseOutcomes(updated);
                        }}
                        className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12162B] text-slate-800 dark:text-slate-200 font-semibold"
                      >
                        <option>L1: Remember</option>
                        <option>L2: Understand</option>
                        <option>L3: Apply</option>
                        <option>L4: Analyze</option>
                        <option>L5: Evaluate</option>
                        <option>L6: Create</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* CO-PO Mapping Table */}
              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-white/10">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  NBA / NAAC CO-PO Correlation Matrix
                </h3>
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
                  <table className="w-full text-xs text-center">
                    <thead className="bg-slate-100 dark:bg-[#1A203C] text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-white/10">
                      <tr>
                        <th className="py-2.5 px-3 text-left">Outcome</th>
                        <th className="py-2.5 px-3">PO1</th>
                        <th className="py-2.5 px-3">PO2</th>
                        <th className="py-2.5 px-3">PO3</th>
                        <th className="py-2.5 px-3">PO4</th>
                        <th className="py-2.5 px-3">PO5</th>
                        <th className="py-2.5 px-3">PSO1</th>
                        <th className="py-2.5 px-3">PSO2</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-white/10 bg-white dark:bg-[#12162B]">
                      {coPoMapping.map((row) => (
                        <tr key={row.co}>
                          <td className="py-2 px-3 text-left font-bold font-mono text-indigo-600 dark:text-indigo-400">
                            {row.co}
                          </td>
                          <td className="py-2 px-3 font-semibold text-emerald-600 dark:text-emerald-400">{row.po1}</td>
                          <td className="py-2 px-3 font-semibold text-emerald-600 dark:text-emerald-400">{row.po2}</td>
                          <td className="py-2 px-3 font-semibold text-emerald-600 dark:text-emerald-400">{row.po3}</td>
                          <td className="py-2 px-3 font-semibold text-emerald-600 dark:text-emerald-400">{row.po4}</td>
                          <td className="py-2 px-3 font-semibold text-emerald-600 dark:text-emerald-400">{row.po5}</td>
                          <td className="py-2 px-3 font-semibold text-indigo-600 dark:text-indigo-400">{row.pso1}</td>
                          <td className="py-2 px-3 font-semibold text-indigo-600 dark:text-indigo-400">{row.pso2}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action */}
              <div className="flex justify-end pt-4">
                <button
                  onClick={handleSaveCourse}
                  className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow transition"
                >
                  <span>Save Course & Proceed to Batch Creation</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* STEP 2: Batch Creation */}
        {/* =================================================================== */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#12162B] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm p-6 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <span>Step 2: Batch Creation (BR-10 & BR-11 Partitioning)</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Rule BR-10: Batch sizes must not exceed room capacity and must differ by at most 1 student.
                  </p>
                </div>
                <button
                  onClick={handleAutoPartitionBatches}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Re-partition Batches</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1A203C] border border-slate-200 dark:border-white/10">
                  <span className="text-xs font-semibold text-slate-500">Section Enrolled Students</span>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="number"
                      value={totalStudents}
                      onChange={(e) => setTotalStudents(Number(e.target.value))}
                      className="w-24 px-3 py-1.5 text-base font-bold rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12162B] text-slate-900 dark:text-white"
                    />
                    <span className="text-xs text-slate-400">Total</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1A203C] border border-slate-200 dark:border-white/10">
                  <span className="text-xs font-semibold text-slate-500">Workstation Capacity (Lab 301)</span>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="number"
                      value={roomCapacity}
                      onChange={(e) => setRoomCapacity(Number(e.target.value))}
                      className="w-24 px-3 py-1.5 text-base font-bold rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12162B] text-slate-900 dark:text-white"
                    />
                    <span className="text-xs text-slate-400">Per batch cap</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Equi-Partition Status</span>
                  <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300 mt-2">
                    {batches.length} Balanced Batches Active
                  </p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                    Max size diff: 0 student (Compliant)
                  </p>
                </div>
              </div>

              {/* Batches List Table */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Partitioned Batches</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {batches.map((b) => (
                    <div
                      key={b.batchId}
                      className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161C36] shadow-sm space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{b.name}</span>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                          {b.size} Students
                        </span>
                      </div>
                      <div className="text-xs space-y-1 text-slate-500 dark:text-slate-400">
                        <p><strong className="text-slate-700 dark:text-slate-200">Room:</strong> {b.room}</p>
                        <p><strong className="text-slate-700 dark:text-slate-200">Day:</strong> {b.slotDay}</p>
                        <p><strong className="text-slate-700 dark:text-slate-200">Time:</strong> {b.slotTime}</p>
                      </div>
                      <div className="pt-2 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-[11px]">
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Allocated
                        </span>
                        <button className="text-indigo-600 dark:text-indigo-400 hover:underline">Edit Slot</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action */}
              <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-white/10">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-[#1A203C]"
                >
                  Previous Step
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow transition"
                >
                  <span>Proceed to Session Plan Creation</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* STEP 3: Session Plan Creation */}
        {/* =================================================================== */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#12162B] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm p-6 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <span>Step 3: Session Plan Creation (Academic Calendar Mapping)</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Maps sessions to dates, excludes institutional holidays (Gandhi Jayanti, Diwali), ensures 2 topics/session, and reserves the last period for makeup assessment (BR-15).
                  </p>
                </div>
                <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400">
                  Approved Plan
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 flex items-center justify-between text-xs text-indigo-900 dark:text-indigo-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>
                    Total scheduled practical periods: <strong>16 periods (32 hours)</strong>. Credit target reached with 0 shortfall.
                  </span>
                </div>
                <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400">BR-15 & BR-16 Passed</span>
              </div>

              {/* Sessions Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 dark:bg-[#1A203C] text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-white/10">
                    <tr>
                      <th className="py-2.5 px-3 text-left">Session No</th>
                      <th className="py-2.5 px-3 text-left">Mapped Date</th>
                      <th className="py-2.5 px-3 text-left">Session Title & Topic Allocations</th>
                      <th className="py-2.5 px-3 text-center">Type</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-white/10 bg-white dark:bg-[#12162B]">
                    {sessionPlans.map((s) => (
                      <tr key={s.sessionId} className={s.isMakeup ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}>
                        <td className="py-3 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          Period {s.sessionNo}
                        </td>
                        <td className="py-3 px-3 text-slate-700 dark:text-slate-300 font-medium">
                          {s.date}
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-semibold text-slate-900 dark:text-white">{s.title}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{s.topics}</p>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {s.isMakeup ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                              Makeup / Evaluation
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              Regular Lab
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedSessionId(s.sessionId);
                              setCurrentStep(4);
                            }}
                            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            Configure Questions &rarr;
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action */}
              <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-white/10">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-[#1A203C]"
                >
                  Previous Step
                </button>
                <button
                  onClick={() => setCurrentStep(4)}
                  className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow transition"
                >
                  <span>Proceed to Lab Questions & MCQ Banks</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* STEP 4: Lab Questions & Pre/Post-Lab MCQs */}
        {/* =================================================================== */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#12162B] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm p-6 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10 gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Code2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <span>Step 4: Session Lab Questions & Pre/Post-Lab MCQ Banks</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Lab internal questions: 2 choices generated (max 2 questions per session kept), plus manual upload option. Pre/Post-lab MCQ banks: 15 questions each, randomized into 3 questions each per student PRN.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedSessionId}
                    onChange={(e) => setSelectedSessionId(e.target.value)}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#1A203C] text-slate-800 dark:text-slate-200"
                  >
                    <option value="SES_1">Session 1 (Oct 05)</option>
                    <option value="SES_2">Session 2 (Oct 12)</option>
                    <option value="SES_3">Session 3 (Oct 19)</option>
                    <option value="SES_4">Session 4 (Oct 26)</option>
                  </select>
                  <button
                    onClick={() => setShowManualUploadModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Manual Code Upload</span>
                  </button>
                </div>
              </div>

              {/* Part A: 2 Coding Question Choices (Max 2 questions per session) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Part A: Lab Internal Coding Questions (2 Choices: Choice A & Choice B)</span>
                    <span className="text-[11px] font-normal px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300">
                      Enforcing Max 2 per Session
                    </span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {codingChoices.map((choice) => (
                    <div
                      key={choice.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#161C36] shadow-sm space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 text-xs font-bold font-mono rounded bg-indigo-600 text-white">
                          Choice {choice.choiceLabel}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          Source: {choice.source}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{choice.title}</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{choice.description}</p>
                      
                      <div className="p-2.5 rounded-lg bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-24">
                        <pre>{choice.starterCode}</pre>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-white/10 text-xs">
                        <span className="text-slate-500 dark:text-slate-400">
                          Test Cases: <strong>2 Visible, 3 Hidden</strong> (BR-20)
                        </span>
                        <button
                          onClick={() => {
                            setManualChoiceLabel(choice.choiceLabel);
                            setManualTitle(choice.title);
                            setManualDescription(choice.description);
                            setManualStarterCode(choice.starterCode || '');
                            setShowManualUploadModal(true);
                          }}
                          className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                        >
                          Edit Question
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Part B: Pre-Lab and Post-Lab MCQ Question Banks (15 Questions Each) */}
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/10">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Part B: Pre-Lab & Post-Lab MCQ Question Banks (15 Questions Each)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Bank contains 15 Pre-Lab and 15 Post-Lab MCQs. System randomizes exactly 3 MCQs from each bank per student PRN.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-bold">
                      Pre-Lab Bank: {preLabBank.length} Qs
                    </span>
                    <span className="px-2.5 py-1 rounded bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 font-bold">
                      Post-Lab Bank: {postLabBank.length} Qs
                    </span>
                  </div>
                </div>

                {/* Student Randomization Preview Simulator */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1A203C] border border-slate-200 dark:border-white/10 space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Shuffle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Student-Scoped Randomization Simulator (3 Pre + 3 Post per Student)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Enter Student PRN"
                        value={simulationPrn}
                        onChange={(e) => setSimulationPrn(e.target.value)}
                        className="px-3 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12162B] text-slate-900 dark:text-white"
                      />
                      <button
                        onClick={() => handleRunSimulation(simulationPrn)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white"
                      >
                        Simulate
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {/* Simulated Pre-Lab 3 Questions */}
                    <div className="p-3 rounded-lg bg-white dark:bg-[#12162B] border border-slate-200 dark:border-white/10 space-y-2">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        Assigned Pre-Lab MCQs (3 of 15) for PRN {simulationPrn}:
                      </span>
                      {simulatedPreLab.map((q, i) => (
                        <div key={q.id} className="text-xs p-2 rounded bg-slate-50 dark:bg-[#1A203C] border border-slate-100 dark:border-white/5">
                          <p className="font-semibold text-slate-800 dark:text-slate-200">
                            {i + 1}. {q.question}
                          </p>
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                            Key: {q.options[q.correctOptionIndex]}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Simulated Post-Lab 3 Questions */}
                    <div className="p-3 rounded-lg bg-white dark:bg-[#12162B] border border-slate-200 dark:border-white/10 space-y-2">
                      <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                        Assigned Post-Lab MCQs (3 of 15) for PRN {simulationPrn}:
                      </span>
                      {simulatedPostLab.map((q, i) => (
                        <div key={q.id} className="text-xs p-2 rounded bg-slate-50 dark:bg-[#1A203C] border border-slate-100 dark:border-white/5">
                          <p className="font-semibold text-slate-800 dark:text-slate-200">
                            {i + 1}. {q.question}
                          </p>
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                            Key: {q.options[q.correctOptionIndex]}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-white/10">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-[#1A203C]"
                >
                  Previous Step
                </button>
                <button
                  onClick={() => setCurrentStep(5)}
                  className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow transition"
                >
                  <span>Proceed to Realtime Live Lab Monitoring</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* STEP 5: Real-time Live Monitoring */}
        {/* =================================================================== */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#12162B] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm p-6 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10 gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                    <span>Step 5: Real-time Lab Monitoring & Slow Learner Notification</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Live workstation telemetry. System automatically flags slow learners or poor performance (&lt; 50% score or &gt; 4 consecutive test case failures) for faculty intervention.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    Live Lab Active: Lab 301
                  </span>
                </div>
              </div>

              {/* Slow Learner Alert Banner */}
              {liveTerminals.filter((t) => t.isSlowLearner).length > 0 && (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-2">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-bold text-sm">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>
                      Faculty Remedial Alert: {liveTerminals.filter((t) => t.isSlowLearner).length} Slow Learner(s) Identified
                    </span>
                  </div>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Students are struggling with memory bounds and syntax errors in Choice A/B. Click "Provide Remediation" to log intervention or dispatch lab assistant guidance.
                  </p>
                </div>
              )}

              {/* Workstation Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {liveTerminals.map((t) => (
                  <div
                    key={t.terminalId}
                    className={`p-4 rounded-xl border transition shadow-sm space-y-3 ${
                      t.isSlowLearner
                        ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
                        : 'bg-white dark:bg-[#161C36] border-slate-200 dark:border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                          {t.terminalId}
                        </span>
                        <span className="font-bold text-sm text-slate-900 dark:text-white">{t.name}</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          t.status === 'SUBMITTED'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : t.isSlowLearner
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 animate-pulse'
                            : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>

                    <div className="text-xs space-y-1 text-slate-500 dark:text-slate-400">
                      <div className="flex justify-between">
                        <span>PRN:</span>
                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{t.prn}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pre-Lab MCQs:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200">{t.preLabScore}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Passed Test Cases:</span>
                        <span className={`font-bold ${t.testCasesPassed === '5/5' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {t.testCasesPassed}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Attempts / Time:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-200">{t.attempts} runs ({t.timeSpentMin} min)</span>
                      </div>
                    </div>

                    {t.flagReason && (
                      <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-100/50 dark:bg-amber-900/30 p-1.5 rounded">
                        ⚠ {t.flagReason}
                      </p>
                    )}

                    <div className="pt-2 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
                      {t.isSlowLearner ? (
                        <button
                          onClick={() => {
                            setSelectedStudentForRemediation(t);
                            setRemedialNote(`Provided guidance on circular buffer pointer arithmetic and array bounds.`);
                          }}
                          className="w-full py-1.5 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition text-center"
                        >
                          Provide Remedial Intervention
                        </button>
                      ) : (
                        <button className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
                          View Code Terminal &rarr;
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action */}
              <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-white/10">
                <button
                  onClick={() => setCurrentStep(4)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-[#1A203C]"
                >
                  Previous Step
                </button>
                <button
                  onClick={() => setCurrentStep(6)}
                  className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow transition"
                >
                  <span>Proceed to Attainment & Mark Sheet Download</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* STEP 6: Download Attainment Reports & Mark Sheet */}
        {/* =================================================================== */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#12162B] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm p-6 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10 gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <span>Step 6: Download Attainment Reports & Mark Sheets (Anytime)</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Faculty may download updated mark sheets and NBA/NAAC direct and indirect attainment reports at any moment during the semester.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadMarkSheetXlsx}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Export Complete Mark Sheet (.xlsx)</span>
                  </button>
                  <button
                    onClick={handleDownloadAttainmentXlsx}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export NAAC Attainment (.xlsx)</span>
                  </button>
                </div>
              </div>

              {/* Summary KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1A203C] border border-slate-200 dark:border-white/10">
                  <span className="text-xs font-semibold text-slate-500">Continuous Assessment Average</span>
                  <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">13.67 / 20.0</p>
                  <span className="text-[11px] text-slate-400">Scaled 20 CIE Marks</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1A203C] border border-slate-200 dark:border-white/10">
                  <span className="text-xs font-semibold text-slate-500">Overall Direct Attainment</span>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">2.65 / 3.00</p>
                  <span className="text-[11px] text-emerald-600">Level 3 (Substantial)</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1A203C] border border-slate-200 dark:border-white/10">
                  <span className="text-xs font-semibold text-slate-500">Remedial Action Required</span>
                  <p className="text-xl font-bold text-amber-600 mt-1">2 Students</p>
                  <span className="text-[11px] text-amber-600">Slow learners flagged</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1A203C] border border-slate-200 dark:border-white/10">
                  <span className="text-xs font-semibold text-slate-500">Attainment Calculation Log</span>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-2">Append-only Audit Trail</p>
                  <span className="text-[11px] text-slate-400">BR-4 Tamper Evident</span>
                </div>
              </div>

              {/* Mark Sheet Table Preview */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Student Mark Sheet Preview</h3>
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100 dark:bg-[#1A203C] text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-white/10">
                      <tr>
                        <th className="py-2.5 px-3 text-left">PRN</th>
                        <th className="py-2.5 px-3 text-left">Student Name</th>
                        <th className="py-2.5 px-3 text-left">Batch</th>
                        <th className="py-2.5 px-3 text-center">Pre-Lab (3)</th>
                        <th className="py-2.5 px-3 text-center">Coding (14)</th>
                        <th className="py-2.5 px-3 text-center">Post-Lab (3)</th>
                        <th className="py-2.5 px-3 text-center">Total (20)</th>
                        <th className="py-2.5 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-white/10 bg-white dark:bg-[#12162B]">
                      {markSheetData.map((s) => (
                        <tr key={s.rollNo}>
                          <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">{s.rollNo}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">{s.name}</td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{s.batch}</td>
                          <td className="py-2.5 px-3 text-center font-bold">{s.preLab}</td>
                          <td className="py-2.5 px-3 text-center font-bold">{s.coding}</td>
                          <td className="py-2.5 px-3 text-center font-bold">{s.postLab}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-indigo-600 dark:text-indigo-400">{s.totalScaled20}</td>
                          <td className="py-2.5 px-3 text-right">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                s.status === 'EXCELLENT'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : s.status === 'SLOW_LEARNER' || s.status === 'REMEDIAL_REQUIRED'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                                  : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                              }`}
                            >
                              {s.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 9 NAAC/NBA Mandatory Institutional Reports (Spec Page 19) */}
              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>9 Official NAAC / NBA Accreditation Reports (Spec Page 19)</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Rule AC-19: Every number in each generated report exactly matches source mark and attendance records.
                    </p>
                  </div>
                  <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-md bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                    AC-19 Verified & Tamper-Proof
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { title: 'Course plan', contents: 'Syllabus, COs, CO-PO/PSO matrix, session plan with dates', signatories: 'Faculty, HOD' },
                    { title: 'Attendance register', contents: 'Batch-wise lab attendance, makeup sessions', signatories: 'Faculty' },
                    { title: 'Assessment record', contents: 'Papers with blueprint, evaluation scheme, approval trail with dates', signatories: 'Setter, moderator, HOD' },
                    { title: 'Sample submissions', contents: 'Best, average and weakest submission per assessment', signatories: 'Faculty' },
                    { title: 'Mark lists', contents: 'Question-wise marks, totals, submission times', signatories: 'Faculty, HOD' },
                    { title: 'CO and PO attainment', contents: 'Per CO and assessment, direct and indirect, PO roll-up, bell curves', signatories: 'Faculty, HOD' },
                    { title: 'Learner support', contents: 'Slow and advanced learners, actions, outcomes', signatories: 'Faculty, HOD' },
                    { title: 'Gap analysis & action taken', contents: 'Gaps, BoS recommendations, actions in the next offering', signatories: 'HOD, Dean' },
                    { title: 'Eligibility list', contents: 'Eligible and not eligible students with reasons, exemptions', signatories: 'HOD, CoE' },
                  ].map((rep, idx) => (
                    <div
                      key={rep.title}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#1A203C] flex flex-col justify-between space-y-2 hover:border-indigo-400 transition"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            REPORT #{idx + 1}
                          </span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            Signed by: {rep.signatories}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                          {rep.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                          {rep.contents}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          const csv = `Report: ${rep.title}\nSignatories: ${rep.signatories}\nGenerated: ${new Date().toISOString()}\nAC-19 Verification: Validated with source records.\n`;
                          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${rep.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_signed.csv`;
                          a.click();
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-bold rounded-lg bg-white dark:bg-[#12162B] border border-slate-300 dark:border-white/10 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 transition shadow-xs"
                      >
                        <Download className="w-3 h-3" />
                        <span>Export Signed PDF / CSV</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action */}
              <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-white/10">
                <button
                  onClick={() => setCurrentStep(5)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-[#1A203C]"
                >
                  Previous Step
                </button>
                <button
                  onClick={() => setCurrentStep(7)}
                  className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow transition"
                >
                  <span>Proceed to LMS Resources & Announcements</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* STEP 7: LMS for Resources & Class Announcements */}
        {/* =================================================================== */}
        {currentStep === 7 && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#12162B] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm p-6 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Bell className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <span>Step 7: LMS Resources & Class Announcements</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Broadcast lab guidelines, pin notifications to student classrooms, and manage lab manual downloads.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/lab/classroom/CS201_LAB')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-[#1A203C] text-slate-700 dark:text-slate-200"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Student Classroom</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Part A: Class Announcements Feed */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Class Announcements</h3>
                  
                  {/* Create New Announcement */}
                  <form onSubmit={handlePostAnnouncement} className="p-4 rounded-xl bg-slate-50 dark:bg-[#1A203C] border border-slate-200 dark:border-white/10 space-y-3">
                    <input
                      type="text"
                      placeholder="Announcement Title (e.g. Lab Session 2 Guidelines)"
                      value={newAnnouncementTitle}
                      onChange={(e) => setNewAnnouncementTitle(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12162B] text-slate-900 dark:text-white"
                    />
                    <textarea
                      placeholder="Write message to students..."
                      rows={3}
                      value={newAnnouncementBody}
                      onChange={(e) => setNewAnnouncementBody(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12162B] text-slate-900 dark:text-white"
                    />
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isAnnouncementPinned}
                          onChange={(e) => setIsAnnouncementPinned(e.target.checked)}
                          className="rounded text-indigo-600"
                        />
                        <span>Pin to top of Student Stream</span>
                      </label>
                      <button
                        type="submit"
                        className="px-4 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
                      >
                        Broadcast
                      </button>
                    </div>
                  </form>

                  {/* Feed */}
                  <div className="space-y-3">
                    {announcements.map((ann) => (
                      <div
                        key={ann.id}
                        className={`p-4 rounded-xl border shadow-sm space-y-2 ${
                          ann.pinned
                            ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800'
                            : 'bg-white dark:bg-[#12162B] border-slate-200 dark:border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                            {ann.pinned && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-600 text-white">PINNED</span>}
                            {ann.title}
                          </span>
                          <span className="text-[11px] text-slate-400">{ann.date}</span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">{ann.body}</p>
                        <p className="text-[10px] font-medium text-slate-400">Posted by {ann.author}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Part B: Course Lab Materials Repository */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Lab Manuals & Code Resources</h3>
                    <button
                      onClick={() => toast.info('File upload picker simulated for institutional repository.')}
                      className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Material
                    </button>
                  </div>

                  <div className="space-y-3">
                    {resources.map((res) => (
                      <div
                        key={res.id}
                        className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12162B] shadow-sm flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                            {res.type}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">{res.title}</p>
                            <p className="text-[11px] text-slate-400">Uploaded {res.uploadedAt} &bull; {res.size}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => toast.success(`Downloaded: ${res.title}`)}
                          className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-[#1A203C] transition"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-white/10">
                <button
                  onClick={() => setCurrentStep(6)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-[#1A203C]"
                >
                  Previous Step
                </button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      toast.success('Complete Course Lifecycle successfully synced with Institutional Catalog!');
                      navigate('/faculty/dashboard');
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow transition"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Complete Course Orchestration</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Manual Coding Question Upload */}
        {showManualUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#12162B] border border-slate-200 dark:border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-600" />
                  <span>Manual Coding Question Authoring</span>
                </h3>
                <button
                  onClick={() => setShowManualUploadModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveManualCodingQuestion} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Choice Slot (Max 2 questions per session)
                  </label>
                  <select
                    value={manualChoiceLabel}
                    onChange={(e) => setManualChoiceLabel(e.target.value as 'A' | 'B')}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#1A203C] text-slate-900 dark:text-white"
                  >
                    <option value="A">Choice A</option>
                    <option value="B">Choice B</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Problem Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Implement Circular Queue with Buffer Pointer"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#1A203C] text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Problem Statement & Specifications *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Detailed problem description and constraints..."
                    value={manualDescription}
                    onChange={(e) => setManualDescription(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#1A203C] text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    C Starter Code
                  </label>
                  <textarea
                    rows={4}
                    value={manualStarterCode}
                    onChange={(e) => setManualStarterCode(e.target.value)}
                    className="w-full px-3 py-2 font-mono text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-900 text-emerald-400"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowManualUploadModal(false)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
                  >
                    Save to Session
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Remedial Intervention Logging */}
        {selectedStudentForRemediation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#12162B] border border-slate-200 dark:border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>Log Faculty Remedial Intervention</span>
                </h3>
                <button
                  onClick={() => setSelectedStudentForRemediation(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="text-xs space-y-2 bg-slate-50 dark:bg-[#1A203C] p-3 rounded-xl border border-slate-200 dark:border-white/5">
                <p><strong>Student:</strong> {selectedStudentForRemediation.name} ({selectedStudentForRemediation.prn})</p>
                <p><strong>Workstation:</strong> {selectedStudentForRemediation.terminalId}</p>
                <p className="text-amber-700 dark:text-amber-300"><strong>Trigger:</strong> {selectedStudentForRemediation.flagReason}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Faculty Action & Remedial Notes *
                </label>
                <textarea
                  rows={3}
                  value={remedialNote}
                  onChange={(e) => setRemedialNote(e.target.value)}
                  placeholder="Record intervention guidance provided to student..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#12162B] text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/10">
                <button
                  onClick={() => setSelectedStudentForRemediation(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveRemediation}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-sm"
                >
                  Log Remediation & Clear Flag
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default InstitutionalCourseLifecyclePortal;
