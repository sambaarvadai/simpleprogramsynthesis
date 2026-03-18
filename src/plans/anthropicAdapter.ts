import { AnyPlan } from './types';
import { interpretUserRequest } from '../llm/interpret';
import { getSchemaMetadata } from '../schema/metadata';
import { getConfig } from '../config';

function generateSchemaInfo(): string {
  const schemaMetadata = getSchemaMetadata();
  let info = '';
  
  for (const [tableName, tableDef] of Object.entries(schemaMetadata.tables)) {
    info += `\nTable: ${tableName}\n`;
    info += `Fields: ${Object.keys(tableDef.fields).join(', ')}\n`;
  }
  
  return info;
}

export interface LLMAdapter {
  generatePlan(prompt: string): Promise<AnyPlan>;
  correctPlan(originalPrompt: string, feedback: string, badPlan: AnyPlan): Promise<AnyPlan>;
}

export class AnthropicAdapter implements LLMAdapter {
  async generatePlan(prompt: string): Promise<AnyPlan> {
    return await interpretUserRequest(prompt);
  }

  async correctPlan(originalPrompt: string, feedback: string, badPlan: AnyPlan): Promise<AnyPlan> {
    // Create a correction prompt using validation feedback
    const correctionPrompt = `You are correcting a previously generated query plan. This is NOT a new user request - it's a correction task.

The original user request was: "${originalPrompt}"

The previous plan had these issues:
${feedback}

Please generate a corrected JSON query plan that addresses all the issues above. Return ONLY corrected JSON query plan - no explanations. This is a correction task, not a new user request.

Previous invalid plan:
${JSON.stringify(badPlan, null, 2)}`;

    // Bypass conversational logic by calling internal functions directly
    // We need to access internal Anthropic client and system prompt
    const schemaMetadata = getSchemaMetadata();
    const config = getConfig();
    
    // Create exact same system prompt as interpretUserRequest
    const schemaInfo = generateSchemaInfo();
    const systemPrompt = `You are a natural language to database query interpreter. 
Convert to user's natural language request into a structured JSON query plan.

Available schema:
${schemaInfo}

Supported operations:
- List customers and orders
- Filter by customer name or city
- Count orders
- Sum order amounts
- Get recent/latest orders with limits
- Basic joins between customers and orders

Rules:
1. Output ONLY valid JSON - no explanations or extra text
2. If the request doesn't need database access (greeting, general question), use: {"needsDb": false, "responseMode": "conversational"}
3. For database queries, use this structure:
{
  "needsDb": true,
  "entity": "table_name",
  "join": ["optional_join_table"],
  "select": ["field1", "field2"],
  "where": [{"field": "table.field", "op": "=", "value": "filter_value"}],
  "aggregate": {"type": "count|sum|avg|min|max", "field": "optional_field"},
  "orderBy": {"field": "table.field", "direction": "asc|desc"},
  "limit": number
}

4. Use only allowed tables, fields, and operations from the schema
5. Maximum limit is 20
6. For "recent" or "latest" requests, order by created_at desc
7. For customer-specific requests, join with customers table
8. Handle variations like "show", "list", "get", "find", "how many", "what is", etc.

Examples:
"Show all customers from Chennai" -> {"needsDb": true, "entity": "customers", "select": ["customers.*"], "where": [{"field": "customers.city", "op": "=", "value": "Chennai"}]}
"Show Ravi's recent orders" -> {"needsDb": true, "entity": "orders", "join": ["customers"], "select": ["orders.*", "customers.name"], "where": [{"field": "customers.name", "op": "=", "value": "Ravi"}], "orderBy": {"field": "orders.created_at", "direction": "desc"}, "limit": 5}
"How many orders are from Chennai?" -> {"needsDb": true, "entity": "orders", "join": ["customers"], "aggregate": {"type": "count"}, "where": [{"field": "customers.city", "op": "=", "value": "Chennai"}]}
"What is total amount spent by Ravi?" -> {"needsDb": true, "entity": "orders", "join": ["customers"], "aggregate": {"type": "sum", "field": "orders.amount"}, "where": [{"field": "customers.name", "op": "=", "value": "Ravi"}]}`;

    // Call Anthropic directly with correction prompt
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });

    const response = await anthropic.messages.create({
      model: config.llm.model,
      max_tokens: config.llm.maxTokens,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: correctionPrompt
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Anthropic API');
    }

    // Extract JSON from the response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in LLM response');
    }

    const plan = JSON.parse(jsonMatch[0]);
    return plan as AnyPlan;
  }
}
