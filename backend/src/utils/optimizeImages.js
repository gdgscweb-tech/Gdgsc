// backend/src/utils/optimizeImages.js
// Converts all game images to optimized WebP format and updates gameData.json references.
// Usage: node src/utils/optimizeImages.js

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const GAMES_DIR = path.join(__dirname, '../games');
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.bmp', '.tiff'];
const QUALITY = 80; // WebP quality (0-100)
const MAX_WIDTH = 1920; // Max width for screenshots

async function optimizeImage(inputPath) {
    const ext = path.extname(inputPath).toLowerCase();
    if (!IMAGE_EXTENSIONS.includes(ext)) return null;

    const dir = path.dirname(inputPath);
    const baseName = path.basename(inputPath, ext);
    const outputPath = path.join(dir, `${baseName}.webp`);

    // Skip if WebP already exists and is newer
    if (fs.existsSync(outputPath)) {
        const srcStat = fs.statSync(inputPath);
        const dstStat = fs.statSync(outputPath);
        if (dstStat.mtimeMs >= srcStat.mtimeMs) {
            return { skipped: true, outputPath };
        }
    }

    try {
        const metadata = await sharp(inputPath).metadata();
        const needsResize = metadata.width > MAX_WIDTH;

        let pipeline = sharp(inputPath);
        if (needsResize) {
            pipeline = pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true });
        }

        await pipeline
            .webp({ quality: QUALITY })
            .toFile(outputPath);

        const srcSize = fs.statSync(inputPath).size;
        const dstSize = fs.statSync(outputPath).size;
        const savings = ((1 - dstSize / srcSize) * 100).toFixed(1);

        return {
            skipped: false,
            inputPath,
            outputPath,
            srcSize,
            dstSize,
            savings: `${savings}%`,
        };
    } catch (err) {
        console.error(`  ❌ Error processing ${inputPath}:`, err.message);
        return null;
    }
}

function updateGameData(gameDir, results) {
    const jsonPath = path.join(gameDir, 'gameData.json');
    if (!fs.existsSync(jsonPath)) return;

    let raw = fs.readFileSync(jsonPath, 'utf-8');
    let data = JSON.parse(raw);
    let changed = false;

    // Build a map of original → webp filenames
    const conversionMap = {};
    for (const r of results) {
        if (!r || r.skipped) continue;
        const origName = path.basename(r.inputPath);
        const webpName = path.basename(r.outputPath);
        conversionMap[origName] = webpName;
    }

    // Update image field
    if (data.image) {
        const imgName = path.basename(data.image);
        if (conversionMap[imgName]) {
            data.image = data.image.replace(imgName, conversionMap[imgName]);
            changed = true;
        }
    }

    // Update screenshots
    if (data.screenshots && Array.isArray(data.screenshots)) {
        data.screenshots = data.screenshots.map(url => {
            const name = path.basename(url);
            if (conversionMap[name]) {
                changed = true;
                return url.replace(name, conversionMap[name]);
            }
            return url;
        });
    }

    if (changed) {
        fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
        console.log(`  📝 Updated gameData.json`);
    }
}

async function run() {
    console.log('\n🖼️  Game Image Optimizer\n');
    console.log(`Scanning: ${GAMES_DIR}\n`);

    const folders = fs.readdirSync(GAMES_DIR, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);

    let totalConverted = 0;
    let totalSkipped = 0;
    let totalSaved = 0;

    for (const folder of folders) {
        const gameDir = path.join(GAMES_DIR, folder);
        console.log(`📂 ${folder}`);

        const files = fs.readdirSync(gameDir)
            .filter(f => IMAGE_EXTENSIONS.includes(path.extname(f).toLowerCase()));

        if (files.length === 0) {
            console.log('  (no images)\n');
            continue;
        }

        const results = [];
        for (const file of files) {
            const filePath = path.join(gameDir, file);
            const result = await optimizeImage(filePath);
            results.push(result);

            if (result && !result.skipped) {
                const srcKB = (result.srcSize / 1024).toFixed(0);
                const dstKB = (result.dstSize / 1024).toFixed(0);
                console.log(`  ✅ ${file} → .webp (${srcKB}KB → ${dstKB}KB, saved ${result.savings})`);
                totalConverted++;
                totalSaved += (result.srcSize - result.dstSize);
            } else if (result && result.skipped) {
                console.log(`  ⏭️  ${file} → already optimized`);
                totalSkipped++;
            }
        }

        // Update gameData.json with new webp paths
        updateGameData(gameDir, results);
        console.log('');
    }

    console.log('='.repeat(50));
    console.log('📊 Optimization Summary:');
    console.log(`   Converted: ${totalConverted} images`);
    console.log(`   Skipped  : ${totalSkipped} images`);
    console.log(`   Saved    : ${(totalSaved / 1024 / 1024).toFixed(2)} MB total`);
    console.log('='.repeat(50));
    console.log('\n💡 Run "npm run load-games" to sync updated paths to MongoDB.\n');
}

run().catch(console.error);
