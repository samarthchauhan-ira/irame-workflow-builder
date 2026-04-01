// Client-side mock implementations — replaces all /api/* routes for static export
import type { InputType, OutputType, StepType } from './types';

export async function generateWorkflow(messages: Array<{ role: string; content: string }>) {
  const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content ?? '';
  const isPayroll = /payroll|salary|hr|employee/i.test(lastUserMsg);
  const isVendor = /vendor|contract|supplier/i.test(lastUserMsg);

  const workflow = isPayroll ? {
    name: 'Payroll Integrity Audit',
    description: 'Cross-validates payroll disbursements against HR master records to detect ghost employees, duplicate payments, and salary anomalies.',
    logicPrompt: 'As a senior payroll auditor, reconcile each disbursement record against the authorised HR headcount. Flag any employee IDs present in payroll but absent from HR records, duplicate bank account numbers, payments outside approved salary bands, and retroactive adjustments lacking approver sign-off.',
    inputs: [
      { id: 'input_1', name: 'Payroll Disbursement File', type: 'csv' as InputType, description: 'Monthly payroll run with employee ID, name, bank account, gross pay, deductions, net pay', required: true, multiple: false },
      { id: 'input_2', name: 'HR Master Record', type: 'csv' as InputType, description: 'Authorised headcount with employee ID, department, grade, salary band min/max, joining date', required: true, multiple: false },
      { id: 'input_3', name: 'Approved Salary Structure', type: 'pdf' as InputType, description: 'Board-approved compensation bands by grade and department', required: false, multiple: false },
    ],
    output: { type: 'flags' as OutputType, title: 'Payroll Audit Findings', description: 'Itemised flags for each anomaly detected in the payroll run', fields: [{ name: 'employee_id', type: 'string' as const, description: 'Employee identifier' }] },
    steps: [
      { id: 'step_1', name: 'Load & Validate Files', description: 'Parse both CSVs, enforce schema, reject malformed rows', type: 'extract' as StepType },
      { id: 'step_2', name: 'Ghost Employee Check', description: 'Identify employee IDs in payroll not present in HR master', type: 'compare' as StepType },
      { id: 'step_3', name: 'Duplicate Bank Account Scan', description: 'Flag multiple employees sharing the same bank account number', type: 'flag' as StepType },
      { id: 'step_4', name: 'Salary Band Validation', description: 'Check each gross pay against approved band for employee grade', type: 'validate' as StepType },
      { id: 'step_5', name: 'Executive Summary', description: 'Aggregate findings into risk-ranked summary with totals', type: 'summarize' as StepType },
    ],
    tags: ['payroll', 'ghost-employee', 'fraud-detection', 'hr-audit'],
    category: 'HR & Payroll',
  } : isVendor ? {
    name: 'Vendor Contract Compliance Audit',
    description: 'Reviews vendor invoices and purchase orders against signed contracts to detect overbilling, unapproved scope, and SLA breaches.',
    logicPrompt: 'As a senior procurement auditor, match each invoice line item to the corresponding PO and contract clause. Flag amounts exceeding contract rates, services billed outside agreed scope, missing GRN references, and payment terms violations.',
    inputs: [
      { id: 'input_1', name: 'Vendor Invoices', type: 'csv' as InputType, description: 'Invoice register with invoice number, vendor, line items, amounts, dates', required: true, multiple: true },
      { id: 'input_2', name: 'Purchase Orders', type: 'csv' as InputType, description: 'Approved POs with PO number, vendor, line items, agreed rates, validity period', required: true, multiple: false },
      { id: 'input_3', name: 'Master Contract', type: 'pdf' as InputType, description: 'Signed vendor agreement with rates, scope, SLAs, payment terms', required: true, multiple: false },
    ],
    output: { type: 'flags' as OutputType, title: 'Vendor Compliance Flags', description: 'Itemised list of contract breaches and billing anomalies', fields: [{ name: 'invoice_no', type: 'string' as const, description: 'Invoice reference' }] },
    steps: [
      { id: 'step_1', name: 'Document Ingestion', description: 'Parse invoices, POs, and GRN CSVs; extract contract terms from PDF', type: 'extract' as StepType },
      { id: 'step_2', name: 'Invoice ↔ PO Matching', description: 'Three-way match: invoice line items against PO lines', type: 'compare' as StepType },
      { id: 'step_3', name: 'Rate Variance Check', description: 'Flag invoiced rates exceeding contract-approved rates by >2%', type: 'flag' as StepType },
      { id: 'step_4', name: 'Scope Compliance', description: 'Identify services billed that are outside contracted scope', type: 'validate' as StepType },
      { id: 'step_5', name: 'Risk Summary', description: 'Rank vendors by total amount at risk and breach frequency', type: 'summarize' as StepType },
    ],
    tags: ['vendor', 'contract', 'procurement', 'overbilling', 'compliance'],
    category: 'Procurement Audit',
  } : {
    name: 'Invoice Verification & AP Audit',
    description: 'Validates accounts-payable invoices against purchase orders and GL entries to catch duplicate payments, fictitious vendors, and coding errors.',
    logicPrompt: 'As a senior AP auditor, reconcile each invoice against its originating PO and general ledger posting. Flag duplicate invoice numbers, invoices from vendors not on the approved vendor master, GL account miscoding, and segregation-of-duties breaches.',
    inputs: [
      { id: 'input_1', name: 'AP Invoice Register', type: 'csv' as InputType, description: 'All invoices in the period: invoice no, vendor ID, amount, GL code, approver, payment date', required: true, multiple: false },
      { id: 'input_2', name: 'Vendor Master', type: 'csv' as InputType, description: 'Approved vendor list with vendor ID, name, bank details, registration number', required: true, multiple: false },
      { id: 'input_3', name: 'GL Trial Balance', type: 'csv' as InputType, description: 'General ledger entries for the period with account codes and amounts', required: true, multiple: false },
      { id: 'input_4', name: 'Purchase Orders', type: 'csv' as InputType, description: 'Approved POs with PO number, requester, approver, vendor, amount', required: false, multiple: false },
    ],
    output: { type: 'table' as OutputType, title: 'AP Audit Results', description: 'Structured table of all invoices with audit status and exceptions highlighted', fields: [{ name: 'invoice_no', type: 'string' as const, description: 'Invoice number' }] },
    steps: [
      { id: 'step_1', name: 'Data Ingestion', description: 'Load and validate all four input files', type: 'extract' as StepType },
      { id: 'step_2', name: 'Vendor Master Validation', description: 'Cross-check each invoice vendor against approved vendor master', type: 'validate' as StepType },
      { id: 'step_3', name: 'Duplicate Invoice Detection', description: 'Identify duplicate invoice numbers or same vendor+amount+date combinations', type: 'flag' as StepType },
      { id: 'step_4', name: 'GL Coding Review', description: 'Verify GL account codes are appropriate for the invoice category', type: 'analyze' as StepType },
      { id: 'step_5', name: 'SoD Breach Check', description: 'Flag invoices where PO requester and invoice approver are the same person', type: 'flag' as StepType },
      { id: 'step_6', name: 'Reconciliation Summary', description: 'Summarise total clean vs. exception invoices with amounts', type: 'summarize' as StepType },
    ],
    tags: ['accounts-payable', 'invoice', 'duplicate-payment', 'gl-audit', 'sod'],
    category: 'Financial Audit',
  };

  return {
    workflow,
    message: `I've designed the **${workflow.name}** workflow for you. It includes ${workflow.inputs.length} input types and ${workflow.steps.length} audit steps. You can refine it further or proceed to run it.`,
  };
}

export async function clarifyWorkflow(body: {
  phase: 'check_files' | 'map_files' | 'map_columns';
  workflow: { name: string; description?: string; inputs: Array<{ id: string; name: string; type: string; description: string; required: boolean }>; steps: Array<{ id: string; name: string; description: string; columnMappings?: Array<{ from: string; to: string }> }> };
  files: Array<{ name: string; type: string; headers?: string[]; rowCount?: number; sampleRows?: string[][] }>;
}) {
  const { phase, workflow, files } = body;

  if (phase === 'check_files') {
    return {
      phase: 'check_files',
      sufficient: true,
      matched: workflow.inputs.map((inp, i) => ({ inputId: inp.id, fileName: files[i]?.name ?? inp.name, confidence: 'high' })),
      missing: [],
      message: 'All required files are present and matched. Ready to proceed.',
    };
  }

  if (phase === 'map_files') {
    return {
      phase: 'map_files',
      mapped: true,
      fileMappings: files.map((file, i) => ({
        fileName: file.name,
        inputId: workflow.inputs[i % workflow.inputs.length]?.id ?? 'input_1',
        inputName: workflow.inputs[i % workflow.inputs.length]?.name ?? file.name,
        confidence: 'high',
        reason: 'File name and type match the expected input definition.',
      })),
      stepMappings: workflow.steps.map(step => ({ stepId: step.id, stepName: step.name, fileNames: files.slice(0, 2).map(f => f.name), confident: true })),
      ambiguous: [],
      message: 'All files have been confidently mapped to workflow inputs and steps.',
    };
  }

  // map_columns
  const stepsWithMappings = workflow.steps.filter(s => s.columnMappings?.length);
  return {
    phase: 'map_columns',
    mapped: true,
    stepColumnMappings: stepsWithMappings.map(step => ({
      stepId: step.id,
      stepName: step.name,
      mappings: (step.columnMappings ?? []).map(cm => ({
        expectedFrom: cm.from,
        actualColumn: cm.from,
        expectedTo: cm.to,
        confidence: 'high',
      })),
    })),
    unmappedColumns: [],
    message: 'Column mappings resolved successfully. All expected fields are covered.',
  };
}

export async function runWorkflow(workflow: { output?: { type?: string; title?: string } }) {
  const outputType = workflow.output?.type ?? 'flags';

  if (outputType === 'flags') {
    return {
      result: {
        type: 'flags',
        title: workflow.output?.title ?? 'Audit Findings',
        summary: 'Analysis complete. 4 issues detected across the uploaded data — 1 critical, 2 high, 1 medium. Immediate review recommended for critical items.',
        metrics: { records_analyzed: 1842, issues_found: 4, risk_level: 'high' },
        flags: [
          { id: 'FLAG-001', description: 'Employee ID EMP-4821 receives salary disbursement but is absent from the HR master record. Possible ghost employee.', severity: 'critical', reference: 'Payroll row 214 — EMP-4821 — ₹87,500/month', recommendation: 'Freeze payment immediately and escalate to HR for identity verification.' },
          { id: 'FLAG-002', description: 'Bank account ending **9034** is shared by two employees: EMP-1103 (Ravi Sharma) and EMP-2287 (Ravi Kumar). Potential duplicate payment risk.', severity: 'high', reference: 'Payroll rows 89 & 312', recommendation: 'Verify account ownership with the bank before next payroll run.' },
          { id: 'FLAG-003', description: 'EMP-0567 gross pay of ₹2,14,000 exceeds the approved salary band ceiling of ₹1,90,000 for Grade B3 by ₹24,000.', severity: 'high', reference: 'Payroll row 58 — Grade B3 band: ₹1,20,000–₹1,90,000', recommendation: 'Obtain authorised exception letter or correct the payroll entry before disbursement.' },
          { id: 'FLAG-004', description: 'Retroactive salary adjustment of ₹42,000 for EMP-1890 (Oct–Dec) processed without documented approver sign-off in the system.', severity: 'medium', reference: 'Payroll row 401 — adjustment date: 2026-03-18', recommendation: 'Obtain retrospective approval from department head and CFO within 5 business days.' },
        ],
      },
    };
  }

  if (outputType === 'table') {
    return {
      result: {
        type: 'table',
        title: workflow.output?.title ?? 'Audit Results',
        summary: 'Processed 24 invoices. 19 are clean. 5 exceptions found — 2 duplicates, 2 unapproved vendors, 1 GL miscoding.',
        metrics: { records_analyzed: 24, issues_found: 5, risk_level: 'medium' },
        table: {
          headers: ['Invoice No', 'Vendor', 'Amount (₹)', 'GL Code', 'Status', 'Exception Detail'],
          rows: [
            ['INV-2024-001', 'Tata Consultancy Services', '4,82,000', '5001-IT', 'Clean', '—'],
            ['INV-2024-002', 'Infosys Ltd', '2,15,500', '5001-IT', 'Clean', '—'],
            ['INV-2024-003', 'Apex Supplies Pvt Ltd', '98,750', '6002-OPS', 'Exception', 'Vendor not on approved master list'],
            ['INV-2024-004', 'Wipro Technologies', '3,67,000', '5001-IT', 'Clean', '—'],
            ['INV-2024-005', 'Apex Supplies Pvt Ltd', '98,750', '6002-OPS', 'Duplicate', 'Duplicate of INV-2024-003 (same vendor, amount, date)'],
            ['INV-2024-006', 'Reliance Industries', '1,24,000', '9999-MISC', 'Exception', 'GL code 9999-MISC is a suspense account — requires reclassification'],
            ['INV-2024-007', 'HCL Technologies', '5,90,000', '5001-IT', 'Clean', '—'],
            ['INV-2024-008', 'Shadow Ventures LLC', '74,000', '6002-OPS', 'Exception', 'Vendor not on approved master list — foreign entity, no registration number'],
            ['INV-2024-009', 'Mahindra & Mahindra', '2,88,000', '7003-CAPEX', 'Clean', '—'],
            ['INV-2024-010', 'Tata Consultancy Services', '4,82,000', '5001-IT', 'Duplicate', 'Duplicate of INV-2024-001 (same invoice number resubmitted)'],
          ],
        },
      },
    };
  }

  if (outputType === 'report') {
    return {
      result: {
        type: 'report',
        title: workflow.output?.title ?? 'Audit Report',
        summary: 'Vendor contract compliance audit complete. 3 material breaches identified totalling ₹6.8L at risk.',
        metrics: { records_analyzed: 156, issues_found: 3, risk_level: 'high' },
        report: `## Executive Summary\n\nThis audit reviewed **156 vendor invoices** from Q4 FY2025–26 against signed contracts and approved purchase orders. Three material compliance breaches were identified with a combined financial exposure of **₹6,82,500**.\n\n---\n\n## Key Findings\n\n### 1. Rate Overcharge — GlobalEdge IT Services (Critical)\n- **Invoice:** INV-GE-0892, ₹3,24,000\n- **Contracted Rate:** ₹1,200/hr for 240 hrs = ₹2,88,000\n- **Overbilled:** ₹36,000 (12.5% above contract)\n- **Recommendation:** Raise a credit note demand immediately.\n\n### 2. Out-of-Scope Services — Nexus Facilities Management (High)\n- **Invoice:** INV-NX-0441, ₹2,98,500\n- **Issue:** Landscaping and interior décor services billed — not included in the facility management contract (Clause 4.2)\n- **Recommendation:** Reject the out-of-scope line items (₹2,48,000).\n\n### 3. Missing Goods Receipt Note — TechPro Hardware (Medium)\n- **Invoice:** INV-TP-0215, ₹48,000\n- **Issue:** Payment processed without a corresponding GRN, violating the three-way match policy\n- **Recommendation:** Obtain retrospective confirmation of delivery.`,
      },
    };
  }

  return {
    result: {
      type: 'summary',
      title: workflow.output?.title ?? 'Audit Summary',
      summary: 'Audit complete. Overall risk level is medium. 3 items require follow-up.',
      metrics: { records_analyzed: 320, issues_found: 3, risk_level: 'medium' },
      data: { total_records: 320, clean_records: 317, exceptions: 3 },
    },
  };
}
