// backend/src/utils/loadGames.js
// Reads all gameData.json files from /src/games/ subfolders and upserts them into MongoDB.
// Usage:  node src/utils/loadGames.js           (standalone)
//         or import { syncGamesFromDisk } and call at server startup

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Game = require('../models/Games');

const GAMES_DIR = path.join(__dirname, '../games');

/**
 * Scans every subfolder in /src/games/ for a gameData.json,
 * parses it, and upserts into the Game collection (matched by title).
 * Returns an array of the upserted game documents.
 */
const syncGamesFromDisk = async () => {
    const folders = fs.readdirSync(GAMES_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    const results = { created: 0, updated: 0, skipped: 0, errors: [] };

    for (const folder of folders) {
        const jsonPath = path.join(GAMES_DIR, folder, 'gameData.json');

        // Skip folders without a gameData.json
        if (!fs.existsSync(jsonPath)) {
            console.log(`⏭️  Skipping "${folder}" — no gameData.json found`);
            results.skipped++;
            continue;
        }

        try {
            const raw = fs.readFileSync(jsonPath, 'utf-8');
            const data = JSON.parse(raw);

            // Ensure gameFolder is set (fallback to the folder name on disk)
            if (!data.gameFolder) {
                data.gameFolder = folder;
            }

            // Strip null gameFile values so Mongoose doesn't store "null"
            if (data.gameFile === null) {
                delete data.gameFile;
            }

            // Upsert: match by title, update everything else
            const existing = await Game.findOne({ title: data.title });

            if (existing) {
                Object.assign(existing, data);
                await existing.save();
                console.log(`🔄 Updated "${data.title}"`);
                results.updated++;
            } else {
                await Game.create(data);
                console.log(`✅ Created "${data.title}"`);
                results.created++;
            }
        } catch (err) {
            console.error(`❌ Error processing "${folder}":`, err.message);
            results.errors.push({ folder, error: err.message });
        }
    }

    return results;
};

// ─── Standalone execution ────────────────────────────────────────────
if (require.main === module) {
    (async () => {
        try {
            await mongoose.connect(process.env.MONGO_URI);
            console.log('✅ MongoDB connected');
            console.log(`\n📂 Scanning ${GAMES_DIR}\n`);

            const results = await syncGamesFromDisk();

            console.log('\n' + '='.repeat(40));
            console.log('📊 Sync Summary:');
            console.log(`   Created : ${results.created}`);
            console.log(`   Updated : ${results.updated}`);
            console.log(`   Skipped : ${results.skipped}`);
            if (results.errors.length > 0) {
                console.log(`   Errors  : ${results.errors.length}`);
                results.errors.forEach(e => console.log(`     - ${e.folder}: ${e.error}`));
            }
            console.log('='.repeat(40) + '\n');

            process.exit(0);
        } catch (err) {
            console.error('❌ Fatal error:', err);
            process.exit(1);
        }
    })();
}

module.exports = { syncGamesFromDisk };
