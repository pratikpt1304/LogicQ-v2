import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Award,
  CheckCircle,
  Clock,
  Calendar,
  AlertTriangle,
  Flame,
  FileDown,
  QrCode,
  ArrowLeft,
  ShieldCheck,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';
import {
  generateLabFileVerificationDossier,
  calculateLabInternalMarks,
} from '../../../../server/src/domain/lab-course/phase2-rules.js';

export const InstitutionalLabInternal: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  // Marks Calculation using Phase 2 Rule (BR-25)
  const labItems = [
    { earnedMarks: 10, maxMarks: 10, title: 'Lab 1: Bitwise Manipulation', onTime: true },
    { earnedMarks: 9.5, maxMarks: 10, title: 'Lab 2: Dynamic Memory Allocation', onTime: true },
    { earnedMarks: 10, maxMarks: 10, title: 'Lab 3: Array Reversal & Pointers', onTime: true },
    { earnedMarks: 9, maxMarks: 10, title: 'Lab 4: Singly Linked Lists', onTime: false },
    { earnedMarks: 10, maxMarks: 10, title: 'Lab 5: Circular Deques', onTime: true },
    { earnedMarks: 8.5, maxMarks: 10, title: 'Lab 6: Stack Expressions', onTime: true },
  ];

  const marksComputation = calculateLabInternalMarks({
    gradedOrDueItems: labItems,
    offeringLabInternalMax: 20.0,
    totalPlannedItemsMaxMarks: 100.0,
  });

  // Verification Dossier (AC-16)
  const dossier = generateLabFileVerificationDossier({
    studentRollNo: 'PRN20261001',
    courseCode: 'CS201',
    semester: 3,
    academicYear: '2026-2027',
    totalMarksEarned: marksComputation.scaledMarksSoFar,
    totalMarksMax: 20.0,
    totalLabsCompleted: 6,
  });

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showPdfDossierModal, setShowPdfDossierModal] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-[var(--border-subtle)] gap-4">
          <div>
            <button
              onClick={() => navigate('/lab/student/home')}
              className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-indigo-400 mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Portal Home</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                CS201
              </span>
              <h1 className="text-2xl font-bold">Continuous Internal Evaluation (CIE)</h1>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Real-time progress, attendance, and end-semester practical eligibility
            </p>
          </div>

          <button
            onClick={() => setShowPdfDossierModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm"
          >
            <FileDown className="w-4 h-4" />
            <span>Generate Lab File (PDF + QR)</span>
          </button>
        </div>

        {/* 7 Core Widgets Grid (S3. Lab internal) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

          {/* Widget 1: Marks So Far (BR-25) */}
          <div className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-2">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block">
              Marks So Far (BR-25)
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-emerald-400">
                {marksComputation.scaledMarksSoFar.toFixed(2)}
              </span>
              <span className="text-xs text-[var(--text-muted)]">/ 20.0 CIE Scale</span>
            </div>
            <div className="text-xs text-[var(--text-muted)] space-y-0.5 pt-2 border-t border-[var(--border-subtle)]">
              <p>Raw Coursework: <strong className="text-[var(--text-main)] font-mono">{marksComputation.rawMarksSoFar} / {marksComputation.maxMarksAvailableSoFar}</strong></p>
              <p>Projected CIE Mark: <strong className="text-emerald-400 font-mono">{marksComputation.finalProjectedMarks} / 20.0</strong></p>
            </div>
          </div>

          {/* Widget 2: Programs Breakdown */}
          <div className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-2">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block">
              Programs Progress
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-indigo-400">6</span>
              <span className="text-xs text-[var(--text-muted)]">/ 10 Completed (60%)</span>
            </div>
            <div className="text-xs text-[var(--text-muted)] space-y-0.5 pt-2 border-t border-[var(--border-subtle)]">
              <p>Unit 1: <strong className="text-emerald-400">2/2 Done</strong> · Unit 2: <strong className="text-emerald-400">2/2 Done</strong></p>
              <p>Unit 3: <strong className="text-amber-400">2/3 (1 in progress)</strong> · Unit 4: <strong>0/3</strong></p>
            </div>
          </div>

          {/* Widget 3: On-Time Record */}
          <div className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-2">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block">
              On-Time Record
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-emerald-400">83.3%</span>
              <span className="text-xs text-[var(--text-muted)]">(5 on-time, 1 late)</span>
            </div>
            <p className="text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--border-subtle)]">
              Missed on-time: Lab 4 (submitted within 24h grace period per BR-23).
            </p>
          </div>

          {/* Widget 4: Attendance & Makeup (BR-17) */}
          <div className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-2">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block">
              Lab Attendance
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-emerald-400">88.9%</span>
              <span className="text-xs text-[var(--text-muted)]">(8 / 9 Sessions)</span>
            </div>
            <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)]">Makeup slot available:</span>
              <button className="px-2 py-0.5 text-xs font-semibold rounded bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20">
                Book Slot
              </button>
            </div>
          </div>

          {/* Widget 5: End-Sem Eligibility (BR-33) */}
          <div className="p-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Exam Eligibility</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-emerald-400">ELIGIBLE</span>
              <span className="text-xs text-[var(--text-muted)]">(Threshold: 75% Att / 80% Lab)</span>
            </div>
            <p className="text-xs text-[var(--text-muted)] pt-2 border-t border-emerald-500/10">
              Both attendance (88.9%) and lab completion meet the university threshold.
            </p>
          </div>

          {/* Widget 6 & 7: Weak Topics & Practice Streak (BR-28) */}
          <div className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                Practice Streak (BR-28)
              </span>
              <span className="flex items-center gap-1 text-xs font-bold text-amber-400">
                <Flame className="w-3.5 h-3.5 fill-amber-400" /> 14 Days
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Streaks exist in practice arena only; they <strong>never</strong> affect academic marks or eligibility (BR-28).
            </p>
            <div className="pt-2 border-t border-[var(--border-subtle)]">
              <span className="text-xs font-semibold text-rose-400">Identified Weak Topic: </span>
              <span className="text-xs text-[var(--text-muted)]">Pointer Aliasing in Structs</span>
            </div>
          </div>

        </div>

        {/* Detailed Index Table (S4. Lab File Table) */}
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 space-y-4">
          <h3 className="text-sm font-bold text-[var(--text-main)] uppercase tracking-wider">
            Index & Evaluation Register (S4)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[var(--bg-subtle)] text-[var(--text-muted)] font-mono uppercase">
                <tr>
                  <th className="py-2.5 px-3">Session</th>
                  <th className="py-2.5 px-3">Topic Title</th>
                  <th className="py-2.5 px-3">CO Mapped</th>
                  <th className="py-2.5 px-3">Timing</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Marks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {labItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[var(--bg-subtle)]">
                    <td className="py-2.5 px-3 font-mono font-bold">#{idx + 1}</td>
                    <td className="py-2.5 px-3 font-semibold">{item.title}</td>
                    <td className="py-2.5 px-3 font-mono text-indigo-400">CO{Math.floor(idx / 2) + 1}</td>
                    <td className="py-2.5 px-3">
                      {item.onTime ? (
                        <span className="text-emerald-400 font-semibold">On-Time</span>
                      ) : (
                        <span className="text-amber-400 font-semibold">Late (Grace)</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                        Graded
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                      {item.earnedMarks.toFixed(1)} / {item.maxMarks}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Lab File Verification & QR Dossier Preview (AC-15, AC-16, S4) */}
        {showPdfDossierModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] max-w-lg w-full p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-base font-bold">Lab File QR Dossier (AC-16)</h3>
                </div>
                <button
                  onClick={() => setShowPdfDossierModal(false)}
                  className="text-xs text-[var(--text-muted)] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Student PRN:</span>
                  <span className="font-mono font-bold">PRN20261001</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Course:</span>
                  <span className="font-semibold">CS201 · Data Structures</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Marks Certified:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {marksComputation.scaledMarksSoFar} / 20.0 CIE
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Verification Code:</span>
                  <span className="font-mono text-indigo-300 font-bold truncate max-w-[220px]">
                    {dossier.verificationCode}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Hidden Test Cases (AC-15):</span>
                  <span className="text-emerald-400 font-semibold">Passed (Sanitized)</span>
                </div>
              </div>

              <div className="text-center p-4 bg-white rounded-lg inline-block mx-auto w-full">
                {/* Visual QR Simulator */}
                <div className="w-32 h-32 mx-auto bg-black p-2 rounded flex items-center justify-center text-white text-[10px] font-mono text-center">
                  [QR CODE]<br />{dossier.payload.fingerprint}
                </div>
                <span className="text-[10px] text-gray-700 block mt-2 font-mono">
                  Scan to verify on https://logicq-clanguage.web.app
                </span>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  onClick={() => {
                    alert(`Lab File PDF downloaded with verification code: ${dossier.verificationCode}`);
                    setShowPdfDossierModal(false);
                  }}
                  className="flex-1 py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all"
                >
                  Download Signed PDF
                </button>
                <button
                  onClick={() => setShowPdfDossierModal(false)}
                  className="py-2 px-4 rounded-lg border border-[var(--border-subtle)] text-xs text-[var(--text-muted)]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
