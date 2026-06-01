import { createEngine } from '../engine.js';
import { costCutStrategy } from './strategies/cost-cut-basic.js';
import { writeFileSync } from 'fs';
import { execSync } from 'child_process';

const STRATEGIES = {
    'cost-cut-basic': costCutStrategy
};

function getGitVersion() {
    try {
        return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    } catch {
        return 'unknown';
    }
}

function resolvePending(engine, result) {
    if (result.pendingUpgrade) {
        engine.resolveUpgrade(result.pendingUpgrade, false);
    }
    if (result.pendingEvent) {
        engine.resolveEvent(result.pendingEvent.eventId, 'pay');
    }
}

function runGame(strategy, seed) {
    const engine = createEngine({ seed });
    engine.initGame();

    const initialNetWorth = engine.calculateNetWorth();

    while (true) {
        const state = engine.getState();

        if (state.turn > 30 || state.gameOver) {
            break;
        }

        const result = strategy.execute(engine, state);
        if (result) {
            resolvePending(engine, result);
        }
    }

    const finalState = engine.getState();
    const finalNetWorth = engine.calculateNetWorth();

    return {
        seed,
        strategy: strategy.name,
        initialNetWorth,
        finalNetWorth,
        netWorthChange: finalNetWorth - initialNetWorth,
        turn: finalState.turn,
        gameOver: finalState.gameOver,
        endType: finalState.gameOver ? finalState.type : 'max_turns'
    };
}

function runTests(strategyName, seeds, outputFile) {
    const strategy = STRATEGIES[strategyName];
    if (!strategy) {
        console.error(`Unknown strategy: ${strategyName}`);
        console.error(`Available: ${Object.keys(STRATEGIES).join(', ')}`);
        process.exit(1);
    }

    const version = getGitVersion();
    const results = [];
    const stats = {
        version,
        strategy: strategyName,
        runs: seeds.length,
        results: []
    };

    for (const seed of seeds) {
        const result = runGame(strategy, seed);
        results.push(result);
        stats.results.push({
            seed,
            initialNetWorth: result.initialNetWorth,
            finalNetWorth: result.finalNetWorth,
            netWorthChange: result.netWorthChange,
            turn: result.turn,
            gameOver: result.gameOver,
            endType: result.endType
        });
    }

    const netWorthChanges = results.map(r => r.netWorthChange);
    stats.summary = {
        avgNetWorthChange: netWorthChanges.reduce((a, b) => a + b, 0) / results.length,
        minNetWorthChange: Math.min(...netWorthChanges),
        maxNetWorthChange: Math.max(...netWorthChanges),
        winRate: results.filter(r => r.netWorthChange > 0).length / results.length
    };

    console.log(`\nTest Run Complete: ${strategyName}`);
    console.log(`Version: ${version.substring(0, 8)}`);
    console.log(`Seeds: ${seeds.length}`);
    console.log(`Avg Net Worth Change: $${(stats.summary.avgNetWorthChange / 1000000).toFixed(2)}M`);
    console.log(`Win Rate: ${(stats.summary.winRate * 100).toFixed(1)}%`);
    console.log(`Min: $${(stats.summary.minNetWorthChange / 1000000).toFixed(2)}M | Max: $${(stats.summary.maxNetWorthChange / 1000000).toFixed(2)}M\n`);

    if (outputFile) {
        writeFileSync(outputFile, JSON.stringify(stats, null, 2));
        console.log(`Results written to ${outputFile}`);
    }

    return stats;
}

const args = process.argv.slice(2);
let strategyName = 'cost-cut-basic';
let seeds = [1, 2, 3, 4, 5];
let outputFile = null;

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--strategy' && args[i + 1]) {
        strategyName = args[++i];
    } else if (args[i] === '--seeds' && args[i + 1]) {
        seeds = args[++i].split(',').map(Number);
    } else if (args[i] === '--output' && args[i + 1]) {
        outputFile = args[++i];
    } else if (args[i] === '--help') {
        console.log('Usage: node test-runner.js [options]');
        console.log('Options:');
        console.log('  --strategy <name>  Strategy to run (default: cost-cut-basic)');
        console.log('  --seeds <list>    Comma-separated seed values (default: 1,2,3,4,5)');
        console.log('  --output <file>   Write JSON results to file');
        console.log('  --help            Show this help');
        process.exit(0);
    }
}

runTests(strategyName, seeds, outputFile);