"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnthropicAdapter = void 0;
const interpret_1 = require("../llm/interpret");
const metadata_1 = require("../schema/metadata");
const config_1 = require("../config");
function generateSchemaInfo() {
    const schemaMetadata = (0, metadata_1.getSchemaMetadata)();
    let info = '';
    for (const [tableName, tableDef] of Object.entries(schemaMetadata.tables)) {
        info += `\nTable: ${tableName}\n`;
        info += `Fields: ${Object.keys(tableDef.fields).join(', ')}\n`;
    }
    return info;
}
class AnthropicAdapter {
    async generatePlan(prompt) {
        return await (0, interpret_1.interpretUserRequest)(prompt);
    }
    async correctPlan(originalPrompt, feedback, badPlan) {
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
        const schemaMetadata = (0, metadata_1.getSchemaMetadata)();
        const config = (0, config_1.getConfig)();
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
        const Anthropic = (await Promise.resolve().then(() => __importStar(require('@anthropic-ai/sdk')))).default;
        const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
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
        return plan;
    }
}
exports.AnthropicAdapter = AnthropicAdapter;
//# sourceMappingURL=anthropicAdapter.js.map