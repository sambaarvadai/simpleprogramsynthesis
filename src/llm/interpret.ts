import Anthropic from '@anthropic-ai/sdk';
import { AnyPlan } from '../plans/types';
import { getSchemaMetadata } from '../schema/metadata';
import { getConfig } from '../config';

export class LLMInterpreterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LLMInterpreterError';
  }
}

export async function interpretUserRequest(userMessage: string): Promise<AnyPlan> {
  const config = getConfig();
  
  if (config.app.debug) {
    console.log('Debug: ANTHROPIC_API_KEY exists:', !!process.env.ANTHROPIC_API_KEY);
    console.log('Debug: ANTHROPIC_API_KEY length:', process.env.ANTHROPIC_API_KEY?.length);
    console.log('Debug: ANTHROPIC_API_KEY starts with sk-ant:', process.env.ANTHROPIC_API_KEY?.startsWith('sk-ant'));
  }
  
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new LLMInterpreterError('ANTHROPIC_API_KEY environment variable is not set');
  }

  // Initialize Anthropic client inside the function
  if (config.app.debug) {
    console.log('Debug: Creating Anthropic client...');
  }
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
  if (config.app.debug) {
    console.log('Debug: Anthropic client created successfully');
  }

  const schemaInfo = generateSchemaInfo();
  const systemPrompt = `You are a natural language to database query interpreter. 
Convert the user's natural language request into a structured JSON query plan.

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
"What is the total amount spent by Ravi?" -> {"needsDb": true, "entity": "orders", "join": ["customers"], "aggregate": {"type": "sum", "field": "orders.amount"}, "where": [{"field": "customers.name", "op": "=", "value": "Ravi"}]}`;

  try {
    const response = await anthropic.messages.create({
      model: config.llm.model,
      max_tokens: config.llm.maxTokens,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new LLMInterpreterError('Unexpected response type from Anthropic API');
    }

    // Extract JSON from the response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new LLMInterpreterError('No JSON found in LLM response');
    }

    const plan = JSON.parse(jsonMatch[0]);
    return plan as AnyPlan;

  } catch (error) {
    if (error instanceof LLMInterpreterError) {
      throw error;
    }
    throw new LLMInterpreterError(`Failed to interpret user request: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function generateSchemaInfo(): string {
  const schemaMetadata = getSchemaMetadata();
  let info = '';
  
  for (const [tableName, tableDef] of Object.entries(schemaMetadata.tables)) {
    info += `\nTable: ${tableName}\n`;
    info += `Fields: ${Object.keys(tableDef.fields).join(', ')}\n`;
    
    if (tableDef.joins) {
      info += `Joins: ${Object.entries(tableDef.joins).map(([join, condition]) => `${join} (${condition})`).join(', ')}\n`;
    }
  }
  
  info += `\nAllowed aggregations: ${schemaMetadata.allowedAggregations.join(', ')}\n`;
  info += `Allowed operators: ${schemaMetadata.allowedOperators.join(', ')}\n`;
  info += `Max limit: ${schemaMetadata.maxLimit}\n`;
  
  return info;
}
