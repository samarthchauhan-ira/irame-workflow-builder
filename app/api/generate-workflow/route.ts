import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are an expert enterprise workflow builder for an internal audit platform.
When the user describes an audit or data-processing use case, respond with a JSON object in this exact structure (no markdown, no prose — only valid JSON):

{
  "workflow": {
    "name": "string — concise workflow name",
    "description": "string — 1-2 sentence description",
    "logicPrompt": "string — detailed instruction for the AI when running this workflow (2-4 sentences, audit expert persona)",
    "inputs": [
      {
        "id": "input_N",
        "name": "string",
        "type": "csv | pdf | image | sql",
        "description": "string — what this file should contain",
        "required": true | false,
        "multiple": true | false
      }
    ],
    "output": {
      "type": "table | report | flags | summary | json",
      "title": "string",
      "description": "string",
      "fields": [
        { "name": "string", "type": "string | number | boolean | date", "description": "string" }
      ]
    },
    "steps": [
      {
        "id": "step_N",
        "name": "string — concise step name",
        "description": "string — what this step does",
        "type": "extract | analyze | compare | flag | summarize | calculate | validate"
      }
    ],
    "tags": ["string"],
    "category": "string"
  },
  "message": "string — friendly 1-2 sentence explanation to show the user in the chat"
}

Rules:
- Always include 3-6 inputs and 4-7 steps appropriate for the use case
- Choose output type based on the use case: flags for fraud/anomaly detection, table for reconciliation, report for compliance reviews, summary for high-level overviews
- The logicPrompt must be specific, actionable, and written in the voice of a senior auditor
- tags should be 3-5 relevant lowercase hyphenated keywords
- category should be a short department-level label like "Financial Audit", "HR & Payroll", etc.
- Respond with ONLY the JSON object — no backticks, no explanation outside of "message"`;

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json() as { messages: Array<{ role: string; content: string }> };

    const apiMessages = messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: apiMessages,
    });

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '';

    // Strip markdown code fences if present
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    let parsed: { workflow: unknown; message: string };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // If JSON parse fails, fall back to a graceful error message
      return NextResponse.json({
        error: 'Failed to parse workflow from model response',
        raw: rawText,
      }, { status: 500 });
    }

    return NextResponse.json({ workflow: parsed.workflow, message: parsed.message });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
