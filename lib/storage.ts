import { Workflow } from './types';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'irame_workflows_v2';

const SAMPLE_WORKFLOWS: Workflow[] = [
  {
    id: 'sample-1',
    name: 'Financial Statement Analysis',
    description: 'Automated analysis of financial statements with anomaly detection and compliance checks.',
    logicPrompt: 'You are a senior financial auditor. Analyze the provided financial statements and previous year data. Identify anomalies, compliance issues, and material variances. Generate a comprehensive compliance report with risk ratings.',
    inputs: [
      { id: 'i1', name: 'Financial Statements', type: 'pdf', description: 'Upload company financial statements', required: true, multiple: true },
      { id: 'i2', name: 'Previous Year Data', type: 'csv', description: 'Prior year figures for comparison', required: false },
    ],
    output: {
      type: 'report',
      title: 'Compliance Report',
      description: 'Detailed compliance report with findings and recommendations',
    },
    steps: [
      { id: 's1', name: 'Extract Financial Data', description: 'Parse and structure data from statements', type: 'extract' },
      { id: 's2', name: 'Anomaly Detection', description: 'Identify unusual transactions and patterns', type: 'analyze' },
      { id: 's3', name: 'Year-over-Year Comparison', description: 'Compare with prior period figures', type: 'compare' },
      { id: 's4', name: 'Compliance Check', description: 'Validate against regulatory requirements', type: 'validate' },
      { id: 's5', name: 'Report Generation', description: 'Compile findings into audit report', type: 'summarize' },
    ],
    tags: ['finance', 'compliance', 'statements'],
    category: 'Financial Audit',
    status: 'active',
    createdAt: new Date('2026-03-15').toISOString(),
    updatedAt: new Date('2026-03-20').toISOString(),
    runCount: 20,
  },
  {
    id: 'sample-2',
    name: 'Invoice Verification',
    description: 'Cross-reference invoices with purchase orders and delivery receipts to detect discrepancies.',
    logicPrompt: 'You are an accounts payable auditor. Cross-reference the provided invoices against purchase orders and delivery receipts. Flag duplicates, amount discrepancies, missing approvals, and unauthorized vendors.',
    inputs: [
      { id: 'i1', name: 'Invoice Images', type: 'image', description: 'Scanned invoices or receipts', required: true, multiple: true },
      { id: 'i2', name: 'Purchase Orders', type: 'csv', description: 'Approved PO register with amounts', required: true },
    ],
    output: {
      type: 'flags',
      title: 'Discrepancy Flags',
      description: 'List of flagged invoices with severity and recommendations',
    },
    steps: [
      { id: 's1', name: 'OCR Extraction', description: 'Extract data from invoice images', type: 'extract' },
      { id: 's2', name: 'PO Matching', description: 'Match invoices to purchase orders', type: 'compare' },
      { id: 's3', name: 'Duplicate Check', description: 'Detect duplicate invoice numbers', type: 'validate' },
      { id: 's4', name: 'Amount Verification', description: 'Verify line items and totals', type: 'calculate' },
    ],
    tags: ['invoices', 'accounts-payable', 'ocr'],
    category: 'Accounts Payable',
    status: 'active',
    createdAt: new Date('2026-03-10').toISOString(),
    updatedAt: new Date('2026-03-18').toISOString(),
    runCount: 19,
  },
  {
    id: 'sample-3',
    name: 'Asset Inventory Audit',
    description: 'Compare physical asset images with database records to identify discrepancies and missing assets.',
    logicPrompt: 'You are an asset auditor. Compare the uploaded physical asset images against the asset database. Identify missing assets, condition discrepancies, and assets not in the approved register.',
    inputs: [
      { id: 'i1', name: 'Asset Photos', type: 'image', description: 'Photos of physical assets', required: true, multiple: true },
      { id: 'i2', name: 'Asset Register', type: 'csv', description: 'Database of registered assets', required: true },
    ],
    output: {
      type: 'table',
      title: 'Asset Discrepancy Report',
      description: 'Tabular comparison of physical vs. recorded assets',
      fields: [
        { name: 'Asset ID', type: 'string', description: 'Asset identifier' },
        { name: 'Status', type: 'string', description: 'Found / Missing / Condition Issue' },
        { name: 'Location', type: 'string', description: 'Physical location' },
        { name: 'Notes', type: 'string', description: 'Auditor notes' },
      ],
    },
    steps: [
      { id: 's1', name: 'Image Analysis', description: 'Identify assets in uploaded photos', type: 'extract' },
      { id: 's2', name: 'Register Matching', description: 'Match assets to database records', type: 'compare' },
      { id: 's3', name: 'Discrepancy Flagging', description: 'Flag missing and unmatched assets', type: 'flag' },
    ],
    tags: ['assets', 'inventory', 'physical-audit'],
    category: 'Asset Audit',
    status: 'draft',
    createdAt: new Date('2026-03-05').toISOString(),
    updatedAt: new Date('2026-03-12').toISOString(),
    runCount: 8,
  },
];

export function getWorkflows(): Workflow[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_WORKFLOWS));
      return SAMPLE_WORKFLOWS;
    }
    const workflows = JSON.parse(stored) as Workflow[];
    // Patch missing status field for backwards compatibility
    return workflows.map((w) => ({ ...w, status: w.status ?? 'active' }));
  } catch {
    return SAMPLE_WORKFLOWS;
  }
}

export function getWorkflow(id: string): Workflow | null {
  const workflows = getWorkflows();
  return workflows.find((w) => w.id === id) ?? null;
}

export function saveWorkflow(workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt' | 'runCount'>): Workflow {
  const workflows = getWorkflows();
  const newWorkflow: Workflow = {
    ...workflow,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    runCount: 0,
  };
  workflows.unshift(newWorkflow);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows));
  return newWorkflow;
}

export function updateWorkflow(id: string, updates: Partial<Workflow>): Workflow | null {
  const workflows = getWorkflows();
  const index = workflows.findIndex((w) => w.id === id);
  if (index === -1) return null;
  workflows[index] = { ...workflows[index], ...updates, updatedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows));
  return workflows[index];
}

export function incrementRunCount(id: string): void {
  const workflow = getWorkflow(id);
  if (workflow) {
    updateWorkflow(id, { runCount: workflow.runCount + 1 });
  }
}

export function deleteWorkflow(id: string): void {
  const workflows = getWorkflows().filter((w) => w.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows));
}
