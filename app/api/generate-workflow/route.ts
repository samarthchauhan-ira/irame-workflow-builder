import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json() as { messages: Array<{ role: string; content: string }> };
    const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content ?? '';

    // Derive a name from the user's message for a more realistic feel
    const isVendor = /vendor|contract|supplier/i.test(lastUserMsg);
    const isPayroll = /payroll|salary|hr|employee/i.test(lastUserMsg);
    const isInvoice = /invoice|payment|bill/i.test(lastUserMsg);

    const workflow = isPayroll ? {
      name: 'Payroll Integrity Audit',
      description: 'Cross-validates payroll disbursements against HR master records to detect ghost employees, duplicate payments, and salary anomalies.',
      logicPrompt: 'As a senior payroll auditor, reconcile each disbursement record against the authorised HR headcount. Flag any employee IDs present in payroll but absent from HR records, duplicate bank account numbers, payments outside approved salary bands, and retroactive adjustments lacking approver sign-off.',
      inputs: [
        { id: 'input_1', name: 'Payroll Disbursement File', type: 'csv', description: 'Monthly payroll run with employee ID, name, bank account, gross pay, deductions, net pay', required: true, multiple: false },
        { id: 'input_2', name: 'HR Master Record', type: 'csv', description: 'Authorised headcount with employee ID, department, grade, salary band min/max, joining date', required: true, multiple: false },
        { id: 'input_3', name: 'Approved Salary Structure', type: 'pdf', description: 'Board-approved compensation bands by grade and department', required: false, multiple: false },
      ],
      output: {
        type: 'flags',
        title: 'Payroll Audit Findings',
        description: 'Itemised flags for each anomaly detected in the payroll run',
        fields: [
          { name: 'employee_id', type: 'string', description: 'Employee identifier' },
          { name: 'issue_type', type: 'string', description: 'Category of anomaly' },
          { name: 'severity', type: 'string', description: 'Risk level' },
          { name: 'amount_at_risk', type: 'number', description: 'INR value of the discrepancy' },
        ],
      },
      steps: [
        { id: 'step_1', name: 'Load & Validate Files', description: 'Parse both CSVs, enforce schema, reject malformed rows', type: 'extract' },
        { id: 'step_2', name: 'Ghost Employee Check', description: 'Identify employee IDs in payroll not present in HR master', type: 'compare' },
        { id: 'step_3', name: 'Duplicate Bank Account Scan', description: 'Flag multiple employees sharing the same bank account number', type: 'flag' },
        { id: 'step_4', name: 'Salary Band Validation', description: 'Check each gross pay against approved band for employee grade', type: 'validate' },
        { id: 'step_5', name: 'Retroactive Adjustment Review', description: 'Highlight prior-period corrections without documented approvals', type: 'analyze' },
        { id: 'step_6', name: 'Executive Summary', description: 'Aggregate findings into risk-ranked summary with totals', type: 'summarize' },
      ],
      tags: ['payroll', 'ghost-employee', 'fraud-detection', 'hr-audit'],
      category: 'HR & Payroll',
    } : isVendor ? {
      name: 'Vendor Contract Compliance Audit',
      description: 'Reviews vendor invoices and purchase orders against signed contracts to detect overbilling, unapproved scope, and SLA breaches.',
      logicPrompt: 'As a senior procurement auditor, match each invoice line item to the corresponding PO and contract clause. Flag amounts exceeding contract rates, services billed outside agreed scope, missing GRN references, and payment terms violations.',
      inputs: [
        { id: 'input_1', name: 'Vendor Invoices', type: 'csv', description: 'Invoice register with invoice number, vendor, line items, amounts, dates', required: true, multiple: true },
        { id: 'input_2', name: 'Purchase Orders', type: 'csv', description: 'Approved POs with PO number, vendor, line items, agreed rates, validity period', required: true, multiple: false },
        { id: 'input_3', name: 'Master Contract', type: 'pdf', description: 'Signed vendor agreement with rates, scope, SLAs, payment terms', required: true, multiple: false },
        { id: 'input_4', name: 'Goods Receipt Notes', type: 'csv', description: 'GRNs confirming delivery of goods or services', required: false, multiple: false },
      ],
      output: {
        type: 'flags',
        title: 'Vendor Compliance Flags',
        description: 'Itemised list of contract breaches and billing anomalies',
        fields: [
          { name: 'invoice_no', type: 'string', description: 'Invoice reference' },
          { name: 'vendor', type: 'string', description: 'Vendor name' },
          { name: 'breach_type', type: 'string', description: 'Type of compliance breach' },
          { name: 'amount_at_risk', type: 'number', description: 'Overbilled or unapproved amount in INR' },
        ],
      },
      steps: [
        { id: 'step_1', name: 'Document Ingestion', description: 'Parse invoices, POs, and GRN CSVs; extract contract terms from PDF', type: 'extract' },
        { id: 'step_2', name: 'Invoice ↔ PO Matching', description: 'Three-way match: invoice line items against PO lines', type: 'compare' },
        { id: 'step_3', name: 'Rate Variance Check', description: 'Flag invoiced rates exceeding contract-approved rates by >2%', type: 'flag' },
        { id: 'step_4', name: 'Scope Compliance', description: 'Identify services billed that are outside contracted scope', type: 'validate' },
        { id: 'step_5', name: 'GRN Reconciliation', description: 'Ensure every invoice has a corresponding GRN before payment', type: 'compare' },
        { id: 'step_6', name: 'Risk Summary', description: 'Rank vendors by total amount at risk and breach frequency', type: 'summarize' },
      ],
      tags: ['vendor', 'contract', 'procurement', 'overbilling', 'compliance'],
      category: 'Procurement Audit',
    } : {
      name: 'Invoice Verification & AP Audit',
      description: 'Validates accounts-payable invoices against purchase orders and GL entries to catch duplicate payments, fictitious vendors, and coding errors.',
      logicPrompt: 'As a senior AP auditor, reconcile each invoice against its originating PO and general ledger posting. Flag duplicate invoice numbers, invoices from vendors not on the approved vendor master, GL account miscoding, and invoices approved by the same person who raised the PO (segregation-of-duties breach).',
      inputs: [
        { id: 'input_1', name: 'AP Invoice Register', type: 'csv', description: 'All invoices in the period: invoice no, vendor ID, amount, GL code, approver, payment date', required: true, multiple: false },
        { id: 'input_2', name: 'Vendor Master', type: 'csv', description: 'Approved vendor list with vendor ID, name, bank details, registration number', required: true, multiple: false },
        { id: 'input_3', name: 'GL Trial Balance', type: 'csv', description: 'General ledger entries for the period with account codes and amounts', required: true, multiple: false },
        { id: 'input_4', name: 'Purchase Orders', type: 'csv', description: 'Approved POs with PO number, requester, approver, vendor, amount', required: false, multiple: false },
      ],
      output: {
        type: 'table',
        title: 'AP Audit Results',
        description: 'Structured table of all invoices with audit status and exceptions highlighted',
        fields: [
          { name: 'invoice_no', type: 'string', description: 'Invoice number' },
          { name: 'vendor', type: 'string', description: 'Vendor name' },
          { name: 'amount', type: 'number', description: 'Invoice amount' },
          { name: 'status', type: 'string', description: 'Clean / Exception / Duplicate / Unapproved' },
          { name: 'exception_detail', type: 'string', description: 'Description of issue if applicable' },
        ],
      },
      steps: [
        { id: 'step_1', name: 'Data Ingestion', description: 'Load and validate all four input files', type: 'extract' },
        { id: 'step_2', name: 'Vendor Master Validation', description: 'Cross-check each invoice vendor against approved vendor master', type: 'validate' },
        { id: 'step_3', name: 'Duplicate Invoice Detection', description: 'Identify duplicate invoice numbers or same vendor+amount+date combinations', type: 'flag' },
        { id: 'step_4', name: 'GL Coding Review', description: 'Verify GL account codes are appropriate for the invoice category', type: 'analyze' },
        { id: 'step_5', name: 'SoD Breach Check', description: 'Flag invoices where PO requester and invoice approver are the same person', type: 'flag' },
        { id: 'step_6', name: 'Reconciliation Summary', description: 'Summarise total clean vs. exception invoices with amounts', type: 'summarize' },
      ],
      tags: ['accounts-payable', 'invoice', 'duplicate-payment', 'gl-audit', 'sod'],
      category: 'Financial Audit',
    };

    const message = `I've designed the **${workflow.name}** workflow for you. It includes ${workflow.inputs.length} input types and ${workflow.steps.length} audit steps. You can refine it further or proceed to run it.`;

    return NextResponse.json({ workflow, message });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
