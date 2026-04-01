import { NextRequest, NextResponse } from 'next/server';
import { Workflow } from '@/lib/types';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const workflowRaw = formData.get('workflow') as string;
    const workflow: Workflow = JSON.parse(workflowRaw);

    const outputType = workflow.output?.type ?? 'flags';

    if (outputType === 'flags') {
      return NextResponse.json({
        result: {
          type: 'flags',
          title: workflow.output?.title ?? 'Audit Findings',
          summary: 'Analysis complete. 4 issues detected across the uploaded data — 1 critical, 2 high, 1 medium. Immediate review recommended for critical items.',
          metrics: { records_analyzed: 1842, issues_found: 4, risk_level: 'high' },
          flags: [
            {
              id: 'FLAG-001',
              description: 'Employee ID EMP-4821 receives salary disbursement but is absent from the HR master record. Possible ghost employee.',
              severity: 'critical',
              reference: 'Payroll row 214 — EMP-4821 — ₹87,500/month',
              recommendation: 'Freeze payment immediately and escalate to HR for identity verification.',
            },
            {
              id: 'FLAG-002',
              description: 'Bank account ending **9034** is shared by two employees: EMP-1103 (Ravi Sharma) and EMP-2287 (Ravi Kumar). Potential duplicate payment risk.',
              severity: 'high',
              reference: 'Payroll rows 89 & 312',
              recommendation: 'Verify account ownership with the bank before next payroll run.',
            },
            {
              id: 'FLAG-003',
              description: 'EMP-0567 gross pay of ₹2,14,000 exceeds the approved salary band ceiling of ₹1,90,000 for Grade B3 by ₹24,000.',
              severity: 'high',
              reference: 'Payroll row 58 — Grade B3 band: ₹1,20,000–₹1,90,000',
              recommendation: 'Obtain authorised exception letter or correct the payroll entry before disbursement.',
            },
            {
              id: 'FLAG-004',
              description: 'Retroactive salary adjustment of ₹42,000 for EMP-1890 (Oct–Dec) processed without documented approver sign-off in the system.',
              severity: 'medium',
              reference: 'Payroll row 401 — adjustment date: 2026-03-18',
              recommendation: 'Obtain retrospective approval from department head and CFO within 5 business days.',
            },
          ],
        },
      });
    }

    if (outputType === 'table') {
      return NextResponse.json({
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
      });
    }

    if (outputType === 'report') {
      return NextResponse.json({
        result: {
          type: 'report',
          title: workflow.output?.title ?? 'Audit Report',
          summary: 'Vendor contract compliance audit complete. 3 material breaches identified totalling ₹6.8L at risk.',
          metrics: { records_analyzed: 156, issues_found: 3, risk_level: 'high' },
          report: `## Executive Summary

This audit reviewed **156 vendor invoices** from Q4 FY2025–26 against signed contracts and approved purchase orders. Three material compliance breaches were identified with a combined financial exposure of **₹6,82,500**.

---

## Key Findings

### 1. Rate Overcharge — GlobalEdge IT Services (Critical)
- **Invoice:** INV-GE-0892, ₹3,24,000
- **Contracted Rate:** ₹1,200/hr for 240 hrs = ₹2,88,000
- **Overbilled:** ₹36,000 (12.5% above contract)
- **Recommendation:** Raise a credit note demand immediately. Escalate to legal if not resolved within 14 days.

### 2. Out-of-Scope Services — Nexus Facilities Management (High)
- **Invoice:** INV-NX-0441, ₹2,98,500
- **Issue:** Landscaping and interior décor services billed — not included in the facility management contract (Clause 4.2)
- **Recommendation:** Reject the out-of-scope line items (₹2,48,000) and process only the in-scope portion (₹50,500).

### 3. Missing Goods Receipt Note — TechPro Hardware (Medium)
- **Invoice:** INV-TP-0215, ₹48,000
- **Issue:** Payment processed without a corresponding GRN, violating the three-way match policy
- **Recommendation:** Obtain retrospective confirmation of delivery from the requesting department before closing the period.

---

## Summary Statistics

| Category | Count | Amount (₹) |
|---|---|---|
| Clean Invoices | 153 | 1,24,38,750 |
| Rate Overcharges | 1 | 36,000 |
| Out-of-Scope Billing | 1 | 2,48,000 |
| Missing GRN | 1 | 48,000 |
| **Total at Risk** | **3** | **3,32,000** |

---

## Recommendations

1. Implement automated rate-check validation in the AP system before invoice approval
2. Enforce GRN attachment as a mandatory field in the invoice submission portal
3. Conduct quarterly contract scope reviews with all Tier-1 vendors

*Report generated by Irame.ai Audit Platform — ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}*`,
        },
      });
    }

    // Default: summary
    return NextResponse.json({
      result: {
        type: 'summary',
        title: workflow.output?.title ?? 'Audit Summary',
        summary: 'Audit complete. Overall risk level is medium. 3 items require follow-up.',
        metrics: { records_analyzed: 320, issues_found: 3, risk_level: 'medium' },
        data: {
          total_records: 320,
          clean_records: 317,
          exceptions: 3,
          categories: [
            { category: 'Duplicate Entries', count: 1, amount: 42000 },
            { category: 'Missing Documentation', count: 2, amount: 130000 },
          ],
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
