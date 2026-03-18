"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const sqlite_1 = require("./db/sqlite");
const interpret_1 = require("./llm/interpret");
const run_1 = require("./execution/run");
const format_1 = require("./response/format");
const sqlite_2 = require("./db/sqlite");
// Load environment variables
dotenv_1.default.config();
async function main() {
    console.log('🤖 NL2DB Prototype - Natural Language to Database Engine');
    console.log('=========================================================');
    try {
        // Connect to database (assumes database is already initialized)
        console.log('� Connecting to database...');
        await (0, sqlite_1.getDatabase)();
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
                const userInput = await new Promise((resolve) => {
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
                const plan = await (0, interpret_1.interpretUserRequest)(userInput);
                // Execute the plan
                const result = await (0, run_1.executePlan)(plan);
                // Format and display response
                const response = (0, format_1.formatResponse)(result);
                console.log(`🤖: ${response}\n`);
            }
            catch (error) {
                console.log(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
            }
        }
        rl.close();
    }
    catch (error) {
        console.error('💥 Fatal error:', error instanceof Error ? error.message : 'Unknown error');
        process.exit(1);
    }
    finally {
        // Clean up database connection
        await (0, sqlite_2.closeDatabase)();
    }
}
// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n👋 Shutting down gracefully...');
    await (0, sqlite_2.closeDatabase)();
    process.exit(0);
});
// Run the application
if (require.main === module) {
    main().catch((error) => {
        console.error('💥 Unhandled error:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=main.js.map