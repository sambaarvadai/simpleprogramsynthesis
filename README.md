# NL2DB Prototype

A minimal natural-language-to-database engine that converts user requests into structured query plans and executes them safely against a local SQLite database.

## Features

- **Natural Language Interface**: Ask questions in plain English
- **Safe Query Execution**: No raw SQL generation - uses structured query plans
- **Built-in Safety**: Validation against allowed schemas and operations
- **Local Only**: Runs entirely on your machine with SQLite
- **CLI Interface**: Simple chat-based interaction

## Configuration

The application uses a JSON-based configuration system located in `src/config/default.json`:

```json
{
  "database": {
    "filename": "database.db",
    "path": "./"
  },
  "llm": {
    "provider": "anthropic",
    "model": "claude-3-haiku-20240307",
    "maxTokens": 1000
  },
  "app": {
    "name": "NL2DB Prototype",
    "maxQueryLimit": 20,
    "debug": true
  }
}
```

### Configuration Options

- **database.filename**: Name of the SQLite database file
- **database.path**: Directory path where the database file is stored
- **llm.provider**: LLM provider (currently only "anthropic")
- **llm.model**: Anthropic model to use
- **llm.maxTokens**: Maximum tokens for LLM responses
- **app.maxQueryLimit**: Maximum number of results returned (safety constraint)
- **app.debug**: Enable/disable debug logging

### Environment Variables

- `ANTHROPIC_API_KEY`: Your Anthropic API key (required)

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env and add your Anthropic API key
   ```

3. **Initialize database**
   ```bash
   npm run init-db
   ```

4. **Run the application**
   ```bash
   npm run dev
   ```

## Supported Queries

The prototype supports a limited set of queries for demonstration:

### Customer Queries
- "Show all customers"
- "Show customers from Chennai"
- "List customers in Bangalore"

### Order Queries
- "Show all orders"
- "Show Ravi's orders"
- "List recent orders"
- "Show latest 3 orders"

### Aggregate Queries
- "How many orders are from Chennai?"
- "What is the total amount spent by Ravi?"
- "Count all orders"
- "Sum all order amounts"

### Combined Queries
- "Show recent orders from Chennai customers"
- "List the latest 5 orders from Bangalore"

## Example Usage

```
You: Show all customers from Chennai
🤖: 3 results found:

Name       | City
---        | ---
Ravi       | Chennai
Karthik    | Chennai
Vijay      | Chennai

You: How many orders are from Chennai?
🤖: 12

You: What is the total amount spent by Ravi?
🤖: 60,300.00

You: Show Ravi's recent orders
🤖: 4 results found:

Id | Item      | Amount    | Created At
---|-----------|-----------|------------
4  | Monitor   | 12,000    | 2/10/2024
3  | Keyboard  | 2,500     | 2/1/2024
2  | Mouse     | 800       | 1/16/2024
1  | Laptop    | 45,000    | 1/15/2024
```

## Architecture

### Core Components

1. **Schema Metadata** (`src/schema/metadata.ts`)
   - Defines allowed tables, fields, and operations
   - Enforces safety constraints

2. **Query Plan Types** (`src/plans/types.ts`)
   - TypeScript interfaces for structured query plans
   - Supports joins, filters, aggregations, sorting, limits

3. **LLM Interpreter** (`src/llm/interpret.ts`)
   - Converts natural language to structured JSON plans
   - Uses Anthropic Claude API
   - Includes schema awareness in prompts

4. **Validator** (`src/plans/validator.ts`)
   - Validates query plans against schema metadata
   - Ensures only allowed operations are used

5. **Query Compiler** (`src/execution/compile.ts`)
   - Converts validated plans to parameterized SQL
   - Safe query generation with no raw SQL from LLM

6. **Executor** (`src/execution/run.ts`)
   - Executes compiled queries against SQLite
   - Handles errors and results

7. **Response Formatter** (`src/response/format.ts`)
   - Converts database results to readable responses
   - Handles different result types (tables, aggregates)

### Safety Features

- **No Raw SQL Execution**: LLM only generates structured JSON
- **Schema Validation**: All plans validated against allowed entities
- **Parameterized Queries**: All database queries use parameters
- **Operation Limits**: Maximum result limit enforced (20)
- **Read-Only**: No INSERT/UPDATE/DELETE operations supported

### Database Schema

```sql
customers(
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL
)

orders(
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  item TEXT NOT NULL,
  amount REAL NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(customer_id) REFERENCES customers(id)
)
```

## Sample Data

The database comes pre-seeded with:
- 10 customers across Chennai, Bangalore, Mumbai, and Delhi
- 28 orders with various items and amounts
- Including the required customers: Ravi (Chennai), Anu (Bangalore), Karthik (Chennai)

## Development

### Project Structure
```
src/
  db/           # Database setup and seeding
  schema/       # Schema metadata and validation
  llm/          # Anthropic API integration
  plans/        # Query plan types and validation
  execution/    # Query compilation and execution
  response/     # Result formatting
  main.ts       # CLI entry point
```

### Scripts

- `npm run build` - Compile TypeScript
- `npm run dev` - Run in development mode
- `npm run start` - Run compiled version
- `npm run init-db` - Initialize and seed database

### Environment Variables

- `ANTHROPIC_API_KEY` - Your Anthropic API key (required)

## Limitations

This is intentionally a minimal prototype:

- **Limited Scope**: Only supports 7 specific query types
- **Fixed Schema**: Only customers and orders tables
- **No Auth**: Single-user local only
- **No Persistence**: Database recreated on init-db
- **Basic Error Handling**: Happy path focus
- **CLI Only**: No web interface or API

## Future Extensions

While this prototype is intentionally limited, potential extensions could include:

- Dynamic schema discovery
- More complex query patterns
- Web interface or REST API
- Multiple database backends
- Advanced error handling
- Query optimization
- Caching layers
- Multi-user support

## License

MIT License - feel free to use this as a starting point for your own projects.
