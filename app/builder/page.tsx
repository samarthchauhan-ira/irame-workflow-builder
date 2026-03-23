'use client';

import { useState, useCallback, useRef, useEffect, useMemo, Fragment } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Workflow, ChatMessage, StepType } from '@/lib/types';
import { saveWorkflow } from '@/lib/storage';

/* ─── Step type config ────────────────────────────────────────────────── */
const STC: Record<StepType, { label: string; bg: string; text: string; dot: string; bar: string; ring: string }> = {
  extract:   { label: 'Extract',   bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500',    bar: 'bg-blue-500',    ring: 'ring-blue-200' },
  analyze:   { label: 'Analyze',   bg: 'bg-purple-100',  text: 'text-purple-700',  dot: 'bg-purple-500',  bar: 'bg-purple-500',  ring: 'ring-purple-200' },
  compare:   { label: 'Compare',   bg: 'bg-indigo-100',  text: 'text-indigo-700',  dot: 'bg-indigo-500',  bar: 'bg-indigo-500',  ring: 'ring-indigo-200' },
  flag:      { label: 'Flag',      bg: 'bg-rose-100',    text: 'text-rose-700',    dot: 'bg-rose-500',    bar: 'bg-rose-500',    ring: 'ring-rose-200' },
  summarize: { label: 'Summarize', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', bar: 'bg-emerald-500', ring: 'ring-emerald-200' },
  calculate: { label: 'Calculate', bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500',   bar: 'bg-amber-500',   ring: 'ring-amber-200' },
  validate:  { label: 'Validate',  bg: 'bg-cyan-100',    text: 'text-cyan-700',    dot: 'bg-cyan-500',    bar: 'bg-cyan-500',    ring: 'ring-cyan-200' },
};

/* ─── Step type icons ─────────────────────────────────────────────────── */
function StepIcon({ type, active }: { type: StepType; active: boolean }) {
  const c = `w-7 h-7 transition-colors ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`;
  if (type === 'extract')   return <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>;
  if (type === 'validate')  return <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>;
  if (type === 'compare')   return <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>;
  if (type === 'calculate') return <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>;
  if (type === 'flag')      return <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /></svg>;
  if (type === 'summarize') return <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>;
  return <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
}

/* ─── File type helpers ───────────────────────────────────────────────── */
const FILE_BG:   Record<string, string> = { csv: 'bg-emerald-100', pdf: 'bg-blue-100',   image: 'bg-purple-100', sql: 'bg-orange-100' };
const FILE_TEXT: Record<string, string> = { csv: 'text-emerald-600',pdf: 'text-blue-600', image: 'text-purple-600',sql: 'text-orange-600' };

function FileIcon({ type }: { type: string }) {
  const c = 'w-4 h-4';
  if (type === 'pdf')   return <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
  if (type === 'image') return <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
  if (type === 'sql')   return <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582 4 8-4s8 1.79 8 4" /></svg>;
  return <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
}

/* ─── Demo workflow ───────────────────────────────────────────────────── */
type PartialWorkflow = Omit<Workflow, 'id' | 'createdAt' | 'updatedAt' | 'runCount' | 'status'>;

const DEMO: PartialWorkflow = {
  name: 'Terminal Charges Audit — YYZ',
  description: 'Validates terminal charges against MTOW master, IoCC records and YYZ rate schedules.',
  category: 'Aviation Audit',
  logicPrompt: 'Validate invoice terminal charges by cross-referencing MTOW master, IoCC flight data, and YYZ rate schedule.',
  tags: ['terminal-charges', 'mtow', 'IoCC', 'aviation'],
  inputs: [
    { id: 'i1', name: 'Invoice Data',      type: 'csv',  description: "Rows with Charge Type, A/C ID, MTOW, FLIGHT ID, TOTAL $",          required: true  },
    { id: 'i2', name: 'MTOW Master',        type: 'csv',  description: 'Aircraft register with certified MTOW keyed by Aircraft ID',        required: true  },
    { id: 'i3', name: 'IoCC Flight Data',   type: 'csv',  description: 'Operational records: Flight Number, Tail Number, Date',             required: true  },
    { id: 'i4', name: 'Rate Master (YYZ)', type: 'csv',  description: 'YYZ rate schedule — MTOW weight tiers and terminal charge amounts', required: true  },
  ],
  output: {
    type: 'flags',
    title: 'Audit Findings Report',
    description: 'Row-level results: MTOW status, flight verification, charge delta, and consolidated remarks',
    fields: [
      { name: 'Flight ID',         type: 'string', description: 'Normalised flight ID' },
      { name: 'MTOW_Match_Status', type: 'string', description: 'Match | Mismatch | Not Found | Missing' },
      { name: 'Flight_In_IoCC',    type: 'string', description: 'Found / NOT FOUND in IoCC' },
      { name: 'Calculated_Charge', type: 'number', description: 'Expected charge per rate master' },
      { name: 'Excess_Charge',     type: 'number', description: 'Invoice TOTAL $ − Calculated_Charge' },
      { name: 'Remarks',           type: 'string', description: 'OVERCHARGE / UNDERCHARGE / OK' },
    ],
  },
  steps: [
    {
      id: 'step-1', name: 'Filter Terminal Charges', type: 'extract',
      description: "Select only rows where Charge Type = 'Terminal/Terminaux'",
      dataFiles: ['i1'],
      columnMappings: [{ from: 'Charge Type', to: 'Filtered Dataset', description: "= 'Terminal/Terminaux'" }],
      subSteps: ["Identify rows where Charge Type = 'Terminal/Terminaux'", 'Store filtered rows as working dataset'],
    },
    {
      id: 'step-2', name: 'Validate MTOW', type: 'validate',
      description: 'Merge invoice data with MTOW Master and compare weight values',
      dataFiles: ['i1', 'i2'],
      columnMappings: [
        { from: 'A/C ID (Invoice)',   to: 'Aircraft (Master)',  description: 'Merge join key' },
        { from: 'MTOW (Invoice)',      to: 'MTOW_Master',        description: 'Renamed after merge' },
        { from: 'MTOW (metric tons)', to: 'MTOW (kg)',           description: '× 1,000 · round to nearest 1,000' },
        { from: 'MTOW comparison',    to: 'MTOW_Match_Status',  description: 'Match | Mismatch | Not Found | Missing' },
      ],
      subSteps: [
        "Merge Invoice with MTOW Master on 'A/C ID' ↔ 'Aircraft'",
        "Rename merged column to 'MTOW_Master', drop 'Aircraft'",
        'Convert MTOW metric tons → kg, round to nearest 1,000',
        "Create 'MTOW_Match_Status' column",
      ],
    },
    {
      id: 'step-3', name: 'Check Flight in IoCC', type: 'compare',
      description: 'Verify each flight exists in IoCC operational records',
      dataFiles: ['i1', 'i3'],
      columnMappings: [
        { from: 'FLIGHT ID (AIC186)',   to: 'Flight No. (AI0186)', description: 'Add leading zero, normalize prefix' },
        { from: 'Date (Invoice)',        to: 'Date (IoCC)',          description: 'Normalize to YYYY-MM-DD' },
        { from: 'Flight + Tail + Date', to: 'Flight_In_IoCC',       description: 'Lookup in IoCC tuple set' },
      ],
      subSteps: [
        'Convert FLIGHT ID: AIC186 → AI0186',
        'Normalize date formats in both DataFrames',
        'Build IoCC lookup set (Flight, Tail, Date)',
        "Add 'Flight_In_IoCC' column",
      ],
    },
    {
      id: 'step-4', name: 'Calculate Expected Charge', type: 'calculate',
      description: 'Determine the correct charge using the YYZ Rate Master',
      dataFiles: ['i1', 'i2', 'i4'],
      columnMappings: [
        { from: 'MTOW_Master (kg)',  to: 'MTOW (metric tons)', description: '÷ 1,000 for rate-tier lookup' },
        { from: 'YYZ Rate Tier',     to: 'Calculated_Charge',  description: 'Rate × MTOW (metric tons)' },
      ],
      subSteps: [
        'Extract YYZ rate schedule from Rate Master',
        'Convert MTOW_Master kg → metric tons',
        'Find applicable rate bracket',
        "Add 'Calculated_Charge' column",
      ],
    },
    {
      id: 'step-5', name: 'Compute Excess Charge', type: 'calculate',
      description: 'Calculate difference between invoiced and calculated amounts',
      dataFiles: ['i1'],
      columnMappings: [{ from: 'TOTAL $', to: 'Excess_Charge', description: 'TOTAL $ − Calculated_Charge' }],
      subSteps: ["Subtract 'Calculated_Charge' from 'TOTAL $'", "Store result in 'Excess_Charge' column"],
    },
    {
      id: 'step-6', name: 'Generate Audit Remarks', type: 'flag',
      description: 'Produce per-row MTOW, flight, and charge remarks',
      dataFiles: ['i1'],
      columnMappings: [
        { from: 'MTOW_Match_Status',  to: 'MTOW_Remark',          description: 'OK | Not Found | Missing | weight diff' },
        { from: 'Flight_In_IoCC',     to: 'Flight_Remark',         description: 'Found in IoCC | NOT FOUND' },
        { from: 'Excess_Charge',      to: 'Charge_Remark',         description: 'OVERCHARGE | UNDERCHARGE | OK + $' },
        { from: 'All three remarks',  to: 'Consolidated_Remarks',  description: 'Combined per row' },
      ],
      subSteps: [
        "MTOW Remark: OK | Not Found | Missing | weight diff",
        "Flight Remark: Found | NOT FOUND in IoCC",
        "Charge Remark: OVERCHARGE | UNDERCHARGE | OK",
        'Consolidate into one Remarks column',
      ],
    },
  ],
};

const TABS = ['Workflow', 'Export', 'Analytics', 'Manager'] as const;

/* ═══════════════════════════════════════════════════════════════════════ */
export default function BuilderPage() {
  const router = useRouter();
  const [messages, setMessages]             = useState<ChatMessage[]>([]);
  const [input, setInput]                   = useState('');
  const [isLoading, setIsLoading]           = useState(false);
  const [workflow, setWorkflow]             = useState<PartialWorkflow | null>(DEMO);
  const [isSaving, setIsSaving]             = useState(false);
  const [savedId, setSavedId]               = useState<string | null>(null);
  const [activeTab, setActiveTab]           = useState<typeof TABS[number]>('Workflow');
  const [selectedStepId, setSelectedStepId] = useState<string | null>('step-2');
  const [lastSaved, setLastSaved]           = useState<Date | null>(null);
  const [isDemo, setIsDemo]                 = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const selectedStep      = workflow?.steps.find(s => s.id === selectedStepId) ?? null;
  const selectedStepIndex = workflow?.steps.findIndex(s => s.id === selectedStepId) ?? -1;
  const dataFilesForStep  = (selectedStep?.dataFiles ?? [])
    .map(id => workflow?.inputs.find(i => i.id === id)).filter(Boolean) as Workflow['inputs'];

  async function sendMessage(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || isLoading) return;
    if (isDemo) setIsDemo(false);
    const userMsg: ChatMessage = { role: 'user', content: msg };
    const next = [...messages, userMsg];
    setMessages(next); setInput(''); setIsLoading(true);
    try {
      const res  = await fetch('/api/generate-workflow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: next.map(m => ({ role: m.role, content: m.content })) }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessages([...next, { role: 'assistant', content: data.message ?? 'Done.' }]);
      if (data.workflow) { setWorkflow(data.workflow); setSavedId(null); }
    } catch (e) {
      setMessages([...next, { role: 'assistant', content: `Error: ${e instanceof Error ? e.message : 'Unknown'}` }]);
    } finally { setIsLoading(false); }
  }

  async function handleSave() {
    if (!workflow) return;
    setIsSaving(true);
    try {
      const saved = saveWorkflow({ ...workflow, status: 'active' });
      setSavedId(saved.id); setLastSaved(new Date());
      setTimeout(() => router.push(`/workflow/${saved.id}`), 800);
    } finally { setIsSaving(false); }
  }

  const lastSavedText = useMemo(() => {
    if (!lastSaved) return null;
    const d = Math.floor((Date.now() - lastSaved.getTime()) / 60000);
    return d === 0 ? 'Last saved just now' : `Last saved ${d}m ago`;
  }, [lastSaved]);

  /* ─── render ─────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">

      {/* ── Header ── */}
      <header className="flex items-center h-14 px-5 border-b border-slate-200 bg-white z-50 flex-shrink-0 gap-3">
        <div className="flex items-center gap-2 w-[260px] flex-shrink-0 min-w-0">
          <Link href="/" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </Link>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900 truncate max-w-[200px]">{workflow?.name ?? 'New Workflow'}</div>
            <div className="text-xs text-slate-400">{lastSavedText ?? 'Not saved yet'}</div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="flex bg-slate-100 rounded-xl p-1 gap-0.5">
            {TABS.map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${activeTab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 w-[260px] justify-end flex-shrink-0">
          <button onClick={handleSave} disabled={!workflow || isSaving || !!savedId}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
            {isSaving ? 'Saving…' : savedId ? 'Saved ✓' : 'Save'}
          </button>
          <Link href={savedId ? `/workflow/${savedId}` : '#'} onClick={e => { if (!workflow) e.preventDefault(); }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-xl font-medium transition-colors ${workflow ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Test Run
          </Link>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* ── Left: AI Assistant ── */}
        <aside className="flex flex-col w-[260px] flex-shrink-0 border-r border-slate-200 bg-white">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 flex-shrink-0">
            <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
            </div>
            <span className="text-sm font-semibold text-slate-800">AI Assistant</span>
            {isDemo && <span className="ml-auto text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">Example</span>}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 ? (
              <div className="space-y-2">
                {isDemo && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-700 leading-relaxed">
                    <p className="font-semibold mb-1">✦ Example loaded</p>
                    <p>Click any step above to see its data files and column mappings.</p>
                  </div>
                )}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs text-slate-600 leading-relaxed">
                  Describe your workflow in plain English
                </div>
              </div>
            ) : (
              <>
                {messages.map((m, i) => (
                  <div key={i} className={`flex gap-2 message-enter ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                      {m.role === 'user' ? 'U' : 'AI'}
                    </div>
                    <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-slate-100 text-slate-700 rounded-tl-sm'}`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-slate-600">AI</div>
                    <div className="bg-slate-100 rounded-xl rounded-tl-sm px-3 py-2 flex items-center gap-1">
                      <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </>
            )}
          </div>

          <div className="p-3 border-t border-slate-100 flex-shrink-0">
            <div className="flex gap-1.5 items-end">
              <textarea value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Describe what you need…" rows={2}
                className="flex-1 resize-none text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400" />
              <button onClick={() => sendMessage()} disabled={!input.trim() || isLoading}
                className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5">Try: &ldquo;Add validation step&rdquo; or &ldquo;Change output to table&rdquo;</p>
          </div>
        </aside>

        {/* ── Center ── */}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-50">

          {/* ══ Large circular stepper ══ */}
          <div className="flex-shrink-0 bg-white border-b border-slate-200 shadow-sm">
            <div className="px-10 py-7 overflow-x-auto">
              <div className="relative min-w-max">
                {/* Background connecting line — sits at top: 36px (centre of 72px circles) */}
                <div className="absolute h-[2px] bg-slate-200 z-0 pointer-events-none"
                  style={{ top: 36, left: 40, right: 40 }} />

                <div className="relative z-10 flex items-start gap-0">

                  {/* ── START badge ── */}
                  <div className="flex flex-col items-center gap-3 w-[96px] flex-shrink-0">
                    <div className="w-[72px] h-[72px] rounded-full flex items-center justify-center shadow-lg flex-shrink-0"
                      style={{ background: 'linear-gradient(145deg,#6366f1,#3b82f6)' }}>
                      <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <circle cx="12" cy="12" r="3" strokeWidth={2} />
                        <path strokeLinecap="round" strokeWidth={2} d="M12 5v2M12 17v2M5 12H3M21 12h-2M7.05 7.05 5.64 5.64M18.36 18.36l-1.41-1.41M7.05 16.95l-1.41 1.41M18.36 5.64l-1.41 1.41" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-[11px] font-bold text-slate-500 tracking-widest uppercase">Start</p>
                    </div>
                  </div>

                  {/* ── Steps ── */}
                  {workflow?.steps.map((step, i) => {
                    const cfg    = STC[step.type] ?? STC.analyze;
                    const active = selectedStepId === step.id;
                    return (
                      <Fragment key={step.id}>
                        {/* spacer that "sits" on the line */}
                        <div className="flex-shrink-0 w-8 mt-9" />

                        <button onClick={() => setSelectedStepId(active ? null : step.id)}
                          className="group flex flex-col items-center gap-3 flex-shrink-0 w-[120px] focus:outline-none">

                          {/* Circle */}
                          <div className={`w-[72px] h-[72px] rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                            active
                              ? `bg-slate-900 shadow-2xl ring-[5px] ring-offset-2 ${cfg.ring}`
                              : 'bg-white border-2 border-slate-200 shadow-md group-hover:border-indigo-400 group-hover:shadow-xl group-hover:scale-105'
                          }`}>
                            <StepIcon type={step.type} active={active} />
                          </div>

                          {/* Label */}
                          <div className="text-center w-full px-1">
                            <p className={`text-sm font-semibold leading-snug mb-1.5 transition-colors ${
                              active ? 'text-slate-900' : 'text-slate-600 group-hover:text-slate-900'
                            }`}>
                              {step.name}
                            </p>
                            <span className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
                              {cfg.label.toUpperCase()}
                            </span>
                            {active && (
                              <div className="flex items-center justify-center gap-1.5 mt-2">
                                <span className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.dot} animate-pulse`} />
                                <span className={`text-[11px] font-semibold ${cfg.text}`}>Selected</span>
                              </div>
                            )}
                          </div>
                        </button>
                      </Fragment>
                    );
                  })}

                  {/* spacer before OUTPUT */}
                  <div className="flex-shrink-0 w-8 mt-9" />

                  {/* ── OUTPUT badge ── */}
                  <div className="flex flex-col items-center gap-3 w-[96px] flex-shrink-0">
                    <div className="w-[72px] h-[72px] rounded-full bg-emerald-50 border-2 border-emerald-300 flex items-center justify-center shadow-md flex-shrink-0">
                      <svg className="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-emerald-700 mb-1.5">Output</p>
                      <span className="inline-block text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                        {(workflow?.output.type ?? 'output').toUpperCase()}
                      </span>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>

          {/* ══ Expandable step detail panel ══ */}
          <div className="flex-shrink-0 overflow-hidden border-b border-slate-200"
            style={{ maxHeight: selectedStepId && selectedStep ? '340px' : '0px', transition: 'max-height 0.28s ease-in-out' }}>
            {selectedStep && (() => {
              const cfg = STC[selectedStep.type] ?? STC.analyze;
              return (
                <div className="bg-white overflow-y-auto" style={{ maxHeight: '340px' }}>
                  {/* Panel header */}
                  <div className={`flex items-center justify-between px-6 py-3.5 border-b border-slate-100 ${cfg.bg}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-full bg-white/70 ${cfg.text} text-sm font-bold flex items-center justify-center flex-shrink-0`}>
                        {selectedStepIndex + 1}
                      </div>
                      <div className="min-w-0">
                        <span className={`text-sm font-bold ${cfg.text}`}>{selectedStep.name}</span>
                        <span className={`ml-2.5 text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/60 ${cfg.text}`}>{cfg.label.toUpperCase()}</span>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{selectedStep.description}</p>
                      </div>
                    </div>
                    <button onClick={() => setSelectedStepId(null)}
                      className="p-1.5 rounded-lg hover:bg-white/60 text-slate-500 transition-colors flex-shrink-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>

                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-6">

                      {/* ── Data Files ── */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`w-1 h-4 rounded-full ${cfg.bar}`} />
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data Files Used</p>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>{dataFilesForStep.length}</span>
                        </div>
                        {dataFilesForStep.length === 0
                          ? <p className="text-xs text-slate-400 italic">No files specified</p>
                          : (
                            <div className="space-y-2">
                              {dataFilesForStep.map(inp => (
                                <div key={inp.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
                                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${FILE_BG[inp.type]} ${FILE_TEXT[inp.type]}`}>
                                    <FileIcon type={inp.type} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 truncate">{inp.name}</p>
                                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${FILE_BG[inp.type]} ${FILE_TEXT[inp.type]}`}>{inp.type.toUpperCase()}</span>
                                      {inp.required && <span className="text-[10px] bg-rose-50 text-rose-500 border border-rose-100 px-1.5 py-0.5 rounded">Required</span>}
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed line-clamp-2">{inp.description}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        }
                      </div>

                      {/* ── Column Mappings ── */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-1 h-4 rounded-full bg-emerald-500" />
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Column Mappings</p>
                          {selectedStep.columnMappings?.length ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{selectedStep.columnMappings.length}</span>
                          ) : null}
                        </div>
                        {!selectedStep.columnMappings?.length
                          ? <p className="text-xs text-slate-400 italic">No mappings defined</p>
                          : (
                            <div className="space-y-2">
                              {selectedStep.columnMappings.map((m, j) => (
                                <div key={j} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors">
                                  <span className="flex-shrink-0 max-w-[30%] truncate px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-mono font-semibold" title={m.from}>{m.from}</span>
                                  <svg className="w-6 h-3 text-slate-400 flex-shrink-0" viewBox="0 0 24 12" fill="none">
                                    <path d="M0 6H20M16 1l6 5-6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                  <span className="flex-shrink-0 max-w-[30%] truncate px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-mono font-semibold" title={m.to}>{m.to}</span>
                                  {m.description && <span className="text-[10px] text-slate-400 truncate flex-1" title={m.description}>{m.description}</span>}
                                </div>
                              ))}
                            </div>
                          )
                        }
                      </div>
                    </div>

                    {/* ── Sub-steps ── */}
                    {selectedStep.subSteps?.length ? (
                      <div className="mt-5 pt-5 border-t border-slate-100">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-1 h-4 rounded-full bg-amber-400" />
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sub-steps</p>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">{selectedStep.subSteps.length}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {selectedStep.subSteps.map((s, j) => (
                            <div key={j} className="flex items-start gap-2.5 p-2.5 bg-amber-50 rounded-xl border border-amber-100">
                              <div className="w-4 h-4 rounded-full bg-amber-200 text-amber-800 text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{j + 1}</div>
                              <span className="text-[11px] text-slate-600 leading-relaxed">{s}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* ══ Input Configuration (below panel, replaces canvas) ══ */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-base font-semibold text-slate-800">Input Configuration</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{workflow?.inputs.length ?? 0} data source{(workflow?.inputs.length ?? 0) !== 1 ? 's' : ''} configured</p>
                </div>
                <button className="inline-flex items-center gap-1.5 bg-slate-900 text-white text-sm font-medium px-3.5 py-2 rounded-xl hover:bg-slate-800 transition-colors shadow-sm">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Add Input
                </button>
              </div>

              {!workflow || workflow.inputs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white border-2 border-dashed border-slate-200 flex items-center justify-center mb-4">
                    <svg className="w-7 h-7 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <p className="text-sm font-medium text-slate-500">No inputs yet</p>
                  <p className="text-xs text-slate-400 mt-1">Describe your workflow in the chat to auto-generate inputs</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {workflow.inputs.map((inp, idx) => (
                    <div key={inp.id} className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all p-5">
                      {/* Card header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${FILE_BG[inp.type]} ${FILE_TEXT[inp.type]}`}>
                            <FileIcon type={inp.type} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400 font-medium">Input {idx + 1}</span>
                              {inp.required && <span className="text-[10px] bg-rose-50 text-rose-500 border border-rose-100 px-1.5 py-0.5 rounded font-semibold">Required</span>}
                            </div>
                          </div>
                        </div>
                        <button className="p-1 text-slate-300 hover:text-red-400 transition-colors rounded-lg">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>

                      <div className="space-y-3">
                        {/* Field Name */}
                        <div>
                          <label className="text-xs font-semibold text-slate-500 block mb-1.5">Field Name</label>
                          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                            <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                            <span className="text-sm font-semibold text-slate-800">{inp.name}</span>
                          </div>
                        </div>

                        {/* Type */}
                        <div>
                          <label className="text-xs font-semibold text-slate-500 block mb-1.5">Type</label>
                          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${FILE_BG[inp.type]} ${FILE_TEXT[inp.type]}`}>
                                <FileIcon type={inp.type} />
                              </div>
                              <span className="text-sm text-slate-700 font-medium">
                                {inp.type === 'csv' ? 'CSV File' : inp.type === 'pdf' ? 'PDF Document' : inp.type === 'image' ? 'Image File' : 'SQL Database'}
                              </span>
                            </div>
                            <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          </div>
                        </div>

                        {/* Description */}
                        <div>
                          <label className="text-xs font-semibold text-slate-500 block mb-1.5">Description</label>
                          <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-600 leading-relaxed">{inp.description}</div>
                        </div>

                        {/* Required toggle */}
                        <div className="flex items-center justify-between pt-1">
                          <label className="text-xs font-semibold text-slate-500">Required</label>
                          <div className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors ${inp.required ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${inp.required ? 'translate-x-5' : 'translate-x-0.5'}`} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
