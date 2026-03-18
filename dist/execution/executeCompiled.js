"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeCompiledQuery = executeCompiledQuery;
const sqlite_1 = require("../db/sqlite");
const config_1 = require("../config");
async function executeCompiledQuery(compiled) {
    try {
        const config = (0, config_1.getConfig)();
        const db = await (0, sqlite_1.getDatabase)();
        if (config.app.debug) {
            console.log('Debug: SQL:', compiled.sql);
            console.log('Debug: Params:', compiled.params);
        }
        // Use same execution method as original run.ts
        const rows = await db.all(compiled.sql, compiled.params);
        const queryResult = {
            rows,
            fields: rows.length > 0 ? Object.keys(rows[0]) : []
        };
        return {
            success: true,
            data: queryResult
        };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
//# sourceMappingURL=executeCompiled.js.map