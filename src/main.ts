import dotenv from 'dotenv';
import { getDatabase } from './db/sqlite';
import { interpretUserRequest } from './llm/interpret';
import { executePlan } from './execution/run';
import { formatResponse } from './response/format';
import { closeDatabase } from './db/sqlite';

// Load environment variables
dotenv.config();

async function main(): Promise<void> {
  console.log('🤖 NL2DB Prototype - Natural Language to Database Engine');
  console.log('=========================================================');
  
  try {
    // Connect to database (assumes database is already initialized)
    console.log('� Connecting to database...');
    await getDatabase();
    console.log('✅ Database ready\n');
    
    // Start chat loop
    console.log('💬 Chat interface ready. Type "exit" to quit.');
    console.log('📝 Supported queries: list customers/orders, filter by name/city, count orders, sum amounts, recent orders\n');
    
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    while (true) {
      try {
        const userInput = await new Promise<string>((resolve) => {
          rl.question('You: ', resolve);
        });
        
        // Check for exit command
        if (userInput.toLowerCase().trim() === 'exit') {
          console.log('👋 Goodbye!');
          break;
        }
        
        // Process empty input
        if (!userInput.trim()) {
          continue;
        }
        
        console.log('🔄 Processing...');
        
        // Interpret user request
        const plan = await interpretUserRequest(userInput);
        
        // Execute the plan
        const result = await executePlan(plan);
        
        // Format and display response
        const response = formatResponse(result);
        console.log(`🤖: ${response}\n`);
        
      } catch (error) {
        console.log(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
      }
    }
    
    rl.close();
    
  } catch (error) {
    console.error('💥 Fatal error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  } finally {
    // Clean up database connection
    await closeDatabase();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down gracefully...');
  await closeDatabase();
  process.exit(0);
});

// Run the application
if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
}
