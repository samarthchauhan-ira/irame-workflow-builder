'use client';

import { useState, useRef, useEffect, useMemo, Fragment } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Workflow, ChatMessage, StepType } from '@/lib/types';
import { saveWorkflow } from '@/lib/storage';
import { generateWorkflow, clarifyWorkflow } from '@/lib/mock-api';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

import {
  ArrowLeft, Send, Plus, Save, Play, X, Check, Upload, AlertTriangle,
  Link2, Columns, Zap, FileText, Image, Database, Table2, Filter, Shield,
  ArrowLeftRight, Calculator, Flag, ClipboardList, Loader2, Pencil,
  Download, Maximize2, Minus, Code2, BarChart3, Sparkles, ChevronDown, ChevronRight,
  Search, LayoutDashboard, SplitSquareHorizontal, Info, ArrowRight,
  RefreshCw, PieChart, TrendingUp, DollarSign, CheckCircle2,
} from 'lucide-react';

/* ---- Step type config ------------------------------------------------- */
const STC: Record<StepType, { label: string; bg: string; text: string; dot: string; bar: string; ring: string; circle: string }> = {
  extract:   { label: 'Extract',   bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500',    bar: 'bg-blue-500',    ring: 'ring-blue-200',    circle: 'bg-blue-500' },
  analyze:   { label: 'Analyze',   bg: 'bg-purple-100',  text: 'text-purple-700',  dot: 'bg-purple-500',  bar: 'bg-purple-500',  ring: 'ring-purple-200',  circle: 'bg-purple-500' },
  compare:   { label: 'Compare',   bg: 'bg-violet-100',  text: 'text-violet-700',  dot: 'bg-violet-500',  bar: 'bg-violet-500',  ring: 'ring-violet-200',  circle: 'bg-violet-500' },
  flag:      { label: 'Flag',      bg: 'bg-rose-100',    text: 'text-rose-700',    dot: 'bg-rose-500',    bar: 'bg-rose-500',    ring: 'ring-rose-200',    circle: 'bg-rose-500' },
  summarize: { label: 'Summarize', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', bar: 'bg-emerald-500', ring: 'ring-emerald-200', circle: 'bg-emerald-500' },
  calculate: { label: 'Calculate', bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500',   bar: 'bg-amber-500',   ring: 'ring-amber-200',   circle: 'bg-amber-500' },
  validate:  { label: 'Validate',  bg: 'bg-cyan-100',    text: 'text-cyan-700',    dot: 'bg-cyan-500',    bar: 'bg-cyan-500',    ring: 'ring-cyan-200',    circle: 'bg-cyan-500' },
};

/* ---- Step type badge labels ------------------------------------------- */
const STEP_BADGE: Record<StepType, { label: string; bg: string; text: string }> = {
  extract:   { label: 'INGESTION',   bg: 'bg-blue-100',    text: 'text-blue-700' },
  analyze:   { label: 'PROCESSING',  bg: 'bg-purple-100',  text: 'text-purple-700' },
  compare:   { label: 'PROCESSING',  bg: 'bg-violet-100',  text: 'text-violet-700' },
  flag:      { label: 'PROCESSING',  bg: 'bg-rose-100',    text: 'text-rose-700' },
  summarize: { label: 'OUTPUT',      bg: 'bg-emerald-100', text: 'text-emerald-700' },
  calculate: { label: 'PROCESSING',  bg: 'bg-amber-100',   text: 'text-amber-700' },
  validate:  { label: 'PROCESSING',  bg: 'bg-cyan-100',    text: 'text-cyan-700' },
};

/* ---- File type helpers ------------------------------------------------ */
const FILE_BG: Record<string, string> = { csv: 'bg-emerald-100', pdf: 'bg-blue-100', image: 'bg-purple-100', sql: 'bg-orange-100' };
const FILE_TEXT: Record<string, string> = { csv: 'text-emerald-600', pdf: 'text-blue-600', image: 'text-purple-600', sql: 'text-orange-600' };

function FileIcon({ type }: { type: string }) {
  const c = 'w-4 h-4';
  if (type === 'pdf') return <FileText className={c} />;
  if (type === 'image') return <Image className={c} />;
  if (type === 'sql') return <Database className={c} />;
  return <Table2 className={c} />;
}

/* ---- Demo workflow ---------------------------------------------------- */
type PartialWorkflow = Omit<Workflow, 'id' | 'createdAt' | 'updatedAt' | 'runCount' | 'status'>;

const DEMO: PartialWorkflow = {
  name: 'Terminal Charges Audit — YYZ',
  description: 'Validates terminal charges against MTOW master, IoCC records and YYZ rate schedules.',
  category: 'Aviation Audit',
  logicPrompt: 'Validate invoice terminal charges by cross-referencing MTOW master, IoCC flight data, and YYZ rate schedule.',
  tags: ['terminal-charges', 'mtow', 'IoCC', 'aviation'],
  inputs: [
    { id: 'i1', name: 'Invoice Data', type: 'csv', description: "Rows with Charge Type, A/C ID, MTOW, FLIGHT ID, TOTAL $", required: true, columns: ['invoice_no', 'charge_type', 'aircraft_id', 'mtow_kg', 'flight_id', 'total_amount', 'billing_date', 'currency'] },
    { id: 'i2', name: 'MTOW Master', type: 'csv', description: 'Aircraft register with certified MTOW keyed by Aircraft ID', required: true, columns: ['aircraft_id', 'aircraft_type', 'certified_mtow', 'mtow_unit', 'registration_date'] },
    { id: 'i3', name: 'IoCC Flight Data', type: 'csv', description: 'Operational records: Flight Number, Tail Number, Date', required: true, columns: ['flight_number', 'tail_number', 'flight_date', 'origin', 'destination', 'status'] },
    { id: 'i4', name: 'Rate Master (YYZ)', type: 'csv', description: 'YYZ rate schedule — MTOW weight tiers and terminal charge amounts', required: true, columns: ['weight_tier_min', 'weight_tier_max', 'rate_per_ton', 'effective_date', 'currency'] },
    { id: 'i5', name: 'Airline Operator Registry', type: 'csv', description: 'Master list of airline operators with ICAO/IATA codes and contact details', required: false, columns: ['icao_code', 'iata_code', 'operator_name', 'country', 'contact_email'] },
    { id: 'i6', name: 'Currency Exchange Rates', type: 'csv', description: 'Daily FX rates for multi-currency invoice reconciliation', required: false, columns: ['date', 'base_currency', 'target_currency', 'exchange_rate'] },
    { id: 'i7', name: 'Historical Audit Log', type: 'csv', description: 'Previous audit findings for trend analysis and repeat-flag detection', required: false, columns: ['audit_id', 'flight_id', 'finding_type', 'amount_delta', 'audit_date', 'status'] },
  ],
  output: {
    type: 'flags',
    title: 'Audit Findings Report',
    description: 'Row-level results: MTOW status, flight verification, charge delta, and consolidated remarks',
    fields: [
      { name: 'Flight ID', type: 'string', description: 'Normalised flight ID' },
      { name: 'MTOW_Match_Status', type: 'string', description: 'Match | Mismatch | Not Found | Missing' },
      { name: 'Flight_In_IoCC', type: 'string', description: 'Found / NOT FOUND in IoCC' },
      { name: 'Calculated_Charge', type: 'number', description: 'Expected charge per rate master' },
      { name: 'Excess_Charge', type: 'number', description: 'Invoice TOTAL $ - Calculated_Charge' },
      { name: 'Remarks', type: 'string', description: 'OVERCHARGE / UNDERCHARGE / OK' },
    ],
  },
  steps: [
    { id: 'step-1', name: 'Filter Terminal Charges', type: 'extract', description: "Select only rows where Charge Type = 'Terminal/Terminaux'", dataFiles: ['i1'], columnMappings: [{ from: 'Charge Type', to: 'Filtered Dataset', description: "= 'Terminal/Terminaux'" }], subSteps: ["Identify rows where Charge Type = 'Terminal/Terminaux'", 'Store filtered rows as working dataset'] },
    { id: 'step-2', name: 'Validate MTOW', type: 'validate', description: 'Merge invoice data with MTOW Master and compare weight values', dataFiles: ['i1', 'i2'], columnMappings: [{ from: 'A/C ID (Invoice)', to: 'Aircraft (Master)', description: 'Merge join key' }, { from: 'MTOW (Invoice)', to: 'MTOW_Master', description: 'Renamed after merge' }, { from: 'MTOW (metric tons)', to: 'MTOW (kg)', description: '* 1,000 / round to nearest 1,000' }, { from: 'MTOW comparison', to: 'MTOW_Match_Status', description: 'Match | Mismatch | Not Found | Missing' }], subSteps: ["Merge Invoice with MTOW Master on 'A/C ID' <> 'Aircraft'", "Rename merged column to 'MTOW_Master', drop 'Aircraft'", 'Convert MTOW metric tons to kg, round to nearest 1,000', "Create 'MTOW_Match_Status' column"] },
    { id: 'step-3', name: 'Check Flight in IoCC', type: 'compare', description: 'Verify each flight exists in IoCC operational records', dataFiles: ['i1', 'i3'], columnMappings: [{ from: 'FLIGHT ID (AIC186)', to: 'Flight No. (AI0186)', description: 'Add leading zero, normalize prefix' }, { from: 'Date (Invoice)', to: 'Date (IoCC)', description: 'Normalize to YYYY-MM-DD' }, { from: 'Flight + Tail + Date', to: 'Flight_In_IoCC', description: 'Lookup in IoCC tuple set' }], subSteps: ['Convert FLIGHT ID: AIC186 to AI0186', 'Normalize date formats in both DataFrames', 'Build IoCC lookup set (Flight, Tail, Date)', "Add 'Flight_In_IoCC' column"] },
    { id: 'step-4', name: 'Calculate Expected Charge', type: 'calculate', description: 'Determine the correct charge using the YYZ Rate Master', dataFiles: ['i1', 'i2', 'i4'], columnMappings: [{ from: 'MTOW_Master (kg)', to: 'MTOW (metric tons)', description: '/ 1,000 for rate-tier lookup' }, { from: 'YYZ Rate Tier', to: 'Calculated_Charge', description: 'Rate * MTOW (metric tons)' }], subSteps: ['Extract YYZ rate schedule from Rate Master', 'Convert MTOW_Master kg to metric tons', 'Find applicable rate bracket', "Add 'Calculated_Charge' column"] },
    { id: 'step-5', name: 'Compute Excess Charge', type: 'calculate', description: 'Calculate difference between invoiced and calculated amounts', dataFiles: ['i1'], columnMappings: [{ from: 'TOTAL $', to: 'Excess_Charge', description: 'TOTAL $ - Calculated_Charge' }], subSteps: ["Subtract 'Calculated_Charge' from 'TOTAL $'", "Store result in 'Excess_Charge' column"] },
    { id: 'step-6', name: 'Generate Audit Remarks', type: 'flag', description: 'Produce per-row MTOW, flight, and charge remarks', dataFiles: ['i1'], columnMappings: [{ from: 'MTOW_Match_Status', to: 'MTOW_Remark', description: 'OK | Not Found | Missing | weight diff' }, { from: 'Flight_In_IoCC', to: 'Flight_Remark', description: 'Found in IoCC | NOT FOUND' }, { from: 'Excess_Charge', to: 'Charge_Remark', description: 'OVERCHARGE | UNDERCHARGE | OK + $' }, { from: 'All three remarks', to: 'Consolidated_Remarks', description: 'Combined per row' }], subSteps: ["MTOW Remark: OK | Not Found | Missing | weight diff", "Flight Remark: Found | NOT FOUND in IoCC", "Charge Remark: OVERCHARGE | UNDERCHARGE | OK", 'Consolidate into one Remarks column'] },
  ],
};

/* ---- Clarification types ---------------------------------------------- */
type ClarifyPhase = 'idle' | 'upload' | 'checking_files' | 'need_files' | 'checking_mapping' | 'need_mapping' | 'checking_columns' | 'need_columns' | 'ready';

interface UploadedFile { file: File; name: string; type: string; headers?: string[]; rowCount?: number; sampleRows?: string[][]; }
interface FileMatch { inputId: string; fileName: string; confidence: string; }
interface FileMissing { inputId: string; inputName: string; reason: string; }
interface FileMapping { fileName: string; inputId: string; inputName: string; confidence: string; reason: string; }
interface Ambiguous { fileName: string; possibleInputs: string[]; reason: string; }
interface ColMapping { expectedFrom: string; actualColumn: string | null; expectedTo: string; confidence: string; suggestion?: string; }
interface StepColMapping { stepId: string; stepName: string; mappings: ColMapping[]; }
interface UnmappedCol { stepId: string; expectedFrom: string; availableHeaders: string[]; suggestion: string; }

/* ---- Vertical stepper config (4 steps) -------------------------------- */
const VSTEPS = [
  { num: 1, title: 'Write prompt', icon: Pencil },
  { num: 2, title: 'Upload Files', icon: Upload },
  { num: 3, title: 'Map Data', icon: Link2 },
  { num: 4, title: 'Review & Run', icon: Play },
] as const;

function phaseToFlowStep(phase: ClarifyPhase, hasWorkflow: boolean): number {
  if (phase === 'ready') return 4;
  if (phase === 'checking_columns' || phase === 'need_columns' || phase === 'checking_mapping' || phase === 'need_mapping') return 3;
  if (phase === 'upload' || phase === 'checking_files' || phase === 'need_files') return 2;
  return hasWorkflow ? 2 : 1;
}

function isPhaseLoading(phase: ClarifyPhase): boolean {
  return phase === 'checking_files' || phase === 'checking_mapping' || phase === 'checking_columns';
}

/* ---- Output data ------------------------------------------------------ */
const AUDIT_TABLE_DATA = [
  { id: 'INV-001', date: '2014-03-15', vendor: 'Air India',           amount: '$12,450.00', status: 'FLAGGED', reason: 'MTOW Mismatch' },
  { id: 'INV-002', date: '2014-03-16', vendor: 'Emirates',            amount: '$8,920.00',  status: 'CLEAN',   reason: '\u2014' },
  { id: 'INV-003', date: '2014-03-16', vendor: 'Singapore Airlines',  amount: '$15,200.00', status: 'FLAGGED', reason: 'Excess Charge' },
  { id: 'INV-004', date: '2014-03-17', vendor: 'Cathay Pacific',      amount: '$6,780.00',  status: 'CLEAN',   reason: '\u2014' },
  { id: 'INV-005', date: '2014-03-17', vendor: 'Qatar Airways',       amount: '$22,100.00', status: 'FLAGGED', reason: 'Invalid ID' },
];

const BAR_CHART_DATA = [
  { airline: 'Air India',  value: 75, color: 'bg-blue-500' },
  { airline: 'Cathaway',   value: 55, color: 'bg-violet-500' },
  { airline: 'Emirates',   value: 90, color: 'bg-emerald-500' },
  { airline: 'Singapore',  value: 65, color: 'bg-amber-500' },
  { airline: 'Qatar',      value: 80, color: 'bg-rose-500' },
  { airline: 'Asiana',     value: 40, color: 'bg-purple-500' },
];

const DONUT_DATA = [
  { label: 'MTOW Mismatch', pct: 45, color: 'bg-rose-500' },
  { label: 'Invalid ID',    pct: 25, color: 'bg-amber-500' },
  { label: 'Excess Charge', pct: 30, color: 'bg-violet-500' },
];

/* ======================================================================= */
export default function BuilderPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'user', content: 'Create a workflow that analyzes financial statements from PDFs and generates compliance reports.' },
    { role: 'assistant', content: "Hi! I can help you build your audit workflow. Try describing what you need, like: \"Create a workflow that analyzes financial statements from PDFs and generates compliance reports.\"" },
    { role: 'assistant', content: "I've analyzed your prompt and built the **Source Data Verification (SDV) Audit Workflow**.\nNow, please upload the required data files in the middle section so I can begin the mapping process." },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [workflow, setWorkflow] = useState<PartialWorkflow | null>(DEMO);
  const [isSaving, setIsSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isDemo, setIsDemo] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Clarification state
  const [clarifyPhase, setClarifyPhase] = useState<ClarifyPhase>('idle');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [fileMatches, setFileMatches] = useState<FileMatch[]>([]);
  const [fileMissing, setFileMissing] = useState<FileMissing[]>([]);
  const [fileMappings, setFileMappings] = useState<FileMapping[]>([]);
  const [ambiguousFiles, setAmbiguousFiles] = useState<Ambiguous[]>([]);
  const [stepColMappings, setStepColMappings] = useState<StepColMapping[]>([]);
  const [unmappedCols, setUnmappedCols] = useState<UnmappedCol[]>([]);
  const [clarifyMessage, setClarifyMessage] = useState('');
  const [manualMappings, setManualMappings] = useState<Record<string, string>>({});
  const [manualColMappings, setManualColMappings] = useState<Record<string, string>>({});
  const [expandedSchemas, setExpandedSchemas] = useState<Record<string, boolean>>({});
  const [openJustification, setOpenJustification] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Layout state
  const [activeFlowStep, setActiveFlowStep] = useState<number>(workflow ? 2 : 1);
  const [rightPanelTab, setRightPanelTab] = useState<'plan' | 'input' | 'output'>('plan');
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(100);

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionPhase, setExecutionPhase] = useState<'idle' | 'running' | 'clarify' | 'finalizing' | 'done'>('idle');
  const [showOutput, setShowOutput] = useState(false);
  const [outputTab, setOutputTab] = useState<'editor' | 'output' | 'analytics' | 'manager'>('output');
  const [selectedClarifyOption, setSelectedClarifyOption] = useState<string | null>(null);
  const [dashboardLayout, setDashboardLayout] = useState<'table' | 'dashboard' | 'split'>('dashboard');

  // Dashboard KPI checkboxes
  const [kpiChecks, setKpiChecks] = useState({
    totalRecords: true,
    duplicatesFound: true,
    amountAtRisk: true,
    comparisonLastRun: false,
    duplicateTrend: false,
  });

  // AI Suggestions checkboxes
  const [aiSuggestions, setAiSuggestions] = useState({
    trendColumn: true,
    varianceHighlight: true,
    timeToResolution: false,
    autoGroupVendor: false,
  });

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    const step = phaseToFlowStep(clarifyPhase, !!workflow);
    setActiveFlowStep(step);
  }, [clarifyPhase, workflow]);

  /* ---- File parsing --------------------------------------------------- */
  async function parseFile(file: File): Promise<UploadedFile> {
    const result: UploadedFile = { file, name: file.name, type: file.type || 'unknown' };
    if (file.name.endsWith('.csv') || file.type === 'text/csv') {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length > 0) {
        result.headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        result.rowCount = lines.length - 1;
        result.sampleRows = lines.slice(1, 4).map(l => l.split(',').map(c => c.trim().replace(/^"|"$/g, '')));
      }
    }
    return result;
  }

  async function handleFilesSelected(fileList: FileList) {
    const names = Array.from(fileList).map(f => f.name).join(', ');
    addUserChat(`Upload files: ${names}`);
    const parsed: UploadedFile[] = [];
    for (let i = 0; i < fileList.length; i++) parsed.push(await parseFile(fileList[i]));
    setUploadedFiles(prev => [...prev, ...parsed]);
    addClarifyChat(`Uploaded **${fileList.length}** file(s): ${names}. You can now click **Verify with Ira** to proceed.`);
  }

  function addUserChat(content: string) { setMessages(prev => [...prev, { role: 'user', content }]); }

  function autoFillSampleFiles() {
    if (!workflow) return;
    addUserChat("Auto-fill sample files");
    const sampleFiles: UploadedFile[] = workflow.inputs.map(inp => {
      const fileName = inp.name.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_sample.csv';
      const blob = new Blob(['sample'], { type: 'text/csv' });
      const file = new File([blob], fileName, { type: 'text/csv' });
      return {
        file,
        name: fileName,
        type: 'text/csv',
        headers: inp.columns ?? ['col1', 'col2', 'col3'],
        rowCount: 100,
        sampleRows: [['sample1', 'sample2', 'sample3']],
      };
    });
    setUploadedFiles(sampleFiles);
    addClarifyChat("Sample files have been auto-populated for all expected inputs. You can now proceed with verification.");
  }

  function startClarification() {
    if (!workflow || uploadedFiles.length === 0) return;
    addUserChat("Verify with Ira");
    setClarifyPhase('checking_files');
    runFileSufficiencyCheck();
  }

  /* ---- Phase 1: Check files ------------------------------------------- */
  async function runFileSufficiencyCheck() {
    setClarifyPhase('checking_files'); setClarifyMessage('');
    try {
      const data = await clarifyWorkflow({ phase: 'check_files', workflow: { inputs: workflow!.inputs, steps: workflow!.steps, name: workflow!.name, description: workflow!.description }, files: uploadedFiles.map(f => ({ name: f.name, type: f.type, headers: f.headers, rowCount: f.rowCount })) });
      setFileMatches(data.matched ?? []); setFileMissing(data.missing ?? []); setClarifyMessage(data.message ?? '');
      if (data.sufficient) {
        addClarifyChat("I've pre-populated the required files for you. Now, click **Verify with Ira** to proceed.");
        runFileMappingCheck();
      } else {
        addClarifyChat(data.message ?? 'Some files are missing.');
        setClarifyPhase('need_files');
      }
    } catch (e) {
      setClarifyMessage(`Error: ${e instanceof Error ? e.message : 'Unknown'}`);
      addClarifyChat(`Error checking files: ${e instanceof Error ? e.message : 'Unknown'}`);
      setClarifyPhase('need_files');
    }
  }

  /* ---- Phase 2: Map files --------------------------------------------- */
  async function runFileMappingCheck() {
    setClarifyPhase('checking_mapping'); setClarifyMessage('');
    try {
      const data = await clarifyWorkflow({ phase: 'map_files', workflow: { inputs: workflow!.inputs, steps: workflow!.steps, name: workflow!.name, description: workflow!.description }, files: uploadedFiles.map(f => ({ name: f.name, type: f.type, headers: f.headers, rowCount: f.rowCount, sampleRows: f.sampleRows })) });
      setFileMappings(data.fileMappings ?? []); setAmbiguousFiles(data.ambiguous ?? []); setClarifyMessage(data.message ?? '');
      addClarifyChat("Great! I've detected all required files. I've automatically suggested mappings for them. Please review the **Map Data** step in the middle section.");
      setClarifyPhase('need_mapping');
    } catch (e) {
      setClarifyMessage(`Error: ${e instanceof Error ? e.message : 'Unknown'}`);
      addClarifyChat(`Error mapping files: ${e instanceof Error ? e.message : 'Unknown'}`);
      setClarifyPhase('need_mapping');
    }
  }

  /* ---- Phase 3: Map columns ------------------------------------------- */
  async function runColumnMappingCheck() {
    setClarifyPhase('checking_columns'); setClarifyMessage('');
    try {
      const data = await clarifyWorkflow({ phase: 'map_columns', workflow: { inputs: workflow!.inputs, steps: workflow!.steps, name: workflow!.name, description: workflow!.description }, files: uploadedFiles.map(f => ({ name: f.name, type: f.type, headers: f.headers, rowCount: f.rowCount, sampleRows: f.sampleRows })) });
      setStepColMappings(data.stepColumnMappings ?? []); setUnmappedCols(data.unmappedColumns ?? []); setClarifyMessage(data.message ?? '');
      addClarifyChat("Mappings confirmed. Now, let's align the columns. I've matched most of them, but I need you to double-check the **Amount** field in the Invoice Data.");
      setClarifyPhase('need_columns');
    } catch (e) {
      setClarifyMessage(`Error: ${e instanceof Error ? e.message : 'Unknown'}`);
      addClarifyChat(`Error mapping columns: ${e instanceof Error ? e.message : 'Unknown'}`);
      setClarifyPhase('need_columns');
    }
  }

  function addClarifyChat(content: string) { setMessages(prev => [...prev, { role: 'assistant', content }]); }
  function confirmManualMappings() {
    addUserChat("Confirm & Align Columns");
    runColumnMappingCheck();
  }
  function confirmManualColumns() {
    addUserChat("Confirm Mappings");
    addClarifyChat("Excellent! Everything is mapped and ready. You can now review the final workflow and run a test audit.");
    setClarifyPhase('ready');
  }

  /* ---- Chat send ------------------------------------------------------ */
  async function sendMessage(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || isLoading) return;
    if (isDemo) setIsDemo(false);
    const userMsg: ChatMessage = { role: 'user', content: msg };
    const next = [...messages, userMsg];
    setMessages(next); setInput(''); setIsLoading(true);

    // If no workflow yet, generate one
    if (!workflow) {
      try {
        const data = await generateWorkflow(next.map(m => ({ role: m.role, content: m.content })));
        setMessages([...next, { role: 'assistant', content: data.message ?? 'Done.' }]);
        if (data.workflow) { setWorkflow(data.workflow); setSavedId(null); setClarifyPhase('idle'); setUploadedFiles([]); setActiveFlowStep(2); }
      } catch (e) {
        setMessages([...next, { role: 'assistant', content: `Error: ${e instanceof Error ? e.message : 'Unknown'}` }]);
      } finally { setIsLoading(false); }
      return;
    }

    // Workflow exists — handle contextual conversation based on active step
    try {
      const lowerMsg = msg.toLowerCase();

      // Check if user wants to regenerate / modify the workflow
      const isModifyIntent = /\b(change|update|modify|add|remove|replace|redo|regenerate|new workflow|start over)\b/.test(lowerMsg);
      if (isModifyIntent) {
        const data = await generateWorkflow(next.map(m => ({ role: m.role, content: m.content })));
        setMessages([...next, { role: 'assistant', content: data.message ?? 'Done.' }]);
        if (data.workflow) { setWorkflow(data.workflow); setSavedId(null); setClarifyPhase('idle'); setUploadedFiles([]); setActiveFlowStep(2); }
        return;
      }

      // Step-contextual responses
      let reply = '';
      if (activeFlowStep === 2) {
        reply = `I see your message: "${msg}". You're currently on the **Upload Files** step. Please upload the required data files shown in the middle panel, then click **Verify with Ira** to proceed. If you need to modify the workflow, try saying "change" or "add a step".`;
      } else if (activeFlowStep === 3 && clarifyPhase === 'need_mapping') {
        reply = `Got it: "${msg}". You're on the **Map Files** step. Please review the file mappings in the middle panel and click **Confirm & Align Columns** when ready. You can click "Change" on any mapping to reassign files.`;
      } else if (activeFlowStep === 3 && clarifyPhase === 'need_columns') {
        reply = `Noted: "${msg}". You're on the **Map Columns** step. Please review and adjust any column mappings in the middle panel, then click **Confirm Mappings** to proceed.`;
      } else if (activeFlowStep === 4) {
        reply = `Thanks for your input: "${msg}". You're on the **Review & Run** step. When you're satisfied with the execution plan, click **Run Workflow** to start the audit.`;
      } else {
        reply = `I understand: "${msg}". Let me know if you'd like to modify the workflow — try saying "add a validation step" or "change the output format".`;
      }
      setMessages([...next, { role: 'assistant', content: reply }]);
    } catch (e) {
      setMessages([...next, { role: 'assistant', content: `Error: ${e instanceof Error ? e.message : 'Unknown'}` }]);
    } finally { setIsLoading(false); }
  }

  async function handleSave() {
    if (!workflow) return;
    addUserChat("Save Workflow");
    setIsSaving(true);
    try {
      const saved = saveWorkflow({ ...workflow, status: 'active' });
      setSavedId(saved.id); setLastSaved(new Date());
      setTimeout(() => router.push(`/workflow-run?id=${saved.id}`), 800);
    } finally { setIsSaving(false); }
  }

  const lastSavedText = useMemo(() => {
    if (!lastSaved) return null;
    const d = Math.floor((Date.now() - lastSaved.getTime()) / 60000);
    return d === 0 ? 'Last saved just now' : `Last saved ${d}m ago`;
  }, [lastSaved]);

  function isStepCompleted(num: number) { return num < activeFlowStep; }
  function toggleSchemaExpanded(id: string) { setExpandedSchemas(prev => ({ ...prev, [id]: !prev[id] })); }
  function isSchemaExpanded(id: string) { return expandedSchemas[id] ?? true; } // default expanded for first, collapsed for rest

  /* ---- Run Workflow Execution Flow ------------------------------------ */
  function handleRunWorkflow() {
    if (!workflow) return;
    addUserChat("Run Workflow");
    setIsExecuting(true);
    setExecutionPhase('running');
    addClarifyChat(`Initiating test run for **${workflow.name}**. I'm processing the **${uploadedFiles.length || workflow.inputs.length}** uploaded files and applying the audit logic...`);

    // After 3 seconds, show clarification question
    setTimeout(() => {
      setExecutionPhase('clarify');
      addClarifyChat("I've encountered a slight ambiguity in the **MTOW Master** data. Some entries have multiple weight categories. How should I handle these?");
    }, 3000);
  }

  function handleClarifyOptionClick(option: string) {
    setSelectedClarifyOption(option);
    setMessages(prev => [...prev, { role: 'user', content: option }]);
    setExecutionPhase('finalizing');
    addClarifyChat(`Got it. Applying '**${option}**' logic. Finalizing the audit report...`);

    // After 2 seconds, show output
    setTimeout(() => {
      setExecutionPhase('done');
      setIsExecuting(false);
      setShowOutput(true);
    }, 2000);
  }

  /* ---- Generate pseudocode -------------------------------------------- */
  function generatePseudocode(): string {
    if (!workflow) return '-- No workflow loaded';
    const lines: string[] = [`-- ${workflow.name}`, `-- ${workflow.description}`, '', '-- Input Sources'];
    for (const inp of workflow.inputs) lines.push(`LOAD ${inp.name} AS ${inp.id}  -- ${inp.type.toUpperCase()}: ${inp.description}`);
    lines.push('');
    for (const step of workflow.steps) {
      lines.push(`-- Step: ${step.name} [${step.type.toUpperCase()}]`, `-- ${step.description}`);
      if (step.dataFiles?.length) lines.push(`USING ${step.dataFiles.join(', ')}`);
      if (step.columnMappings?.length) { lines.push('BEGIN'); for (const cm of step.columnMappings) lines.push(`  MAP "${cm.from}" -> "${cm.to}"${cm.description ? `  -- ${cm.description}` : ''}`); lines.push('END'); }
      if (step.subSteps?.length) for (const ss of step.subSteps) lines.push(`  -- ${ss}`);
      lines.push('');
    }
    lines.push('-- Output', `EMIT ${workflow.output.type.toUpperCase()} AS "${workflow.output.title}"`);
    if (workflow.output.fields?.length) for (const f of workflow.output.fields) lines.push(`  FIELD "${f.name}" : ${f.type}  -- ${f.description}`);
    return lines.join('\n');
  }

  /* ---- Helper: Demo file mapping data --------------------------------- */
  const DEMO_FILES: Record<string, { file: string; confidence: string }> = {
    'Invoice Data': { file: 'invoice_terminal_charges_2024.csv', confidence: 'high' },
    'MTOW Master': { file: 'aircraft_mtow_registry.csv', confidence: 'high' },
    'IoCC Flight Data': { file: 'iocc_flight_operations_q4.csv', confidence: 'high' },
    'Rate Master (YYZ)': { file: 'yyz_rate_schedule_2024.csv', confidence: 'high' },
    'Airline Operator Registry': { file: 'airline_operators_master.csv', confidence: 'medium' },
    'Currency Exchange Rates': { file: 'fx_rates_daily_2024.csv', confidence: 'medium' },
    'Historical Audit Log': { file: 'prior_audit_findings.csv', confidence: 'medium' },
  };

  /* ==================================================================== */
  /* RENDER                                                                */
  /* ==================================================================== */
  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">

      {/* -- Header -- */}
      <header className="flex items-center h-12 px-4 border-b border-gray-100 bg-white z-50 flex-shrink-0 gap-3">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-700 transition-all duration-200">
          <Link href="/"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div className="min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate max-w-[220px]">{workflow?.name ?? 'New Workflow'}</div>
          <div className="text-[11px] text-gray-400">{lastSavedText ?? 'Not saved yet'}</div>
        </div>
        <div className="flex-1" />
        {isDemo && <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-600 border-amber-200/60 px-1.5 py-0.5">Demo</Badge>}
        <Button variant="outline" size="sm" onClick={handleSave} disabled={!workflow || isSaving || !!savedId} className="transition-all duration-200 border-gray-200 text-gray-600 hover:border-gray-300 h-8">
          <Save className="w-3.5 h-3.5 mr-1.5" /> {isSaving ? 'Saving...' : savedId ? 'Saved' : 'Save'}
        </Button>
        <Button size="sm" className={cn('text-white transition-all duration-200 h-8', isExecuting ? 'bg-amber-500 hover:bg-amber-600' : 'bg-gray-900 hover:bg-gray-700')}
          disabled={isExecuting}
          onClick={() => { if (activeFlowStep === 4 && !showOutput) handleRunWorkflow(); }}>
          {isExecuting ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Executing...</> : <><Play className="w-3.5 h-3.5 mr-1.5" /> Test Run</>}
        </Button>
      </header>

      {/* -- Body: left rail + 3 panels -- */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* === STEP RAIL === */}
        <nav className="sidebar-dark flex flex-col items-center w-[56px] flex-shrink-0 bg-[#0b0b12] border-r border-white/[0.06] py-6 gap-0">
          {VSTEPS.map((step, idx) => {
            const completed = isStepCompleted(step.num);
            const active = activeFlowStep === step.num;
            return (
              <div key={step.num} className="flex flex-col items-center">
                <button
                  onClick={() => { if (!showOutput) setActiveFlowStep(step.num); }}
                  title={step.title}
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-200 focus:outline-none',
                    completed
                      ? 'bg-emerald-500 text-white'
                      : active
                      ? 'bg-violet-600 text-white ring-2 ring-violet-400/30 ring-offset-1 ring-offset-[#0b0b12]'
                      : 'bg-white/5 text-gray-500 border border-white/10 hover:bg-white/10 hover:text-gray-300'
                  )}
                >
                  {completed ? <Check className="w-3.5 h-3.5" /> : step.num}
                </button>
                {idx < VSTEPS.length - 1 && (
                  <div className={cn('w-px h-6 my-1', completed ? 'bg-emerald-500/40' : 'bg-white/[0.06]')} />
                )}
              </div>
            );
          })}
        </nav>

        {/* === LEFT PANEL: Chat === */}
        <aside className="flex flex-col w-[30%] flex-shrink-0 border-r border-gray-100 bg-white">
          {/* AI Assistant header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 flex-shrink-0">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500/20 to-blue-500/10 flex items-center justify-center ring-1 ring-violet-200/50">
              <Sparkles className="w-3.5 h-3.5 text-violet-600" />
            </div>
            <span className="text-sm font-medium text-gray-800">AI Assistant</span>
            {isDemo && <Badge variant="secondary" className="ml-auto text-[10px] bg-amber-50 text-amber-600 border-amber-200/60 px-1.5 py-0.5">Example</Badge>}
          </div>

          {/* Chat messages */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="space-y-2">
                  {isDemo && (
                    <div className="bg-violet-50/60 border border-violet-100 rounded-xl p-3 text-xs text-violet-700 leading-relaxed">
                      <p className="font-medium mb-1">Example loaded</p>
                      <p className="text-violet-600/80">Click any step to see its data files and column mappings.</p>
                    </div>
                  )}
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs text-gray-500 leading-relaxed">
                    Describe your workflow in plain English
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((m, i) => (
                    <div key={i} className={cn('flex gap-2 message-enter', m.role === 'user' ? 'flex-row-reverse' : '')}>
                      <div className={cn(
                        'w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-semibold mt-0.5',
                        m.role === 'user'
                          ? 'bg-gray-900 text-white'
                          : 'bg-gradient-to-br from-violet-500 to-blue-500 text-white'
                      )}>
                        {m.role === 'user' ? 'U' : 'AI'}
                      </div>
                      <div className={cn(
                        'max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed',
                        m.role === 'user'
                          ? 'bg-gray-900 text-white rounded-tr-sm'
                          : 'bg-gray-50 text-gray-700 rounded-tl-sm border border-gray-100'
                      )}
                        dangerouslySetInnerHTML={{ __html: m.content.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-violet-600">$1</strong>') }}
                      />
                    </div>
                  ))}

                  {/* Auto-fill buttons */}
                  {workflow && activeFlowStep === 2 && uploadedFiles.length === 0 && messages.length > 0 && !isLoading && (
                    <div className="flex gap-2 mt-2">
                      <button onClick={autoFillSampleFiles} className="flex-1 text-xs bg-violet-50 text-violet-700 border border-violet-200/70 rounded-lg px-3 py-2 hover:bg-violet-100 transition-all duration-200 font-medium">
                        Auto-fill sample files
                      </button>
                      <button onClick={() => fileInputRef.current?.click()} className="flex-1 text-xs bg-gray-50 text-gray-600 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-100 transition-all duration-200 font-medium">
                        I'll upload them myself
                      </button>
                      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e => { if (e.target.files) handleFilesSelected(e.target.files); }} />
                    </div>
                  )}

                  {/* Clarify options during execution */}
                  {executionPhase === 'clarify' && !selectedClarifyOption && (
                    <div className="space-y-1.5 mt-2">
                      {['Use the maximum weight', 'Use the average weight', 'Flag for manual review'].map(opt => (
                        <button key={opt} onClick={() => handleClarifyOptionClick(opt)}
                          className="w-full text-xs bg-white text-gray-700 border border-gray-200 rounded-lg px-3 py-2 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 transition-all duration-200 font-medium text-left">
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Typing indicator — skeleton style */}
                  {(isLoading || executionPhase === 'running' || executionPhase === 'finalizing') && (
                    <div className="flex gap-2">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex-shrink-0 flex items-center justify-center text-[9px] font-semibold text-white mt-0.5">AI</div>
                      <div className="bg-gray-50 border border-gray-100 rounded-xl rounded-tl-sm px-3 py-2.5 flex items-center gap-1">
                        <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </>
              )}
            </div>
          </ScrollArea>

          {/* Chat input */}
          <div className="p-3 border-t border-gray-100 flex-shrink-0">
            <div className="flex gap-1.5 items-end">
              <Textarea value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Describe what you need…" rows={2}
                className="flex-1 resize-none text-xs rounded-xl px-3 py-2 border-gray-200 focus:border-violet-300 transition-all duration-200" />
              <Button onClick={() => sendMessage()} disabled={!input.trim() || isLoading} size="icon" className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-9 w-9 transition-all duration-200">
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">Try: &ldquo;Add validation step&rdquo; or &ldquo;Change output to table&rdquo;</p>
          </div>
        </aside>

        {/* === CENTER PANEL === */}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden bg-gradient-to-br from-slate-50 via-white to-violet-50/20">

          {/* Output top navigation bar when showing output */}
          {showOutput && (
            <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-100 bg-white flex-shrink-0">
              {(['editor', 'output', 'analytics', 'manager'] as const).map(tab => (
                <button key={tab} onClick={() => {
                  if (tab === 'editor') {
                    // Exit output view and go back to Map Data step for editing
                    setShowOutput(false);
                    setExecutionPhase('idle');
                    setIsExecuting(false);
                    setSelectedClarifyOption(null);
                    setClarifyPhase('need_mapping');
                    setActiveFlowStep(3);
                    addUserChat('Edit Workflow');
                    addClarifyChat('You\'re back in the editor. You can modify file mappings, column alignments, or adjust the workflow steps. Click **Review & Run** when you\'re ready to re-run.');
                  } else {
                    setOutputTab(tab);
                  }
                }}
                  className={cn('px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 capitalize',
                    tab === 'editor' ? (showOutput ? 'text-gray-400 hover:bg-gray-50 hover:text-gray-700' : 'bg-violet-50 text-violet-700') :
                    outputTab === tab ? 'bg-violet-50 text-violet-700' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-700'
                  )}>
                  {tab}
                </button>
              ))}
            </div>
          )}

          <ScrollArea className="flex-1">
            <div className="p-6">

              {/* ======== OUTPUT VIEW ======== */}
              {showOutput ? (
                <div>
                  {/* Output header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-violet-700" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">{workflow?.name ?? 'Workflow'}</h2>
                        <div className="flex items-center gap-3 mt-0.5">
                          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> RUN SUCCESSFUL
                          </Badge>
                          <span className="text-xs text-slate-400">RUN ID: RWF-4401-B</span>
                          <span className="text-xs text-slate-400">28.345 840</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8"><Download className="w-4 h-4 text-slate-400" /></Button>
                      <Button size="sm" className="bg-violet-700 hover:bg-violet-800 text-white">
                        <Download className="w-3.5 h-3.5 mr-1.5" /> Export Report
                      </Button>
                    </div>
                  </div>

                  {/* Executive Summary */}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Invoices</p>
                      <div className="flex items-end gap-2">
                        <span className="text-2xl font-bold text-slate-900">1,129</span>
                        <Badge className="bg-emerald-50 text-emerald-600 border-0 text-[10px] mb-1">+13%</Badge>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Critical Flags</p>
                      <div className="flex items-end gap-2">
                        <span className="text-2xl font-bold text-rose-600">3</span>
                        <Badge className="bg-rose-50 text-rose-600 border-0 text-[10px] mb-1">+2</Badge>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Audit Accuracy</p>
                      <div className="flex items-end gap-2">
                        <span className="text-2xl font-bold text-emerald-600">99.4%</span>
                        <Badge className="bg-emerald-50 text-emerald-600 border-0 text-[10px] mb-1">+8.2%</Badge>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Potential Savings</p>
                      <div className="flex items-end gap-2">
                        <span className="text-2xl font-bold text-slate-900">$42.5k</span>
                        <Badge className="bg-violet-50 text-violet-700 border-0 text-[10px] mb-1">New</Badge>
                      </div>
                    </div>
                  </div>

                  {/* AI Summary */}
                  <div className="bg-gradient-to-br from-violet-50/70 to-blue-50/40 border border-violet-100 rounded-xl p-5 mb-6">
                    <Badge className="bg-violet-100 text-violet-700 border-0 text-[10px] font-bold mb-3">
                      <Sparkles className="w-3 h-3 mr-1" /> AI SUMMARY
                    </Badge>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      Scanned <strong className="text-violet-700">12,450 invoices</strong> against 6-month history.
                      Identified <strong className="text-violet-700">8 potential duplicates</strong> totaling <strong className="text-violet-700">{'\u20B9'}6.10L at risk</strong>.
                      Highest confidence match: INV-4521 vs INV-3102 (Acme Corp, 96% match).
                      <strong className="text-violet-700"> 3 invoices</strong> from the same vendor within 48 hours flagged as suspicious.
                      False positive rate: 4.2% (down from 6.5% last run).
                      Recommend immediate review of the 3 critical-severity flags before next payment batch.
                    </p>
                  </div>

                  {/* Key Observations & Insights */}
                  <div className="mb-6">
                    <h3 className="text-base font-bold text-slate-900 mb-4">Key Observations & Insights</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                            <Sparkles className="w-3.5 h-3.5 text-violet-700" />
                          </div>
                          <p className="text-xs font-bold text-slate-700">Duplicate Detection</p>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed mb-2">
                          <strong className="text-violet-700">8 potential duplicates</strong> identified across 3 vendors. Highest confidence pair: INV-4521 vs INV-3102 (Acme Corp) with 96% field similarity.
                        </p>
                        <Badge className="bg-rose-50 text-rose-600 border-0 text-[10px] font-bold">High Priority</Badge>
                      </div>
                      <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                          </div>
                          <p className="text-xs font-bold text-slate-700">MTOW Weight Discrepancies</p>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed mb-2">
                          <strong className="text-violet-700">12 invoices</strong> show MTOW values exceeding the certified maximum by &gt;5%. Average overcharge per invoice: <strong className="text-violet-700">$3,847</strong>.
                        </p>
                        <Badge className="bg-amber-50 text-amber-600 border-0 text-[10px] font-bold">Medium Priority</Badge>
                      </div>
                      <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <BarChart3 className="w-3.5 h-3.5 text-emerald-700" />
                          </div>
                          <p className="text-xs font-bold text-slate-700">Rate Compliance</p>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed mb-2">
                          <strong className="text-violet-700">97.3%</strong> of terminal charges align with the YYZ Rate Master. Remaining 2.7% used outdated rate tiers from Q2 2024.
                        </p>
                        <Badge className="bg-emerald-50 text-emerald-600 border-0 text-[10px] font-bold">On Track</Badge>
                      </div>
                      <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Search className="w-3.5 h-3.5 text-blue-700" />
                          </div>
                          <p className="text-xs font-bold text-slate-700">Vendor Concentration Risk</p>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed mb-2">
                          <strong className="text-violet-700">68%</strong> of flagged invoices originate from 2 vendors (Acme Corp, GlobalFlight). Suggests targeted vendor auditing may yield higher returns.
                        </p>
                        <Badge className="bg-blue-50 text-blue-600 border-0 text-[10px] font-bold">Insight</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Anomaly / Outlier Report */}
                  <div className="mb-6">
                    <h3 className="text-base font-bold text-slate-900 mb-4">Anomaly & Outlier Report</h3>
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <div className="grid grid-cols-7 gap-3 px-5 py-2.5 bg-slate-50 border-b border-slate-200">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Invoice ID</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Type</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vendor</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Expected</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Actual</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Deviation</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Severity</p>
                      </div>
                      {[
                        { id: 'INV-4521', type: 'Duplicate', vendor: 'Acme Corp', expected: '$12,400', actual: '$12,400', deviation: '100%', severity: 'critical' },
                        { id: 'INV-3890', type: 'MTOW Outlier', vendor: 'GlobalFlight', expected: '156,000 kg', actual: '198,500 kg', deviation: '+27.2%', severity: 'critical' },
                        { id: 'INV-2917', type: 'Rate Mismatch', vendor: 'AirConnect', expected: '$8,200', actual: '$11,340', deviation: '+38.3%', severity: 'critical' },
                        { id: 'INV-5102', type: 'MTOW Outlier', vendor: 'Acme Corp', expected: '142,000 kg', actual: '165,800 kg', deviation: '+16.8%', severity: 'warning' },
                        { id: 'INV-3204', type: 'Timing', vendor: 'SkyPartners', expected: '>48h gap', actual: '4h gap', deviation: 'Suspicious', severity: 'warning' },
                        { id: 'INV-4788', type: 'Rate Mismatch', vendor: 'GlobalFlight', expected: '$6,150', actual: '$7,820', deviation: '+27.2%', severity: 'warning' },
                        { id: 'INV-1056', type: 'MTOW Outlier', vendor: 'JetFreight', expected: '89,000 kg', actual: '94,200 kg', deviation: '+5.8%', severity: 'info' },
                      ].map(row => (
                        <div key={row.id} className="grid grid-cols-7 gap-3 px-5 py-3 border-b border-slate-100 last:border-0 items-center">
                          <span className="text-sm font-medium text-slate-700">{row.id}</span>
                          <Badge className={cn('text-[10px] font-bold border-0 w-fit',
                            row.type === 'Duplicate' ? 'bg-rose-50 text-rose-600' :
                            row.type === 'MTOW Outlier' ? 'bg-amber-50 text-amber-600' :
                            row.type === 'Rate Mismatch' ? 'bg-violet-50 text-violet-600' :
                            'bg-blue-50 text-blue-600'
                          )}>{row.type}</Badge>
                          <span className="text-sm text-slate-600">{row.vendor}</span>
                          <span className="text-sm text-slate-500">{row.expected}</span>
                          <span className="text-sm font-medium text-slate-800">{row.actual}</span>
                          <span className={cn('text-sm font-semibold',
                            row.severity === 'critical' ? 'text-rose-600' :
                            row.severity === 'warning' ? 'text-amber-600' : 'text-blue-600'
                          )}>{row.deviation}</span>
                          <Badge className={cn('text-[10px] font-bold border-0 w-fit',
                            row.severity === 'critical' ? 'bg-rose-50 text-rose-600' :
                            row.severity === 'warning' ? 'bg-amber-50 text-amber-600' :
                            'bg-blue-50 text-blue-600'
                          )}>{row.severity.toUpperCase()}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Suggested Follow-ups */}
                  <div className="mb-6">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Suggested Follow-ups</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'Show me only excess charges above $5,000',
                        "Compare with last month's audit",
                        'Export flagged items to Jira',
                        'Explain the MTOW calculation logic',
                      ].map(s => (
                        <button key={s} className="text-xs bg-white border border-gray-200 rounded-full px-4 py-2 text-gray-600 hover:bg-violet-50 hover:text-violet-700 hover:border-violet-200 transition-all duration-150">
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Audit Report - Charts */}
                  <div className="mb-6">
                    <h3 className="text-base font-bold text-slate-900 mb-4">Audit Report</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Bar chart */}
                      <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Charges by Airline</p>
                        <div className="flex items-end gap-3 h-40">
                          {BAR_CHART_DATA.map(d => (
                            <div key={d.airline} className="flex-1 flex flex-col items-center gap-1">
                              <div className={cn('w-full rounded-t-md transition-all', d.color)} style={{ height: `${d.value}%` }} />
                              <span className="text-[9px] text-slate-400 text-center leading-tight">{d.airline}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Donut chart placeholder */}
                      <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Flag Distribution</p>
                        <div className="flex items-center gap-6">
                          {/* Simple CSS donut */}
                          <div className="relative w-28 h-28 flex-shrink-0">
                            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                              <circle cx="18" cy="18" r="14" fill="none" stroke="#f43f5e" strokeWidth="4" strokeDasharray="28.27 62.83" strokeDashoffset="0" />
                              <circle cx="18" cy="18" r="14" fill="none" stroke="#f59e0b" strokeWidth="4" strokeDasharray="15.71 62.83" strokeDashoffset="-28.27" />
                              <circle cx="18" cy="18" r="14" fill="none" stroke="#6366f1" strokeWidth="4" strokeDasharray="18.85 62.83" strokeDashoffset="-43.98" />
                            </svg>
                          </div>
                          <div className="space-y-2">
                            {DONUT_DATA.map(d => (
                              <div key={d.label} className="flex items-center gap-2">
                                <div className={cn('w-3 h-3 rounded-sm', d.color)} />
                                <span className="text-xs text-slate-600">{d.label}</span>
                                <span className="text-xs font-bold text-slate-800 ml-auto">{d.pct}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Full Audit Data Table */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-bold text-slate-900">Full Audit Data</h3>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5">
                          <Search className="w-3.5 h-3.5 text-slate-400" />
                          <input type="text" placeholder="Search invoices..." className="text-xs bg-transparent outline-none w-36" />
                        </div>
                        <Button variant="outline" size="sm" className="text-xs">
                          <Filter className="w-3.5 h-3.5 mr-1.5" /> Filter
                        </Button>
                        <span className="text-xs text-slate-400">Showing 5 of 1,129 records</span>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <div className="grid grid-cols-6 gap-4 px-5 py-2.5 bg-gray-50 border-b border-gray-100">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Invoice ID</p>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Date</p>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Vendor</p>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Amount</p>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Status</p>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Reason</p>
                      </div>
                      {AUDIT_TABLE_DATA.map(row => (
                        <div key={row.id} className="grid grid-cols-6 gap-4 px-5 py-3 border-b border-gray-100 last:border-0 items-center">
                          <span className="text-sm font-medium text-slate-700">{row.id}</span>
                          <span className="text-sm text-slate-500">{row.date}</span>
                          <span className="text-sm text-slate-700">{row.vendor}</span>
                          <span className="text-sm font-medium text-slate-800">{row.amount}</span>
                          <Badge className={cn('text-[10px] font-bold border-0 w-fit',
                            row.status === 'FLAGGED' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                          )}>
                            {row.status}
                          </Badge>
                          <span className="text-sm text-slate-500">{row.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* ======== Step 1: Write prompt ======== */}
                  {activeFlowStep === 1 && (
                    <div className="flex flex-col items-center justify-center py-20">
                      <Pencil className="w-12 h-12 text-slate-300 mb-4" strokeWidth={1.5} />
                      <h3 className="text-lg font-bold text-slate-900 mb-2">Describe your workflow</h3>
                      <p className="text-sm text-slate-500 mb-4 text-center max-w-md">Use the chat on the left to describe what you need, and Ira will build the workflow for you.</p>
                    </div>
                  )}

                  {/* ======== Step 2: Upload Files ======== */}
                  {activeFlowStep === 2 && workflow && (
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                          <Upload className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-slate-900">Upload Data Files</h2>
                          <p className="text-sm text-slate-500">Upload the files required for this workflow, then verify with Ira</p>
                        </div>
                      </div>

                      {/* Expected inputs */}
                      <div className="mt-6 mb-6">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Expected Inputs</Label>
                        <div className="grid grid-cols-2 gap-3">
                          {workflow.inputs.map(inp => (
                            <Card key={inp.id} className="rounded-xl border-slate-200 py-0">
                              <CardContent className="p-4 flex items-center gap-3">
                                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', FILE_BG[inp.type], FILE_TEXT[inp.type])}>
                                  <FileIcon type={inp.type} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-800 truncate">{inp.name}</p>
                                  <p className="text-xs text-slate-400">{inp.type.toUpperCase()} &middot; {inp.required ? 'Required' : 'Optional'}</p>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>

                      {/* Drop zone */}
                      <label
                        className="flex flex-col items-center justify-center p-10 bg-white border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:border-violet-400 hover:bg-violet-50/20 transition-all mb-4"
                        onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-violet-400', 'bg-violet-50/30'); }}
                        onDragLeave={e => { e.currentTarget.classList.remove('border-violet-400', 'bg-violet-50/30'); }}
                        onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('border-violet-400', 'bg-violet-50/30'); if (e.dataTransfer.files) handleFilesSelected(e.dataTransfer.files); }}
                      >
                        <Upload className="w-10 h-10 text-slate-300 mb-3" strokeWidth={1.5} />
                        <p className="text-sm font-medium text-slate-600">Drop files here or click to upload</p>
                        <p className="text-xs text-slate-400 mt-1">CSV, PDF, images -- any data files for this workflow</p>
                        <input type="file" multiple className="hidden" onChange={e => { if (e.target.files) handleFilesSelected(e.target.files); }} />
                      </label>

                      {/* Uploaded files as pills */}
                      {uploadedFiles.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {uploadedFiles.map((uf, i) => (
                            <div key={i} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
                              <Plus className="w-3.5 h-3.5 text-slate-400" />
                              <span className="text-xs font-medium text-slate-700">{uf.name}</span>
                              <button onClick={() => setUploadedFiles(prev => prev.filter((_, j) => j !== i))} className="ml-1">
                                <X className="w-3 h-3 text-slate-400 hover:text-red-500" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <Button
                        onClick={startClarification}
                        disabled={uploadedFiles.length === 0}
                        className={cn(
                          'w-full rounded-2xl h-14 text-base font-semibold mt-4 transition-all',
                          uploadedFiles.length > 0
                            ? 'bg-[#26064A] hover:bg-[#3a0d6e] text-white'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        )}
                      >
                        <Sparkles className="w-5 h-5 mr-2" /> Verify with Ira
                      </Button>

                      {/* Loading state */}
                      {isPhaseLoading(clarifyPhase) && (
                        <div className="flex flex-col items-center py-8">
                          <Loader2 className="w-8 h-8 text-violet-600 animate-spin mb-3" />
                          <p className="text-sm font-semibold text-slate-700">
                            {clarifyPhase === 'checking_files' && 'Checking file sufficiency...'}
                          </p>
                        </div>
                      )}

                      {/* Need files */}
                      {clarifyPhase === 'need_files' && (
                        <div className="mt-4">
                          <Alert className="border-amber-200 bg-amber-50">
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            <AlertTitle className="text-amber-800">Missing Files</AlertTitle>
                            <AlertDescription className="text-amber-700 text-xs">{clarifyMessage}</AlertDescription>
                          </Alert>
                          {fileMissing.map((m, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-red-100 mt-2">
                              <X className="w-4 h-4 text-red-400" />
                              <div><p className="text-sm font-semibold text-slate-700">{m.inputName}</p><p className="text-xs text-slate-400">{m.reason}</p></div>
                            </div>
                          ))}
                          <Button onClick={runFileSufficiencyCheck} className="mt-3 bg-violet-700 hover:bg-violet-800 text-white">Re-check</Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ======== Step 3: Map Data (combined file mapping + column alignment) ======== */}
                  {activeFlowStep === 3 && (
                    <div>
                      {/* Header */}
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                            <Link2 className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div>
                            <h2 className="text-lg font-bold text-slate-900">Data Mapping</h2>
                            <p className="text-sm text-slate-500">Map files and align columns in one unified step</p>
                          </div>
                        </div>
                        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium text-xs gap-1.5">
                          <Sparkles className="w-3 h-3" />
                          AI SUGGESTED MAPPINGS
                        </Badge>
                      </div>

                      {isPhaseLoading(clarifyPhase) && (
                        <div className="flex flex-col items-center py-12">
                          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
                          <p className="text-sm text-slate-600">Mapping files and columns...</p>
                        </div>
                      )}

                      {(clarifyPhase === 'need_mapping' || clarifyPhase === 'need_columns' || (clarifyPhase !== 'checking_mapping' && clarifyPhase !== 'checking_columns' && workflow)) && (
                        <div>
                          {/* Combined mapping cards for each expected input */}
                          <div className="space-y-6 mb-6">
                            {(workflow?.inputs ?? []).map((inp, inputIdx) => {
                              const apiMatch = fileMappings.find(fm => fm.inputName === inp.name || fm.inputId === inp.id);
                              const mappedFileName = apiMatch?.fileName ?? DEMO_FILES[inp.name]?.file ?? inp.name.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_sample.csv';
                              const confidence = apiMatch?.confidence ?? DEMO_FILES[inp.name]?.confidence ?? 'high';
                              const rawMatchPct = confidence === 'high' ? 90 + (inputIdx * 3 % 10) : 65 + (inputIdx * 7 % 25);
                              const matchDisplay = rawMatchPct >= 90 ? { pct: 100, label: '100% MATCH', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
                                : rawMatchPct >= 70 ? { pct: rawMatchPct, label: `${rawMatchPct}% MATCH`, bg: 'bg-amber-50 text-amber-700 border-amber-200' }
                                : { pct: rawMatchPct, label: `${rawMatchPct}% MATCH`, bg: 'bg-red-50 text-red-600 border-red-200' };
                              const columns = inp.columns ?? ['col1', 'col2', 'col3', 'col4'];
                              const visibleCols = columns.slice(0, 4);

                              const expanded = expandedSchemas[inp.id] ?? (inputIdx === 0);

                              return (
                                <div key={inp.id} className="bg-white rounded-2xl border border-slate-200">
                                  {/* A) File Mapping header — clickable to expand/collapse */}
                                  <div
                                    className="p-5 cursor-pointer hover:bg-slate-50/50 transition-colors"
                                    onClick={() => toggleSchemaExpanded(inp.id)}
                                  >
                                    <div className="flex items-start justify-between gap-6">
                                      {/* Left: Expected Schema */}
                                      <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className={cn(
                                          'w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-transform',
                                          expanded ? 'rotate-0' : '-rotate-90'
                                        )}>
                                          <ChevronDown className="w-4 h-4 text-slate-400" />
                                        </div>
                                        <div>
                                          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Expected Schema</Label>
                                          <p className="text-sm font-semibold text-slate-800">{inp.name}</p>
                                          <p className="text-xs text-slate-400 mt-0.5">{inp.description}</p>
                                        </div>
                                      </div>

                                      {/* Right: Mapped Source */}
                                      <div className="flex-1 min-w-0 text-right" onClick={e => e.stopPropagation()}>
                                        <div className="flex items-center justify-end gap-2 mb-1.5">
                                          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mapped Source</Label>
                                          <Badge className={cn('border text-[10px] font-bold px-1.5 py-0', matchDisplay.bg)}>
                                            <Plus className="w-2.5 h-2.5 mr-0.5" />
                                            {matchDisplay.label}
                                          </Badge>
                                        </div>
                                        <div className="flex items-center justify-end gap-2">
                                          <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 font-medium truncate">
                                            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            {mappedFileName}
                                          </span>
                                          <button className="text-xs text-violet-700 hover:text-violet-800 font-medium whitespace-nowrap">Change</button>
                                          <button className="text-xs text-slate-400 hover:text-slate-600 font-medium whitespace-nowrap">
                                            <RefreshCw className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>

                                      {/* Status indicator */}
                                      {rawMatchPct >= 90 ? (
                                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                          <Check className="w-4 h-4 text-emerald-600" />
                                        </div>
                                      ) : rawMatchPct >= 70 ? (
                                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                                        </div>
                                      ) : (
                                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                                          <X className="w-4 h-4 text-red-500" />
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* B) Inline Column Alignment — collapsible */}
                                  {expanded && <div className="p-5 border-t border-slate-100">
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center gap-2">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Column Alignment</p>
                                      </div>
                                      <span className="text-xs text-slate-500">{visibleCols.length} / {visibleCols.length} Fields</span>
                                    </div>

                                    {/* Column table */}
                                    <div className="bg-slate-50 rounded-xl border border-slate-100">
                                      <div className="grid grid-cols-4 gap-4 px-4 py-2 border-b border-slate-200">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Source Column</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Mapping</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target Schema</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Confidence</p>
                                      </div>
                                      {visibleCols.map((col, j) => {
                                        const shortCode = col.substring(0, 2).toUpperCase();
                                        const targetName = col.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()).replace(/ /g, '');
                                        const targetType = col.includes('date') ? 'TIMESTAMP' : col.includes('amount') || col.includes('mtow') || col.includes('rate') ? 'DECIMAL' : 'STRING';
                                        const confPct = j === 0 ? 96 : j === 1 ? 78 : j === 2 ? 93 : 62 + (j * 11 % 30);
                                        const colMatchDisplay = confPct >= 90 ? { label: '100% MATCH', bg: 'bg-emerald-50 text-emerald-600 border-emerald-200' }
                                          : confPct >= 70 ? { label: `${confPct}% MATCH`, bg: 'bg-amber-50 text-amber-600 border-amber-200' }
                                          : { label: `${confPct}% MATCH`, bg: 'bg-red-50 text-red-500 border-red-200' };
                                        const key = `${inp.id}:${col}`;

                                        // Parameter breakdown: confidence = (name_sim × 0.35) + (type_compat × 0.25) + (stat_profile × 0.20) + (semantic_sim × 0.20)
                                        const nameSimScore = confPct >= 90 ? 90 + (j * 3 % 10) : confPct >= 70 ? 55 + (j * 13 % 25) : 25 + (j * 9 % 20);
                                        const typeCompatScore = confPct >= 90 ? 92 + (j * 5 % 8) : confPct >= 70 ? 85 + (j * 7 % 12) : 45 + (j * 11 % 25);
                                        const statProfileScore = confPct >= 90 ? 88 + (j * 7 % 12) : confPct >= 70 ? 70 + (j * 9 % 18) : 35 + (j * 7 % 20);
                                        const semanticSimScore = confPct >= 90 ? 85 + (j * 9 % 15) : confPct >= 70 ? 60 + (j * 11 % 20) : 20 + (j * 13 % 25);
                                        const paramBars = [
                                          { label: 'Name Similarity', score: nameSimScore, weight: '35%', desc: 'Fuzzy string matching & token comparison' },
                                          { label: 'Type Compatibility', score: typeCompatScore, weight: '25%', desc: 'Data type inference & format alignment' },
                                          { label: 'Statistical Profile', score: statProfileScore, weight: '20%', desc: 'Value distribution, cardinality & null ratio' },
                                          { label: 'Semantic Similarity', score: semanticSimScore, weight: '20%', desc: 'Embedding-based meaning comparison' },
                                        ];
                                        const justification = confPct >= 90
                                          ? `Strong match — field names share common terminology and data patterns are consistent across sample rows.`
                                          : confPct >= 70
                                          ? `Partial match — field names share some overlap but data patterns show divergence. Review recommended.`
                                          : `Low confidence — name similarity is weak and patterns are inconsistent. Manual selection required.`;

                                        return (
                                          <div key={j} className="grid grid-cols-4 gap-4 px-4 py-3 border-b border-slate-100 last:border-0 items-center">
                                            {/* Source column */}
                                            <div className="flex items-center gap-2">
                                              <span className="w-6 h-6 rounded-md bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-500 flex-shrink-0">{shortCode}</span>
                                              <span className="text-xs font-medium text-slate-700">{col}</span>
                                            </div>

                                            {/* Arrow */}
                                            <div className="flex justify-center">
                                              <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                                            </div>

                                            {/* Target schema (clickable dropdown) */}
                                            <div>
                                              <Select
                                                value={confPct < 70 && !manualColMappings[key] ? '' : (manualColMappings[key] ?? targetName)}
                                                onValueChange={v => setManualColMappings(prev => ({ ...prev, [key]: v }))}
                                              >
                                                <SelectTrigger className="h-auto border-0 shadow-none p-0 gap-1 focus:ring-0 [&>svg]:text-slate-400">
                                                  <div className="text-left">
                                                    {confPct < 70 && !manualColMappings[key] ? (
                                                      <p className="text-xs font-medium text-red-400 italic">Select mapping...</p>
                                                    ) : (
                                                      <>
                                                        <p className="text-xs font-semibold text-violet-700">{manualColMappings[key] ?? targetName}</p>
                                                        <p className="text-[9px] text-slate-400 uppercase">{targetType}</p>
                                                      </>
                                                    )}
                                                  </div>
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value={targetName}>{targetName}</SelectItem>
                                                  {uploadedFiles.flatMap(f => f.headers ?? []).filter((h, i, arr) => arr.indexOf(h) === i && h !== targetName).map(h => (
                                                    <SelectItem key={h} value={h}>{h}</SelectItem>
                                                  ))}
                                                  {uploadedFiles.length === 0 && (
                                                    <SelectItem value="__other">Other...</SelectItem>
                                                  )}
                                                </SelectContent>
                                              </Select>
                                            </div>

                                            {/* Confidence */}
                                            <div className="flex items-center justify-end gap-1.5 relative">
                                              <Badge className={cn('border text-[10px] font-bold px-2 py-0', colMatchDisplay.bg)}>
                                                {colMatchDisplay.label}
                                              </Badge>
                                              <button
                                                onClick={e => { e.stopPropagation(); setOpenJustification(openJustification === key ? null : key); }}
                                              >
                                                <Info className={cn('w-3.5 h-3.5 cursor-pointer transition-colors', openJustification === key ? 'text-violet-600' : 'text-slate-300 hover:text-slate-500')} />
                                              </button>
                                              {openJustification === key && (<>
                                                {/* Backdrop to close on outside click */}
                                                <div className="fixed inset-0 z-[99]" onClick={e => { e.stopPropagation(); setOpenJustification(null); }} />
                                                <div className="absolute right-0 top-7 z-[100] w-80 bg-white rounded-xl border border-slate-200 shadow-2xl p-4" onClick={e => e.stopPropagation()}>
                                                  <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-1.5">
                                                      <Sparkles className="w-3 h-3 text-violet-600" />
                                                      <p className="text-[10px] font-bold text-violet-700 uppercase tracking-wider">AI Justification</p>
                                                    </div>
                                                    <button onClick={() => setOpenJustification(null)} className="text-slate-400 hover:text-slate-600">
                                                      <X className="w-3 h-3" />
                                                    </button>
                                                  </div>

                                                  {/* Parameter breakdown bars */}
                                                  <div className="space-y-3 mb-3">
                                                    {paramBars.map(p => (
                                                      <div key={p.label}>
                                                        <div className="flex items-center justify-between mb-1">
                                                          <div className="flex items-center gap-1.5">
                                                            <span className="text-xs font-semibold text-slate-700">{p.label}</span>
                                                            <span className="text-[9px] text-slate-400">×{p.weight}</span>
                                                          </div>
                                                          <span className={cn('text-xs font-bold',
                                                            p.score >= 90 ? 'text-emerald-600' : p.score >= 70 ? 'text-amber-600' : 'text-red-500'
                                                          )}>{p.score}%</span>
                                                        </div>
                                                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                                          <div
                                                            className={cn('h-full rounded-full transition-all',
                                                              p.score >= 90 ? 'bg-[#6A12CD]' : p.score >= 70 ? 'bg-amber-500' : 'bg-red-500'
                                                            )}
                                                            style={{ width: `${p.score}%` }}
                                                          />
                                                        </div>
                                                        <p className="text-[9px] text-slate-400 mt-0.5">{p.desc}</p>
                                                      </div>
                                                    ))}
                                                  </div>

                                                  {/* Summary */}
                                                  <div className="pt-3 border-t border-slate-100">
                                                    <p className="text-[11px] text-slate-500 leading-relaxed mb-2">{justification}</p>
                                                    <div className="flex items-center gap-2">
                                                      <Badge className={cn('border text-[9px] font-bold px-1.5 py-0', colMatchDisplay.bg)}>
                                                        Overall: {confPct}%
                                                      </Badge>
                                                      <span className="text-[10px] text-slate-400">{col} → {targetName}</span>
                                                    </div>
                                                  </div>
                                                </div>
                                              </>)}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>}
                                </div>
                              );
                            })}
                          </div>

                          {/* Ambiguous Files */}
                          {ambiguousFiles.length > 0 && (
                            <div className="space-y-4 mb-6">
                              {ambiguousFiles.map((a, i) => (
                                <div key={i} className="bg-amber-50/60 rounded-2xl border border-amber-200 p-5">
                                  <div className="flex items-start justify-between gap-6">
                                    <div className="flex-1 min-w-0">
                                      <Label className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1.5 block">Needs Your Input</Label>
                                      <p className="text-sm font-semibold text-slate-800">{a.fileName}</p>
                                      <p className="text-xs text-slate-400 mt-0.5">{a.reason}</p>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block text-right">Select Target</Label>
                                      <div className="flex flex-wrap gap-2 justify-end">
                                        {a.possibleInputs.map(inputId => (
                                          <Button key={inputId} variant={manualMappings[a.fileName] === inputId ? 'default' : 'outline'} size="sm"
                                            className={cn('text-xs rounded-lg', manualMappings[a.fileName] === inputId && 'bg-violet-700 hover:bg-violet-800')}
                                            onClick={() => setManualMappings(prev => ({ ...prev, [a.fileName]: inputId }))}>
                                            {workflow?.inputs.find(inp => inp.id === inputId)?.name ?? inputId}
                                          </Button>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Footer */}
                          <div className="border-t border-slate-200 pt-4">
                            <p className="flex items-center gap-2 text-xs text-slate-400 mb-4">
                              <AlertTriangle className="w-3.5 h-3.5 text-slate-300" />
                              Review each mapping carefully before proceeding to final review
                            </p>
                            <Button onClick={() => {
                              if (clarifyPhase === 'need_mapping') {
                                confirmManualMappings();
                              } else if (clarifyPhase === 'need_columns') {
                                confirmManualColumns();
                              } else {
                                confirmManualColumns();
                              }
                            }}
                              disabled={clarifyPhase === 'need_mapping' && ambiguousFiles.some(a => !manualMappings[a.fileName])}
                              className="bg-[#26064A] hover:bg-[#3a0d6e] text-white w-full rounded-xl h-11 text-sm font-semibold">
                              Confirm & Proceed
                              <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ======== Step 4: Review & Execute ======== */}
                  {activeFlowStep === 4 && (
                    <div>
                      {/* Header */}
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                            <Play className="w-5 h-5 text-violet-700" />
                          </div>
                          <div>
                            <h2 className="text-lg font-bold text-slate-900">Review & Execute</h2>
                            <p className="text-sm text-slate-500">Review the query execution plan and data lineage</p>
                          </div>
                        </div>
                        <Button onClick={handleRunWorkflow} disabled={isExecuting || showOutput}
                          className="bg-violet-700 hover:bg-violet-800 text-white px-6">
                          {isExecuting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Running...</> : <><Play className="w-4 h-4 mr-2" /> Run Workflow</>}
                        </Button>
                      </div>

                      {/* Workflow steps as expanded cards */}
                      <div className="space-y-4">
                        {workflow?.steps.map((step, idx) => {
                          const cfg = STC[step.type] ?? STC.analyze;
                          const badge = STEP_BADGE[step.type] ?? STEP_BADGE.analyze;
                          const inputNames = (step.dataFiles ?? []).map(df => {
                            const found = workflow.inputs.find(inp => inp.id === df);
                            return found?.name ?? df;
                          });

                          return (
                            <div key={step.id} className="bg-white rounded-xl border border-slate-200 p-5">
                              <div className="flex items-start gap-4">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white bg-[#26064A]">
                                  {idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="text-sm font-bold text-slate-900">{step.name}</h4>
                                    <Badge className={cn('text-[9px] font-bold border-0 uppercase', badge.bg, badge.text)}>
                                      {badge.label}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-slate-500 mb-3">{step.description}</p>

                                  {inputNames.length > 0 && (
                                    <div>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Data Sources Used</p>
                                      <div className="flex flex-wrap gap-2">
                                        {inputNames.map(name => (
                                          <span key={name} className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-600">
                                            <Plus className="w-3 h-3 text-slate-400" />
                                            {name}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* Output step */}
                        {workflow && (
                          <div className="bg-white rounded-xl border border-emerald-200 p-5">
                            <div className="flex items-start gap-4">
                              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="text-sm font-bold text-slate-900">{workflow.output.title}</h4>
                                  <Badge className="text-[9px] font-bold border-0 uppercase bg-emerald-100 text-emerald-700">OUTPUT</Badge>
                                </div>
                                <p className="text-xs text-slate-500">{workflow.output.description}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>

          {/* Bottom toolbar */}
          {!showOutput && (
            <div className="h-10 border-t border-slate-200 bg-white flex items-center justify-end px-4 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))}>
                  <Minus className="w-3.5 h-3.5 text-slate-400" />
                </Button>
                <span className="text-xs text-slate-400 w-10 text-center">{zoomLevel}%</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoomLevel(Math.min(200, zoomLevel + 10))}>
                  <Plus className="w-3.5 h-3.5 text-slate-400" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                </Button>
              </div>
            </div>
          )}
        </main>

        {/* === RIGHT PANEL: Plan / Input Config / Output Config === */}
        {rightPanelOpen ? (
          <aside className="w-[20%] flex-shrink-0 border-l border-gray-100 bg-white flex flex-col">
            {/* Tabs header */}
            <div className="flex items-center px-3 py-2 border-b border-gray-100 gap-0.5 flex-shrink-0">
              {(['plan', 'input', 'output'] as const).map(tab => {
                const icons = { plan: Sparkles, input: Upload, output: BarChart3 };
                const labels = { plan: 'Plan', input: 'Input', output: 'Output' };
                const TabIcon = icons[tab];
                return (
                  <button key={tab} onClick={() => setRightPanelTab(tab)}
                    className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                      rightPanelTab === tab ? 'bg-violet-50 text-violet-700' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-700'
                    )}>
                    <TabIcon className="w-3 h-3" />
                    {labels[tab]}
                  </button>
                );
              })}
              <div className="flex-1" />
              <Button variant="ghost" size="icon" className="h-7 w-7 transition-all duration-200" onClick={() => setRightPanelOpen(false)} title="Collapse panel">
                <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4">

                {/* -- Plan tab -- */}
                {rightPanelTab === 'plan' && workflow && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-4 h-4 text-violet-600" />
                      <h3 className="text-sm font-bold text-slate-900">Query Execution Plan</h3>
                    </div>
                    <div className="space-y-1">
                      {workflow.steps.map((step, idx) => {
                        const cfg = STC[step.type] ?? STC.analyze;
                        return (
                          <div key={step.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white bg-[#26064A]">
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-800">{step.name}</p>
                              <p className="text-xs text-slate-400 truncate">{step.description}</p>
                            </div>
                          </div>
                        );
                      })}
                      {/* Output */}
                      <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-emerald-500">
                          <Check className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{workflow.output.title}</p>
                          <p className="text-xs text-slate-400">{workflow.output.type.toUpperCase()} output</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* -- Input Config tab -- */}
                {rightPanelTab === 'input' && workflow && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Upload className="w-4 h-4 text-violet-600" />
                      <h3 className="text-sm font-bold text-slate-900">Input Configuration</h3>
                    </div>

                    {/* Active Sources */}
                    <div className="mb-6">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">Active Sources</Label>
                      <div className="space-y-2">
                        {(() => {
                          // Group inputs into display groups
                          const groups: { name: string; badge: string; items: typeof workflow.inputs }[] = [];
                          const edcInputs = workflow.inputs.filter(i => i.name.includes('Invoice') || i.name.includes('Data') || i.name.includes('MTOW'));
                          const metaInputs = workflow.inputs.filter(i => !edcInputs.includes(i));

                          if (edcInputs.length > 0) {
                            groups.push({ name: 'Electronic Data Capture (EDC) Export', badge: `${edcInputs.length} FILES`, items: edcInputs });
                          }
                          if (metaInputs.length > 0) {
                            groups.push({ name: 'Source Document Metadata', badge: 'CSV', items: metaInputs });
                          }

                          return groups.map((g, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                                  <Database className="w-4 h-4 text-violet-700" />
                                </div>
                                <span className="text-sm font-medium text-slate-700">{g.name}</span>
                              </div>
                              <Badge variant="secondary" className="text-[10px] bg-slate-200 text-slate-600">{g.badge}</Badge>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>

                    {/* Global Parameters */}
                    <div>
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Global Parameters</Label>
                      <p className="text-xs text-slate-500 leading-relaxed">Configure global input parameters and ingestion rules</p>
                    </div>
                  </div>
                )}

                {/* -- Output Config tab -- */}
                {rightPanelTab === 'output' && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <BarChart3 className="w-4 h-4 text-violet-600" />
                      <h3 className="text-sm font-bold text-slate-900">Output Configuration</h3>
                    </div>

                    {/* Output Layout */}
                    <div className="mb-6">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">Output Layout</Label>
                      <div className="flex gap-2">
                        {([
                          { key: 'table' as const, icon: Table2, label: 'Table' },
                          { key: 'dashboard' as const, icon: LayoutDashboard, label: 'Dashboard' },
                          { key: 'split' as const, icon: SplitSquareHorizontal, label: 'Split View' },
                        ]).map(opt => (
                          <button key={opt.key} onClick={() => setDashboardLayout(opt.key)}
                            className={cn('flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-colors',
                              dashboardLayout === opt.key ? 'bg-violet-50 border-violet-200 text-violet-700' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
                            )}>
                            <opt.icon className="w-5 h-5" />
                            <span className="text-[10px] font-medium uppercase">{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Dashboard KPIs */}
                    <div className="mb-6">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">Dashboard KPIs</Label>
                      <div className="space-y-2">
                        {([
                          { key: 'totalRecords' as const, label: 'Total Records Scanned', badge: null },
                          { key: 'duplicatesFound' as const, label: 'Duplicates Found', badge: null },
                          { key: 'amountAtRisk' as const, label: 'Amount at Risk', badge: null },
                          { key: 'comparisonLastRun' as const, label: 'Comparison vs Last Run', badge: 'DELTA' },
                          { key: 'duplicateTrend' as const, label: 'Duplicate Trend (30 days)', badge: null },
                        ]).map(item => (
                          <label key={item.key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                            <input type="checkbox" checked={kpiChecks[item.key]}
                              onChange={e => setKpiChecks(prev => ({ ...prev, [item.key]: e.target.checked }))}
                              className="w-4 h-4 rounded border-slate-300 text-violet-700 focus:ring-violet-500" />
                            <span className="text-xs text-slate-700 flex-1">{item.label}</span>
                            {item.badge && (
                              <Badge variant="secondary" className="text-[9px] bg-amber-100 text-amber-700">{item.badge}</Badge>
                            )}
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* AI Suggestions */}
                    <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Label className="text-[10px] font-bold text-violet-700 uppercase tracking-widest">AI Suggestions</Label>
                        <Badge className="bg-violet-100 text-violet-700 border-0 text-[9px] font-bold">SMART</Badge>
                      </div>
                      <div className="space-y-2">
                        {([
                          { key: 'trendColumn' as const, label: 'Add "Trend vs Previous Run" column to track changes between executions' },
                          { key: 'varianceHighlight' as const, label: 'Enable variance highlighting when amount difference exceeds tolerance' },
                          { key: 'timeToResolution' as const, label: 'Include "Time to Resolution" metric for flagged items' },
                          { key: 'autoGroupVendor' as const, label: 'Auto-group results by vendor for easier review' },
                        ]).map(item => (
                          <label key={item.key} className="flex items-start gap-3 p-2 rounded-lg hover:bg-violet-100/50 cursor-pointer">
                            <input type="checkbox" checked={aiSuggestions[item.key]}
                              onChange={e => setAiSuggestions(prev => ({ ...prev, [item.key]: e.target.checked }))}
                              className="w-4 h-4 rounded border-violet-300 text-violet-700 focus:ring-violet-500 mt-0.5" />
                            <span className="text-xs text-slate-700 leading-relaxed">{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </ScrollArea>
          </aside>
        ) : (
          /* Collapsed right panel — thin vertical strip with expand button */
          <div className="w-10 flex-shrink-0 border-l border-gray-100 bg-white flex flex-col items-center py-3 gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-gray-50 transition-all duration-200" onClick={() => setRightPanelOpen(true)} title="Expand panel">
              <ChevronRight className="w-4 h-4 text-gray-400 rotate-180" />
            </Button>
            {(['plan', 'input', 'output'] as const).map(tab => {
              const icons = { plan: Sparkles, input: Upload, output: BarChart3 };
              const TabIcon = icons[tab];
              return (
                <Button key={tab} variant="ghost" size="icon"
                  className={cn('h-8 w-8 rounded-lg transition-all duration-150', rightPanelTab === tab ? 'bg-violet-50 text-violet-700' : 'text-gray-400 hover:bg-gray-50')}
                  onClick={() => { setRightPanelTab(tab); setRightPanelOpen(true); }}
                  title={tab === 'plan' ? 'Plan' : tab === 'input' ? 'Input Config' : 'Output Config'}>
                  <TabIcon className="w-3.5 h-3.5" />
                </Button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
