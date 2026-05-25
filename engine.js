import { companies } from './data/companies.js';
import { locations } from './data/locations.js';
import { upgradeItems } from './data/upgrades.js';
import { config } from './data/config.js';

export function createEngine() {
    let state = createInitialState();

    function createInitialState() {
        const now = new Date();
        return {
            cash: config.initialCash,
            debt: config.initialDebt,
            heat: config.initialHeat,
            location: 'Cayman Islands',
            turn: 1,
            gameStartMonth: now.getMonth(),
            gameStartYear: now.getFullYear(),
            marketCrashTurns: 0,
            creditFreezeTurns: 0,
            strikeTurns: {},
            upgrades: {
                bribedSenator: false,
                ownsNewspaper: false,
                hasMercSec: false,
                hasShellCorp: false,
                hasJusticeFriend: false
            },
            companies: companies.map(c => ({
                ...c,
                isOwned: false,
                isBankrupt: false,
                isSold: false,
                isStripped: false,
                hasDividendRecap: false,
                isCostCut: false,
                valuation: c.baseValuation
            })),
            availableAcquisitions: []
        };
    }

    function cloneDeep(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    function getState() {
        return cloneDeep(state);
    }

    function calculateNetWorth() {
        let sumValuation = 0;
        state.companies.forEach(c => {
            if (c.isOwned) {
                sumValuation += Math.max(0, c.valuation - c.debt);
            }
        });
        return state.cash + sumValuation - state.debt;
    }

    function formatMoney(amount) {
        const sign = amount < 0 ? '-' : '';
        const absAmt = Math.abs(amount);
        if (absAmt >= 1000000) {
            return sign + '$' + (absAmt / 1000000).toFixed(2) + 'M';
        } else if (absAmt >= 1000) {
            return sign + '$' + (absAmt / 1000).toFixed(0) + 'k';
        } else {
            return sign + '$' + absAmt.toFixed(0);
        }
    }

    function refreshLocalAcquisitions() {
        const pool = state.companies.filter(c => !c.isOwned && !c.isBankrupt && !c.isSold);
        pool.sort(() => Math.random() - 0.5);

        const loc = locations.find(l => l.name === state.location);
        let mult = loc ? loc.multiplier : 1.0;

        let count = config.locationAcquisitionCounts.default;
        if (state.location === 'Cayman Islands') {
            count = config.locationAcquisitionCounts['Cayman Islands'];
        } else if (state.location === 'Wall Street (NYC)') {
            count = config.locationAcquisitionCounts['Wall Street (NYC)'];
        }

        const selected = pool.slice(0, count);

        selected.forEach(c => {
            let localMult = mult;
            if (state.location === 'Silicon Valley') {
                localMult += (Math.random() * config.svVolatilityRange * 2 - config.svVolatilityRange);
            } else {
                localMult += (Math.random() * config.defaultVolatilityRange * 2 - config.defaultVolatilityRange);
            }

            if (state.marketCrashTurns > 0) {
                localMult *= config.marketCrashValuationMultiplier;
            }

            localMult = Math.max(config.valuationFloor, localMult);
            c.valuation = Math.round(c.baseValuation * localMult);
            c.assets = Math.min(c.assets, Math.round(c.valuation * 0.9));
        });

        state.availableAcquisitions = selected;
    }

    function msg(type, title, text, delta = {}) {
        return { type, title, text, delta };
    }

    function calculateInterest() {
        return Math.round(state.debt * (state.upgrades.hasShellCorp ? config.shellCorpRate : config.baseInterestRate));
    }

    function creditLimit() {
        return state.upgrades.hasShellCorp ? config.shellCorpCreditLimit : config.creditLimit;
    }

    function applyHeatGain(baseGain) {
        if (state.upgrades.bribedSenator) {
            return Math.round(baseGain * config.bribedSenatorHeatMult);
        }
        return baseGain;
    }

    function triggerAutomaticBankruptcy(c) {
        c.isOwned = false;
        c.isBankrupt = true;

        const heatGain = applyHeatGain(config.autoBankruptcyHeatGain);
        state.heat = Math.min(100, state.heat + heatGain);
    }

    function triggerPersonalBankruptcy() {
        return {
            gameOver: true,
            type: 'personal_bankruptcy',
            title: "SYSTEM ERROR: PERSONAL BANKRUPTCY",
            text: `Your leverage has crushed you! Your personal liquid Cash has dropped below zero and shadow lenders have margin-called your fund. Your Greenwich mansion and yachts are seized by court order.
                   <br><br>You are forced to take a job writing a Substack newsletter titled "Synergy Learnings" from a studio apartment in Queens.
                   <br><br><strong class='red-highlight'>GAME OVER: Bankrupt Outcast Status.</strong>`
        };
    }

    function triggerRetirement() {
        const finalNW = calculateNetWorth();

        let rankText = "";
        let evaluationText = "";

        if (finalNW <= 0) {
            rankText = "FAILING BANKRUPT (THE WEWORK CLASS)";
            evaluationText = `You ended up poorer than when you started. Shadow lenders took everything, and you're now writing a Substack newsletter about 'learnings' and 'macro pivots' from a studio apartment.`;
        } else if (finalNW < 15000000) {
            rankText = "JUNIOR PRIVATE EQUITY ASSOCIATE";
            evaluationText = `You survived the 30 months, but you're still flying commercial. Your yacht is a shared fractional-ownership catamaran in Florida. You spend your weekends formatting Excel decks for your managing director.`;
        } else if (finalNW < 50000000) {
            rankText = "GENERAL VENTURE PARTNER";
            evaluationText = `A moderately successful career of squeezing blood from retail stones. You own a nice house in the Hamptons, a healthy fear of populist pitchforks, and a collection of mid-tier Swiss watches.`;
        } else if (finalNW < 150000000) {
            rankText = "MANAGING DIRECTOR / OUTLAW VULTURE";
            evaluationText = `An absolute predator of the corporate world. You have shut down dozens of factories, wiped out thousands of pensions, and successfully bribed multiple federal officials. Your private jet is mid-sized but entirely yours.`;
        } else {
            rankText = "VULTURE KING / GLOBAL OLIGARCH";
            evaluationText = `You are a god of modern financial engineering! You own newspapers, Supreme Court Justices, and a small sovereign island in the South Pacific. You pay negative income tax, and governments rewrite laws to fit your investment thesis. No one can touch you.`;
        }

        const text = `After 30 months of ruthless private equity engineering, you have retired from the fund.
                     <br><br><strong>Your Final Net Worth:</strong> <span style='font-size:20px; color:#fff;' class='white-highlight'>${formatMoney(finalNW)}</span>
                     <br><br><strong>Your Corporate Rank:</strong> <span style='color:#33ff33; font-weight:bold;'>${rankText}</span>
                     <br><br>${evaluationText}
                     <br><br>Can you do better in the next fund?`;

        return {
            gameOver: true,
            type: 'retirement',
            title: "RETIREMENT PROTOCOL ACTIVATED",
            text
        };
    }

    function triggerSECArrest() {
        return {
            gameOver: true,
            type: 'sec_arrest',
            title: "SYSTEM ERROR: INCARCERATION ENGAGED",
            text: `The FBI and SEC field agents have raided your Greenwich estate. You have been convicted of major securities fraud, systemic asset-stripping bribery, and pension vaporisation.
                   <br><br>You are sentenced to 12 years at FCI Danbury, a minimum-security facility in Connecticut. The tennis courts are clay instead of grass, and you have to play golf on a simulator instead of a real course. It is an utter nightmare.
                   <br><br><strong class='red-highlight'>GAME OVER: Convicted Criminal Status.</strong>`
        };
    }

    function triggerAssassinationLoss() {
        return {
            gameOver: true,
            type: 'assassination',
            title: "SYSTEM ERROR: OPERATOR TERMINATED",
            text: `Without private tactical security guards, you succumbed to injuries at the local hospital.
                   <br><br>Your lavish state funeral was attended only by your trust lawyers, your third ex-spouse, and two IRS agents checking your asset ledger.
                   <br><br><strong class='red-highlight'>GAME OVER: Physically Terminated.</strong>`
        };
    }

    function rollBadEvent() {
        let roll = Math.floor(Math.random() * 5);

        if (roll === 2 && Math.random() >= config.luigiSuppressChance) {
            const otherRolls = [0, 1, 3, 4];
            roll = otherRolls[Math.floor(Math.random() * otherRolls.length)];
        }

        const owned = state.companies.filter(c => c.isOwned);

        if (roll === 0) {
            // SEC Audit
            return { type: 'choice', eventId: 'sec_audit' };
        } else if (roll === 1) {
            if (owned.length === 0) return null;
            return { type: 'choice', eventId: 'union_strike', targetCompanyId: owned[Math.floor(Math.random() * owned.length)].id };
        } else if (roll === 2) {
            return { type: 'choice', eventId: 'assassination' };
        } else if (roll === 3) {
            return { type: 'choice', eventId: 'expose' };
        } else {
            return { type: 'choice', eventId: 'macro' };
        }
    }

    function resolveEvent(eventId, choice) {
        const messages = [];

        if (eventId === 'sec_audit') {
            if (state.upgrades.hasJusticeFriend) {
                messages.push(msg('info', 'SEC CLOSED', 'Your funded Supreme Court Justice "friend" placed an informal call. Investigation quietly dismissed.'));
                return { messages };
            }

            if (choice === 'pay') {
                if (state.cash >= config.secSettlementCost) {
                    state.cash -= config.secSettlementCost;
                    state.heat = 10;
                    messages.push(msg('cash_loss', 'SETTLEMENT PAID', `Paid ${formatMoney(config.secSettlementCost)} to bury SEC charges. Heat reduced to 10%.`, { cash: -config.secSettlementCost, heat: -60 }));
                } else {
                    const go = triggerSECArrest();
                    return { messages, gameOver: go };
                }
            } else {
                if (state.cash >= config.secLawyerCost) {
                    state.cash -= config.secLawyerCost;
                    state.heat = Math.min(100, state.heat + 30);
                    messages.push(msg('cash_loss', 'COURT BATTLE', `Paid ${formatMoney(config.secLawyerCost)} in legal fees. Heat +30%.`, { cash: -config.secLawyerCost, heat: +30 }));
                } else {
                    const go = triggerSECArrest();
                    return { messages, gameOver: go };
                }
            }
        } else if (eventId === 'union_strike') {
            const targetComp = state.companies.find(c => c.id === pendingCompanyId) || owned[Math.floor(Math.random() * owned.length)];
            targetComp.valuation = Math.round(targetComp.valuation * config.unionBusterValuationMultiplier);
            state.strikeTurns[targetComp.id] = config.unionBusterStrikeTurns;
            state.heat = Math.min(100, state.heat + config.unionBusterHeatGain);
            messages.push(msg('alert', 'UNION STRIKE', `${targetComp.name} valuation halved, strike for ${config.unionBusterStrikeTurns} turns. Heat +${config.unionBusterHeatGain}%.`, { heat: config.unionBusterHeatGain }));
        } else if (eventId === 'assassination') {
            if (state.upgrades.hasMercSec) {
                messages.push(msg('info', 'THREAT NEUTRALIZED', 'Your mercenary security detail instantly eliminated the threat. You sip Macallan safely.'));
            } else {
                if (state.cash >= config.assassinationHospitalBill) {
                    state.cash -= config.assassinationHospitalBill;
                    messages.push(msg('cash_loss', 'HOSPITALIZED', `Survived attack. Hospital bills: ${formatMoney(config.assassinationHospitalBill)}`, { cash: -config.assassinationHospitalBill }));
                } else {
                    const go = triggerAssassinationLoss();
                    return { messages, gameOver: go };
                }
            }
        } else if (eventId === 'expose') {
            state.heat = Math.min(100, state.heat + config.exposeHeatGain);
            state.creditFreezeTurns = config.exposeCreditFreeze;

            if (state.upgrades.ownsNewspaper && choice === 'kill') {
                if (state.cash >= config.newspaperKillStoryCost) {
                    state.cash -= config.newspaperKillStoryCost;
                    state.heat = Math.max(0, state.heat - 15);
                    messages.push(msg('cash_loss', 'STORY KILLED', `Paid ${formatMoney(config.newspaperKillStoryCost)} to spike story via owned newspaper. Heat -15%.`, { cash: -config.newspaperKillStoryCost, heat: -15 }));
                }
            } else {
                messages.push(msg('alert', 'EXPOSÉ PUBLISHED', `Negative story published. Heat +${config.exposeHeatGain}%, credit frozen for ${config.exposeCreditFreeze} turns.`, { heat: config.exposeHeatGain }));
            }
        } else if (eventId === 'macro') {
            state.marketCrashTurns = config.marketCrashTurns;
            messages.push(msg('info', 'MACRO CRISIS', 'Market crash triggered. Valuations depressed for ' + config.marketCrashTurns + ' turns.'));
        }

        return { messages };
    }

    // PUBLIC API

    function borrowCash() {
        const messages = [];

        if (state.creditFreezeTurns > 0) {
            messages.push(msg('alert', 'CREDIT FROZEN', `Wall Street banks suspended your credit privileges. Freeze expires in ${state.creditFreezeTurns} turns.`, { credit_frozen: true }));
            return { messages };
        }

        const limit = creditLimit();
        if (state.debt >= limit) {
            messages.push(msg('info', 'BORROW REJECTED', `Shadow lending cap reached (${formatMoney(limit)}). Set up Shell Corp to expand limit.`, { debt_at_limit: true }));
            return { messages };
        }

        state.cash += 1000000;
        state.debt += 1000000;
        messages.push(msg('cash_gain', 'BORROWED', `Drew $1.0M shadow loan.`, { cash: +1000000, debt: +1000000 }));

        return { messages };
    }

    function repayDebt() {
        const messages = [];

        if (state.debt <= 0) {
            messages.push(msg('info', 'REPAY REJECTED', 'Personal leverage is already zero.', { debt_zero: true }));
            return { messages };
        }

        if (state.cash < 1000000) {
            messages.push(msg('info', 'REPAY REJECTED', 'Insufficient cash. Liquidate assets, strip companies, or flip to secure $1.0M.', { insufficient_cash: true }));
            return { messages };
        }

        state.cash -= 1000000;
        state.debt -= 1000000;
        messages.push(msg('cash_loss', 'REPAID', `Repaid $1.0M of shadow debt.`, { cash: -1000000, debt: -1000000 }));

        return { messages };
    }

    function buyCompanyCash(companyId) {
        const messages = [];
        const c = state.companies.find(comp => comp.id === companyId);
        if (!c) {
            messages.push(msg('info', 'ERROR', `Company ${companyId} not found.`, { error: true }));
            return { messages };
        }

        const equityVal = Math.max(0, c.valuation - c.debt);
        const fee = Math.round(equityVal * config.acquisitionFee);
        const totalCost = equityVal + fee;

        if (state.cash < totalCost) {
            messages.push(msg('info', 'INSUFFICIENT CAPITAL', `Need ${formatMoney(totalCost)} cash (Equity: ${formatMoney(equityVal)} + 10% fee). You have ${formatMoney(state.cash)}.`, { cash_needed: totalCost, cash_available: state.cash }));
            return { messages };
        }

        state.cash -= totalCost;
        c.isOwned = true;
        state.availableAcquisitions = state.availableAcquisitions.filter(comp => comp.id !== companyId);
        messages.push(msg('cash_loss', 'ACQUIRED', `Bought ${c.name} for ${formatMoney(totalCost)} (equity ${formatMoney(equityVal)} + fee).`, { cash: -totalCost }));

        return { messages };
    }

    function buyCompanyLeveraged(companyId) {
        const messages = [];
        const c = state.companies.find(comp => comp.id === companyId);
        if (!c) {
            messages.push(msg('info', 'ERROR', `Company ${companyId} not found.`, { error: true }));
            return { messages };
        }

        const equityVal = Math.max(0, c.valuation - c.debt);
        const fee = Math.round(equityVal * config.acquisitionFee);
        const totalCost = equityVal + fee;
        const cashDown = Math.round(totalCost * config.leveragedDownPayment);

        if (state.cash < cashDown) {
            messages.push(msg('info', 'INSUFFICIENT CAPITAL', `Need ${formatMoney(cashDown)} cash (20% down). You have ${formatMoney(state.cash)}.`, { cash_needed: cashDown, cash_available: state.cash }));
            return { messages };
        }

        state.cash -= cashDown;
        c.isOwned = true;
        c.debt += (totalCost - cashDown);
        state.availableAcquisitions = state.availableAcquisitions.filter(comp => comp.id !== companyId);
        messages.push(msg('cash_loss', 'ACQUIRED (LBO)', `Leverage bought ${c.name}. Down payment ${formatMoney(cashDown)}, company debt loaded: ${formatMoney(totalCost - cashDown)}.`, { cash: -cashDown }));

        return { messages };
    }

    function travelTo(locName) {
        const messages = [];
        const pendingEvent = null;

        if (state.location === locName) {
            messages.push(msg('info', 'TRAVEL', `Already in ${locName}. Select alternative region to advance turns.`));
            return { messages, pendingEvent };
        }

        // Advance turn
        state.turn++;
        state.location = locName;

        // Decrement temporary modifiers
        if (state.marketCrashTurns > 0) state.marketCrashTurns--;
        if (state.creditFreezeTurns > 0) state.creditFreezeTurns--;

        // Accrue interest
        const interest = calculateInterest();
        if (interest > 0) {
            state.debt += interest;
            messages.push(msg('cash_loss', 'INTEREST ACCRUED', `Personal shadow debt accrued ${formatMoney(interest)} in interest (${(state.upgrades.hasShellCorp ? 5 : 10).toFixed(0)}% rate).`, { debt: +interest }));
        }

        // Process owned companies
        const owned = state.companies.filter(c => c.isOwned);
        owned.forEach(c => {
            let activeProfit = c.profit;
            if (state.strikeTurns[c.id] && state.strikeTurns[c.id] > 0) {
                state.strikeTurns[c.id]--;
                activeProfit -= config.strikeProfitPenalty;
                messages.push(msg('alert', 'STRIKE ALERT', `${c.name} workers striking! Operations frozen, cash drainage: ${formatMoney(activeProfit)}/mo.`));
            }

            if (activeProfit < 0) {
                const drainage = Math.abs(activeProfit);
                c.debt += drainage;

                const viabilityCost = Math.ceil((drainage / c.baseValuation) * config.viabilityCostPerMillion);
                c.viability = Math.max(0, c.viability - viabilityCost);

                messages.push(msg('cash_loss', 'OPERATING REPORT', `${c.name} lost ${formatMoney(drainage)} in operations. Loaded onto company debt. Viability fell by ${viabilityCost}%.`, { company_debt: +drainage }));
            } else {
                state.cash += activeProfit;
                messages.push(msg('cash_gain', 'OPERATING REPORT', `Collected ${formatMoney(activeProfit)} management fee from profitable ${c.name}.`, { cash: +activeProfit }));
            }

            if (c.viability <= 0) {
                triggerAutomaticBankruptcy(c);
                messages.push(msg('alert', 'BANKRUPTCY', `${c.name} declared Chapter 7 insolvency. Viability hit 0%. Heat spike!`, { heat: +35 }));
            }
        });

        // Refresh acquisitions
        refreshLocalAcquisitions();

        // Check turn limit
        if (state.turn > config.maxTurns) {
            const go = triggerRetirement();
            return { messages, gameOver: go };
        }

        // Check personal bankruptcy
        const netWorth = calculateNetWorth();
        if (state.cash < 0 && netWorth < 0) {
            const go = triggerPersonalBankruptcy();
            return { messages, gameOver: go };
        }

        // Event roll
        const roll = Math.random() * config.eventRollBase;
        const multiplier = (state.location === 'Delaware') ? 0.25 : 1.0;
        const eventThreshold = state.heat * multiplier;

        if (roll < eventThreshold && state.heat > 0) {
            const pendingEvent = rollBadEvent();
            if (pendingEvent) {
                return { messages, pendingEvent };
            }
        }

        // Upgrade roll
        if (Math.random() < config.upgradeChance) {
            const available = upgradeItems.filter(u => !state.upgrades[u.id]);
            if (available.length > 0) {
                const item = available[Math.floor(Math.random() * available.length)];
                return { messages, pendingUpgrade: item };
            }
        }

        return { messages };
    }

    function resolveUpgrade(item, accept) {
        const messages = [];

        if (accept && state.cash >= item.cost) {
            state.cash -= item.cost;
            state.upgrades[item.id] = true;
            messages.push(msg('cash_loss', 'UPGRADE ACQUIRED', `Purchased ${item.name} for ${formatMoney(item.cost)}.`, { cash: -item.cost }));
        } else if (accept) {
            messages.push(msg('info', 'INSUFFICIENT FUNDS', `Need ${formatMoney(item.cost)} for ${item.name}. You have ${formatMoney(state.cash)}.`, { cash_needed: item.cost, cash_available: state.cash }));
        }

        return { messages };
    }

    function openCompanyModal(companyId) {
        const c = state.companies.find(comp => comp.id === companyId);
        if (!c) return null;
        return cloneDeep(c);
    }

    function performStrip(companyId) {
        const messages = [];
        const c = state.companies.find(comp => comp.id === companyId);
        if (!c || c.assets <= 0) {
            messages.push(msg('info', 'ERROR', 'Cannot strip this company.', { error: true }));
            return { messages };
        }

        const yieldAmt = Math.round(c.assets * config.stripYield);
        state.cash += yieldAmt;

        c.assets = 0;
        c.viability = Math.max(0, c.viability - config.stripViabilityHit);
        c.profit -= config.stripRentCost;
        c.valuation = Math.max(0, Math.round(c.valuation * config.stripValuationMultiplier) - config.stripValuationPenalty);

        messages.push(msg('cash_gain', 'ASSET STRIPPED', `Stripped ${c.name}, yielded ${formatMoney(yieldAmt)}. Viability -${config.stripViabilityHit}%.`, { cash: +yieldAmt }));

        if (c.viability <= 0) {
            triggerAutomaticBankruptcy(c);
            messages.push(msg('alert', 'BANKRUPTCY', `${c.name} collapsed after stripping! Viability hit 0%.`, { heat: +35 }));
        }

        return { messages };
    }

    function performRecap(companyId) {
        const messages = [];
        const c = state.companies.find(comp => comp.id === companyId);
        if (!c || c.valuation <= 0) {
            messages.push(msg('info', 'ERROR', 'Cannot recap this company.', { error: true }));
            return { messages };
        }

        const recapAmt = Math.round(c.valuation * config.recapYield);
        state.cash += recapAmt;

        c.debt += recapAmt;
        c.viability = Math.max(0, c.viability - config.recapViabilityHit);
        c.profit -= Math.round((recapAmt * config.recapInterestRate) / config.operatingProfitDivisor);

        messages.push(msg('cash_gain', 'DIVIDEND RECAP', `Extracted ${formatMoney(recapAmt)} from ${c.name}. Company debt spiked. Viability -${config.recapViabilityHit}%.`, { cash: +recapAmt }));

        if (c.viability <= 0) {
            triggerAutomaticBankruptcy(c);
            messages.push(msg('alert', 'BANKRUPTCY', `${c.name} collapsed after recap! Viability hit 0%.`, { heat: +35 }));
        }

        return { messages };
    }

    function performCut(companyId) {
        const messages = [];
        const c = state.companies.find(comp => comp.id === companyId);
        if (!c) {
            messages.push(msg('info', 'ERROR', 'Cannot cut costs for this company.', { error: true }));
            return { messages };
        }

        c.profit += config.cutSavings;
        c.viability = Math.max(0, c.viability - config.cutViabilityHit);

        const heatGain = applyHeatGain(config.cutHeatGain);
        state.heat = Math.min(100, state.heat + heatGain);

        messages.push(msg('info', 'COST CUTTING', `${c.name} synergy optimization complete. Savings: +${formatMoney(config.cutSavings)}/turn. Heat +${heatGain}%.`, { heat: +heatGain }));

        if (c.viability <= 0) {
            triggerAutomaticBankruptcy(c);
            messages.push(msg('alert', 'BANKRUPTCY', `${c.name} collapsed after cost cutting! Viability hit 0%.`, { heat: +35 }));
        }

        return { messages };
    }

    function performFlip(companyId) {
        const messages = [];
        const c = state.companies.find(comp => comp.id === companyId);
        if (!c) {
            messages.push(msg('info', 'ERROR', 'Cannot flip this company.', { error: true }));
            return { messages };
        }

        const equityVal = c.valuation - c.debt;

        if (equityVal < 0) {
            messages.push(msg('info', 'OUT-OF-THE-MONEY', `Cannot sell ${c.name}. Debt (${formatMoney(c.debt)}) exceeds valuation (${formatMoney(c.valuation)}). Equity: ${formatMoney(equityVal)}.`, { negative_equity: true }));
            return { messages };
        }

        const fee = Math.round(equityVal * config.acquisitionFee);
        const netPayout = equityVal - fee;

        state.cash += netPayout;
        c.isOwned = false;
        c.isSold = true;

        messages.push(msg('cash_gain', 'FLIPPED', `Sold ${c.name} for ${formatMoney(netPayout)} (equity ${formatMoney(equityVal)} - ${formatMoney(fee)} fee).`, { cash: +netPayout }));

        return { messages };
    }

    function performBankrupt(companyId) {
        const messages = [];
        const c = state.companies.find(comp => comp.id === companyId);
        if (!c) {
            messages.push(msg('info', 'ERROR', 'Cannot bankrupt this company.', { error: true }));
            return { messages };
        }

        c.isOwned = false;
        c.isBankrupt = true;

        const heatGain = applyHeatGain(config.bankruptHeatGain);
        state.heat = Math.min(100, state.heat + heatGain);

        messages.push(msg('alert', 'CHAPTER 11', `Voided ${c.name} via bankruptcy loophole. Heat +${heatGain}%.`, { heat: +heatGain }));

        // High heat immediate risk check
        if (state.heat > 75 && Math.random() < 0.50) {
            const pendingEvent = rollBadEvent();
            if (pendingEvent) {
                return { messages, pendingEvent };
            }
        }

        return { messages };
    }

    function initGame() {
        state = createInitialState();
        refreshLocalAcquisitions();
        return { messages: [] };
    }

    function getUpgradeItems() {
        return upgradeItems;
    }

    function getLocations() {
        return locations;
    }

    return {
        getState,
        borrowCash,
        repayDebt,
        buyCompanyCash,
        buyCompanyLeveraged,
        travelTo,
        resolveUpgrade,
        openCompanyModal,
        performStrip,
        performRecap,
        performCut,
        performFlip,
        performBankrupt,
        resolveEvent,
        initGame,
        getUpgradeItems,
        getLocations,
        formatMoney,
        calculateNetWorth
    };
}