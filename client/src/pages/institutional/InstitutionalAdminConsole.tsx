import React, { useState } from 'react';
import {
  Users,
  Calendar,
  Building,
  Upload,
  Layers,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Play,
  FileCheck,
} from 'lucide-react';

export const InstitutionalAdminConsole: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'roster' | 'batches' | 'calendar' | 'courses'>('roster');

  // Roster Upload State (AC-2, BR-8)
  const [csvText, setCsvText] = useState(
    'RollNo,Name,Email\nPRN20261010,Sagar Deshmukh,sagar.deshmukh@sanjivani.edu.in\nPRN20261011,Pooja Kulkarni,pooja.kulkarni@sanjivani.edu.in'
  );
  const [uploadResult, setUploadResult] = useState<{
    success?: boolean;
    conflicts?: { row: number; rollNo: string; reason: string }[];
    message?: string;
  } | null>(null);

  // Batch Simulation State (BR-10, BR-11, AC-8)
  const [sectionSize, setSectionSize] = useState<number>(125);
  const [roomCapacity, setRoomCapacity] = useState<number>(65);
  const [simulatedBatches, setSimulatedBatches] = useState<{ batchIndex: number; studentCount: number }[]>([]);

  // Calendar Event Simulation State (AC-6, BR-18)
  const [holidayDate, setHolidayDate] = useState('2026-09-15');
  const [holidayTitle, setHolidayTitle] = useState('Engineers Day');
  const [affectedPlans, setAffectedPlans] = useState<string[]>([]);

  const handleSimulateRosterUpload = () => {
    const lines = csvText.trim().split('\n');
    const header = lines[0];
    const dataLines = lines.slice(1);

    const conflicts: { row: number; rollNo: string; reason: string }[] = [];
    const seenRolls = new Set<string>();

    dataLines.forEach((line, index) => {
      const parts = line.split(',').map((s) => s.trim());
      if (parts.length < 3) return;
      const rollNo = parts[0].toUpperCase();
      const email = parts[2].toLowerCase();

      if (!email.endsWith('@sanjivani.edu.in')) {
        conflicts.push({
          row: index + 2,
          rollNo,
          reason: 'Domain mismatch: Must be @sanjivani.edu.in',
        });
      }

      if (seenRolls.has(rollNo)) {
        conflicts.push({
          row: index + 2,
          rollNo,
          reason: `Duplicate roll number ${rollNo} within upload batch`,
        });
      }
      seenRolls.add(rollNo);
    });

    if (conflicts.length > 0) {
      setUploadResult({
        success: false,
        conflicts,
        message: 'AC-2 Conflict: Roster validation failed. Nothing was saved.',
      });
    } else {
      setUploadResult({
        success: true,
        message: `Successfully validated and onboarded ${dataLines.length} students.`,
      });
    }
  };

  const handleCalculateBatches = () => {
    // BR-10: Batch cap = min(65, roomCapacity)
    const cap = Math.min(65, roomCapacity);
    const numBatches = Math.ceil(sectionSize / cap);
    const baseSize = Math.floor(sectionSize / numBatches);
    const remainder = sectionSize % numBatches;

    const batches: { batchIndex: number; studentCount: number }[] = [];
    for (let i = 0; i < numBatches; i++) {
      batches.push({
        batchIndex: i + 1,
        studentCount: baseSize + (i < remainder ? 1 : 0),
      });
    }
    setSimulatedBatches(batches);
  };

  const handleSimulateAddHoliday = () => {
    // AC-6, BR-18: Flags affected plans
    setAffectedPlans(['Plan CS201 Batch A', 'Plan CS201 Batch B']);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="border-b border-[var(--border-subtle)] pb-4">
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            Institutional Administration
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold mt-1">Lab Platform Console</h1>
          <p className="text-xs text-[var(--text-muted)]">
            Sanjivani University · School of Engineering & Technology (SET)
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-[var(--border-subtle)] gap-6">
          <button
            onClick={() => setActiveTab('roster')}
            className={`pb-3 text-sm font-semibold transition-all ${
              activeTab === 'roster'
                ? 'text-indigo-400 border-b-2 border-indigo-500'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            Roster Onboarding (BR-5..8)
          </button>
          <button
            onClick={() => setActiveTab('batches')}
            className={`pb-3 text-sm font-semibold transition-all ${
              activeTab === 'batches'
                ? 'text-indigo-400 border-b-2 border-indigo-500'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            Batch Generator (BR-10..11)
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`pb-3 text-sm font-semibold transition-all ${
              activeTab === 'calendar'
                ? 'text-indigo-400 border-b-2 border-indigo-500'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            Academic Calendar & Impact (BR-18)
          </button>
        </div>

        {/* Tab 1: Roster Onboarding */}
        {activeTab === 'roster' && (
          <div className="space-y-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
            <div>
              <h3 className="text-base font-bold">Class Roster Import</h3>
              <p className="text-xs text-[var(--text-muted)]">
                Accounts are pre-created by roster import before anyone signs in. No self-signup is permitted (BR-5).
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">
                CSV Input (RollNo, Name, Email)
              </label>
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                rows={5}
                className="w-full p-3 font-mono text-xs rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              onClick={handleSimulateRosterUpload}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>Validate & Save Roster</span>
            </button>

            {uploadResult && (
              <div
                className={`p-4 rounded-lg border text-xs ${
                  uploadResult.success
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-2 font-bold mb-1">
                  {uploadResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                  )}
                  <span>{uploadResult.message}</span>
                </div>
                {uploadResult.conflicts && (
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    {uploadResult.conflicts.map((c, i) => (
                      <li key={i}>
                        Row {c.row}: [{c.rollNo}] - {c.reason}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Batch Generator */}
        {activeTab === 'batches' && (
          <div className="space-y-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
            <div>
              <h3 className="text-base font-bold">Automatic Batch Generator (BR-10, BR-11, AC-8)</h3>
              <p className="text-xs text-[var(--text-muted)]">
                Batch Cap = min(65, Working Seats). Batches are partitioned into consecutive sizes differing by at most 1.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[var(--text-muted)] block mb-1">Section Enrollment Size</label>
                <input
                  type="number"
                  value={sectionSize}
                  onChange={(e) => setSectionSize(parseInt(e.target.value) || 0)}
                  className="w-full p-2 text-xs rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)]"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)] block mb-1">Lab Room Working Seats</label>
                <input
                  type="number"
                  value={roomCapacity}
                  onChange={(e) => setRoomCapacity(parseInt(e.target.value) || 0)}
                  className="w-full p-2 text-xs rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)]"
                />
              </div>
            </div>

            <button
              onClick={handleCalculateBatches}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all"
            >
              <Layers className="w-4 h-4" />
              <span>Calculate Partitions</span>
            </button>

            {simulatedBatches.length > 0 && (
              <div className="pt-4 border-t border-[var(--border-subtle)] space-y-2">
                <span className="text-xs font-bold text-[var(--text-muted)] uppercase">Generated Batch Allocation</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {simulatedBatches.map((b) => (
                    <div
                      key={b.batchIndex}
                      className="p-3 rounded-lg border border-indigo-500/20 bg-indigo-500/5"
                    >
                      <span className="text-xs font-mono font-bold text-indigo-400">Batch {b.batchIndex}</span>
                      <p className="text-lg font-bold">{b.studentCount} Students</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Calendar Impact */}
        {activeTab === 'calendar' && (
          <div className="space-y-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
            <div>
              <h3 className="text-base font-bold">Academic Calendar Modification Impact (AC-6, BR-18)</h3>
              <p className="text-xs text-[var(--text-muted)]">
                Adding or moving a holiday touching a batch's scheduled lab dates automatically sets its session plan back to draft and flags it for faculty re-approval.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[var(--text-muted)] block mb-1">Event Date (YYYY-MM-DD)</label>
                <input
                  type="date"
                  value={holidayDate}
                  onChange={(e) => setHolidayDate(e.target.value)}
                  className="w-full p-2 text-xs rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)]"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)] block mb-1">Event Title</label>
                <input
                  type="text"
                  value={holidayTitle}
                  onChange={(e) => setHolidayTitle(e.target.value)}
                  className="w-full p-2 text-xs rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)]"
                />
              </div>
            </div>

            <button
              onClick={handleSimulateAddHoliday}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all"
            >
              <Calendar className="w-4 h-4" />
              <span>Simulate Adding Calendar Event</span>
            </button>

            {affectedPlans.length > 0 && (
              <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>AC-6 Triggered: Collision with Active Session Plans</span>
                </div>
                <p>The following session plans have been automatically set back to 'draft' and flagged for re-approval:</p>
                <ul className="list-disc list-inside space-y-1">
                  {affectedPlans.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
