import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 3456;

function startServer() {
    return new Promise((resolve) => {
        const server = http.createServer((req, res) => {
            let filePath = '.' + req.url;
            if (req.url === '/') filePath = '/prototype.html';

            const ext = path.extname(filePath);
            const mimeTypes = {
                '.html': 'text/html',
                '.js': 'application/javascript',
                '.css': 'text/css'
            };

            fs.readFile(filePath, (err, data) => {
                if (err) {
                    res.writeHead(404);
                    res.end('Not found');
                } else {
                    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
                    res.end(data);
                }
            });
        });

        server.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
            resolve(server);
        });
    });
}

const parseMoney = (str) => {
    const match = str.replace(/[$,]/g, '').match(/([\d.]+)([MK])?/);
    if (!match) return 0;
    let num = parseFloat(match[1]);
    if (match[2] === 'M') num *= 1000000;
    else if (match[2] === 'K') num *= 1000;
    return num;
};

const assert = (condition, message) => {
    if (!condition) throw new Error(`Assertion failed: ${message}`);
    console.log(`  ✓ ${message}`);
};

(async () => {
    const server = await startServer();

    const browser = await chromium.launch({
        headless: process.env.E2E_HEADED !== 'true',
        slowMo: parseInt(process.env.E2E_SLOWMO || '0'),
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    const consoleMessages = [];
    page.on('console', msg => {
        consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    page.on('pageerror', err => {
        consoleMessages.push({ type: 'pageerror', text: err.message });
    });

    await page.goto(`http://localhost:${PORT}/prototype.html`);

    await page.waitForSelector('.company-panel', { timeout: 5000 });

    console.log('\n=== Test 1: Initial Page Load ===');
    const companyCount = await page.locator('.company-panel').count();
    assert(companyCount >= 2, `Found ${companyCount} companies available (expected >= 2)`);

    const cashText = await page.locator('#cash-display').innerText();
    const cash = parseMoney(cashText);
    assert(cash === 10000000, `Cash display: ${cashText}`);

    const debtText = await page.locator('#debt-display').innerText();
    const debt = parseMoney(debtText);
    assert(debt === 2000000, `Debt display: ${debtText}`);

    const netWorthText = await page.locator('#net-worth-display').innerText();
    const netWorth = parseMoney(netWorthText);
    assert(netWorth === cash - debt, `Net worth display: ${netWorthText}`);

    console.log('\n=== Test 2: Leveraged Purchase ===');
    const acquisitions = page.locator('.company-panel');
    const availableCount = await acquisitions.count();
    if (availableCount > 0) {
        const levCompany = acquisitions.first();
        const levDownText = await levCompany.locator('.btn-lbo .btn-price').innerText();
        const levDown = parseMoney(levDownText);
        const levDebtText = await levCompany.locator('.btn-lbo .btn-debt').innerText();

        console.log(`  Available companies: ${availableCount}`);
        console.log(`  Down payment: ${levDownText}, Company debt: ${levDebtText}`);

        const cashBeforeLev = parseMoney(await page.locator('#cash-display').innerText());
        const netWorthBeforeLev = parseMoney(await page.locator('#net-worth-display').innerText());

        console.log(`  Cash before: $${cashBeforeLev}`);
        await levCompany.locator('.btn-lbo').click();
        await page.waitForTimeout(500);

        const cashAfterLevText = await page.locator('#cash-display').innerText();
        const cashAfterLev = parseMoney(cashAfterLevText);
        const netWorthAfterLevText = await page.locator('#net-worth-display').innerText();
        const netWorthAfterLev = parseMoney(netWorthAfterLevText);

        console.log(`  Cash after: ${cashAfterLevText}, Net worth: ${netWorthAfterLevText}`);

        assert(cashAfterLev < cashBeforeLev, `Cash decreased after leveraged purchase: ${cashAfterLevText}`);
        assert(netWorthAfterLev < netWorthBeforeLev, `Net worth decreased (company debt loaded): ${netWorthAfterLevText}`);
        console.log(`  Net worth: ${netWorthBeforeLev} → ${netWorthAfterLev}`);
    } else {
        console.log('  ⚠ No companies available for leveraged purchase (all bought)');
    }

    console.log('\n=== Test 3: Travel Advances Turn ===');
    const turnBeforeText = await page.locator('#turn-display').innerText();
    const turnBefore = parseInt(turnBeforeText.match(/\d+/)[0]);
    console.log(`  Turn before travel: ${turnBefore}`);

    const wallStreetBtn = page.locator('#travel-buttons button', { hasText: 'Wall Street' });
    await wallStreetBtn.click();

    const turnAfterText = await page.locator('#turn-display').innerText();
    const turnAfter = parseInt(turnAfterText.match(/\d+/)[0]);
    assert(turnAfter === turnBefore + 1, `Turn incremented: ${turnBefore} → ${turnAfter}`);

    const wallStreetBtnDisabled = await wallStreetBtn.isDisabled();
    assert(wallStreetBtnDisabled, `Wall Street button now disabled (location changed)`);

    console.log('\n=== Console Errors ===');
    const errors = consoleMessages.filter(m => m.type === 'error' || m.type === 'pageerror');
    if (errors.length === 0) {
        console.log('  ✓ No console errors');
    } else {
        console.log(`  ✗ Found ${errors.length} errors:`);
        errors.forEach(e => console.log(`    - [${e.type}] ${e.text}`));
    }

    await browser.close();
    server.close();

    console.log('\n=== All Tests Passed ===\n');
})();
