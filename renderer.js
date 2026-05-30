import { createEngine } from './engine.js';
import { showToast, showBreakingToast, initToastContainers } from './components/toast.js';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

let audioCtx = null;
let soundEnabled = true;
let engine = null;
let selectedCompanyId = null;
let pendingEventData = null;
let companyLboCashPct = {};

export function initRenderer() {
    engine = createEngine();

    initAudio();
    initToastContainers();

    const soundToggle = document.getElementById('sound-toggle');
    soundToggle.addEventListener('click', toggleSound);

    engine.initGame();
    updateUI();
}

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext());
    }
}

function toggleSound() {
    initAudio();
    soundEnabled = !soundEnabled;
    const toggleBtn = document.getElementById('sound-toggle');
    if (soundEnabled) {
        toggleBtn.innerText = 'SOUND';
        playBeep('success');
    } else {
        toggleBtn.innerText = 'MUTED';
        playBeep('success');
    }
}

function playBeep(type) {
    if (!soundEnabled) return;
    initAudio();
    if (!audioCtx) return;

    try {
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (type === 'click') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.05);
        } else if (type === 'travel') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(320, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.18);
            gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.18);
        } else if (type === 'success') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
            osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.08);
            osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.16);
            gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.3);
        } else if (type === 'alert') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(140, audioCtx.currentTime);
            osc.frequency.setValueAtTime(100, audioCtx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.25);
        } else if (type === 'gameover') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(280, audioCtx.currentTime);
            osc.frequency.linearRampToValueAtTime(40, audioCtx.currentTime + 0.8);
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.8);
        } else if (type === 'breaking') {
            const beepDuration = 0.06;
            const beepGap = 0.045;
            for (let i = 0; i < 4; i++) {
                const startTime = audioCtx.currentTime + i * (beepDuration + beepGap);
                osc.frequency.setValueAtTime(880, startTime);
                gain.gain.setValueAtTime(0.08, startTime);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + beepDuration);
            }
            osc.start();
            osc.stop(audioCtx.currentTime + 4 * (beepDuration + beepGap));
        }
    } catch (e) {
        console.warn("Web Audio API blocked or not supported:", e);
    }
}

function processResult(result) {
    if (!result) return;

    if (result.messages) {
        result.messages.forEach(m => {
            showSimpleEventAlert(m.title, m.text, m.type);
        });
    }

    if (result.pendingEvent) {
        pendingEventData = result.pendingEvent;
        showEventModalFromEngine(result.pendingEvent);
    }

    if (result.pendingUpgrade) {
        showUpgradeModal(result.pendingUpgrade);
    }

    if (result.gameOver) {
        playBeep('gameover');
        showGameOverModal(result);
    }

    updateUI();
}

function showEventModalFromEngine(eventData) {
    playBeep('alert');

    let title = '';
    let text = '';
    let choices = [];

    const state = engine.getState();

    if (eventData.eventId === 'sec_audit') {
        title = "SEC SECURITIES FRAUD AUDIT";
        text = "Federal regulators are investigating a string of suspicious dividend recap loans and asset stripping shell networks linked to your fund.";

        if (state.upgrades.hasJusticeFriend) {
            text += "<br><br><span style='color:var(--bb-green);'>IMMUNITY ACTIVATED: Your funded Supreme Court Justice 'friend' placed an informal call to the regional SEC enforcement office. The investigation is quietly dismissed.</span>";
            choices = [{ id: 'close', label: 'CLOSE LAW BOOK AND LAUGH' }];
        } else {
            text += "<br><br>The Department of Justice offers a settlement to bury the charges. Do you pay or call the lawyers?";
            choices = [
                { id: 'pay', label: `PAY SETTLEMENT (${engine.formatMoney(2500000)})` },
                { id: 'fight', label: `FIGHT AUDIT IN COURT (Lawyers: ${engine.formatMoney(1000000)} | Heat +30%)` }
            ];
        }
    } else if (eventData.eventId === 'union_strike') {
        const owned = state.companies.filter(c => c.isOwned);
        const targetComp = owned.find(c => c.id === eventData.targetCompanyId) || owned[Math.floor(Math.random() * owned.length)];
        title = "UNION PENSION PROTEST";
        text = `Angry employees and union pension organizers have blockaded the corporate headquarters of <span class='white-highlight'>${targetComp.name}</span>. They are chanting about "parasites" and refusing to work. Operations are fully frozen!
             <br><br><span class='red-highlight'>Effect: ${targetComp.name} Valuation halved. Monthly operations drop by -$300k/turn for the next 3 turns. Regulatory heat increases.</span>`;
        choices = [{ id: 'bust', label: 'RELEASE THE UNION BUSTERS' }];
    } else if (eventData.eventId === 'assassination') {
        title = "LUIGI MANGIONE RETALIATION STRIKE";
        text = "An angry former factory supervisor who was fired during one of your cost-cutting synergy campaigns has tracked your towncar and pulled a high-powered weapon!";

        if (state.upgrades.hasMercSec) {
            text += "<br><br><span style='color:var(--bb-green);'>IMMUNITY ACTIVATED: Your elite private mercenary bodyguards instantly return fire with tactical submachine guns. The assailant is neutralized. You sip your Macallan 25 year single-malt in complete safety.</span>";
            choices = [{ id: 'close', label: 'WIPE A SPECK OF DUST OFF YOUR ARMANI' }];
        } else {
            text += `<br><br><span class='red-highlight'>You survived the impact, but suffered extreme trauma. Undergoing emergency non-union surgical procedures at a private hospital costs a premium of $2,000,000 cash.</span>`;
            choices = [{ id: 'pay', label: `SURRENDER TO CAPITAL HOSPITAL FEES ($2.0M)` }];
        }
    } else if (eventData.eventId === 'expose') {
        title = "INVESTIGATIVE PRESS EXPOSÉ";
        text = `A national investigative reporter has drafted a highly critical story outlining your asset-stripping techniques, calling you a 'Vampire Squid sucking capital from main street'.`;

        if (state.upgrades.ownsNewspaper) {
            text += `<br><br><span style='color:var(--bb-green);'>MEDIA SHIELD ACTIVATED: You own 'The Financial Sentinel'. You can order your editors to run a smear campaign on the reporter and kill the story, or let it slide.</span>`;
            choices = [
                { id: 'kill', label: `SPIKE STORY & SMEAR REPORTER (${engine.formatMoney(200000)})` },
                { id: 'let', label: 'LET STORY PUBLISH (No cost)' }
            ];
        } else {
            text += `<br><br><span class='red-highlight'>Effect: Regulatory Heat +35%. Shadow bankers are spooked: Your personal borrowing credit is frozen for 3 turns.</span>`;
            choices = [{ id: 'close', label: 'SIGH AND CLOSE THE BLINDS' }];
        }
    } else if (eventData.eventId === 'macro') {
        title = "MACRO CREDIT CRISIS MELTDOWN";
        text = "A rapid spike in federal interest rates trigger a violent macro credit squeeze. Global investment banks are scrambling for collateral. Liquidity is freezing!";
        choices = [{ id: 'prepare', label: 'PREPARE FOR INFLATION SPIKE' }];
    }

    // Pseudo-ack events: single choice that doesn't require real decision
    const PSEUDO_ACK_CLASSIC = [
        { eventId: 'sec_audit', choiceId: 'close' } // SEC with Justice Friend
    ];

    const PSEUDO_ACK_BREAKING = [
        { eventId: 'union_strike', choiceId: 'bust' },
        { eventId: 'assassination', choiceId: 'close' }, // with MercSec
        { eventId: 'expose', choiceId: 'close' }, // without newspaper
        { eventId: 'macro', choiceId: 'prepare' }
    ];

    const isPseudoAckClassic = PSEUDO_ACK_CLASSIC.some(p => p.eventId === eventData.eventId && choices.length === 1 && choices[0].id === p.choiceId);
    const isPseudoAckBreaking = PSEUDO_ACK_BREAKING.some(p => p.eventId === eventData.eventId && choices.length === 1 && choices[0].id === p.choiceId);

    if (isPseudoAckClassic || isPseudoAckBreaking) {
        // Show toast and immediately resolve event
        if (isPseudoAckClassic) {
            showToast(title, text);
        } else {
            showBreakingToast(title, text);
        }

        engine.pendingCompanyId = eventData.targetCompanyId;
        const result = engine.resolveEvent(eventData.eventId, choices[0].id);
        if (result.gameOver) {
            playBeep('gameover');
            showGameOverModal(result);
        } else if (result.messages) {
            result.messages.forEach(m => {
                showSimpleEventAlert(m.title, m.text, m.type);
            });
        }
        pendingEventData = null;
        updateUI();
    } else {
        showEventModal(title, text, choices, eventData.eventId);
    }
}

function showEventModal(title, text, choices, eventId = null) {
    playBeep('alert');
    document.getElementById('event-title').innerText = title;
    document.getElementById('event-body').innerHTML = text;

    const btnContainer = document.getElementById('event-actions');
    btnContainer.innerHTML = '';

    choices.forEach((choice, index) => {
        const btn = document.createElement('button');
        btn.innerHTML = ` ${choice.label}`;
        btn.onclick = () => {
            playBeep('click');
            closeEventModal();
            if (eventId) {
                engine.pendingCompanyId = pendingEventData?.targetCompanyId;
                const result = engine.resolveEvent(eventId, choice.id);
                if (result.gameOver) {
                    playBeep('gameover');
                    showGameOverModal(result);
                } else {
                    result.messages.forEach(m => {
                        showSimpleEventAlert(m.title, m.text, m.type);
                    });
                }
                pendingEventData = null;
                updateUI();
            }
        };
        btnContainer.appendChild(btn);
    });

    document.getElementById('event-modal').classList.add('active');
}

function closeEventModal() {
    document.getElementById('event-modal').classList.remove('active');
}

function showSimpleEventAlert(title, text, type = 'info') {
    if (type === 'alert') {
        playBeep('breaking');
        showBreakingToast(title, text);
    } else {
        showToast(title, text);
    }
}

function showUpgradeModal(item) {
    const title = "EXCLUSIVE CORRUPT OPPORTUNITY";
    const text = `${item.triggerText}
                 <br><br><strong>Asset:</strong> <span class='white-highlight'>${item.name}</span>
                 <br><strong>Cost:</strong> <span class='white-highlight'>${engine.formatMoney(item.cost)}</span>
                 <br><strong>Effect:</strong> ${item.desc}`;

    const acceptDisabled = engine.getState().cash < item.cost;

    showEventModal(title, text, [
        {
            id: 'accept',
            label: acceptDisabled ? `INSUFFICIENT FUNDS (${engine.formatMoney(item.cost)})` : `WIRE THE TRANSFER (${engine.formatMoney(item.cost)})`
        },
        { id: 'decline', label: 'DECLINE THE PROPOSAL' }
    ], null);

    const btns = document.querySelectorAll('#event-actions button');
    btns[0].onclick = () => {
        playBeep('click');
        closeEventModal();
        const result = engine.resolveUpgrade(item, true);
        result.messages.forEach(m => {
            showSimpleEventAlert(m.title, m.text, m.type);
        });
        updateUI();
    };
    btns[1].onclick = () => {
        playBeep('click');
        closeEventModal();
        engine.resolveUpgrade(item, false);
        updateUI();
    };
}

function showGameOverModal(result) {
    showEventModal(result.title, result.text, [
        { id: 'restart', label: 'START A NEW VENTURE (RESTART)' }
    ]);
    const btns = document.querySelectorAll('#event-actions button');
    btns[0].onclick = () => {
        playBeep('click');
        closeEventModal();
        engine.initGame();
        updateUI();
    };
}

function updateUI() {
    const state = engine.getState();

    const totalMonths = state.gameStartMonth + state.turn - 1;
    const currentMonth = totalMonths % 12;
    const currentYear = state.gameStartYear + Math.floor(totalMonths / 12);
    const quarter = Math.ceil((currentMonth + 1) / 3);
    const monthName = MONTHS[currentMonth];
    document.getElementById('date-bar-display').innerText = `${monthName} ${currentYear} (Q${quarter})`;
    document.getElementById('turn-display').innerText = `turn ${String(state.turn).padStart(2, '0')}/30`;

    document.getElementById('cash-display').innerText = engine.formatMoney(state.cash);

    const debtDisplay = document.getElementById('debt-display');
    debtDisplay.innerText = engine.formatMoney(state.debt);
    debtDisplay.className = state.debt > 0 ? 'red-highlight' : 'white-highlight';

    const nw = engine.calculateNetWorth();
    const nwDisplay = document.getElementById('net-worth-display');
    nwDisplay.innerText = engine.formatMoney(nw);
    nwDisplay.style.color = nw < 0 ? 'var(--bb-red)' : '#fff';

    const luigiCount = Math.floor(state.heat / 10);
    document.getElementById('heat-text').innerText = `Heat ${luigiCount} Luigi's`;

    const rate = state.upgrades.hasShellCorp ? "5.0%" : "10.0%";
    document.getElementById('interest-rate-text').innerText = `${rate} / turn`;

    const limit = state.upgrades.hasShellCorp ? "$20.0M" : "$10.0M";
    document.getElementById('credit-limit-text').innerText = limit;

    // Travel buttons
    const travelContainer = document.getElementById('travel-buttons');
    travelContainer.innerHTML = '';
    engine.getLocations().forEach((l, index) => {
        const btn = document.createElement('button');
        const shortcut = index + 1;
        btn.innerHTML = ` ${l.name}`;
        btn.title = l.desc;

        if (state.location === l.name) {
            btn.disabled = true;
            btn.style.backgroundColor = '#444';
        } else {
            btn.style.backgroundColor = '#000';
            btn.onclick = () => travelTo(l.name);
        }
        travelContainer.appendChild(btn);
    });

    // Synergies
    const synergiesContainer = document.getElementById('upgrades-status');
    synergiesContainer.innerHTML = '';
    const upgradeItems = engine.getUpgradeItems();
    const synergies = engine.getState().synergies;

    upgradeItems.forEach(item => {
        const isOwned = state.upgrades[item.id];
        const isTriggered = synergies.triggeredThisTurn === item.id;
        const currentCost = isTriggered ? item.cost : item.cost * 10;
        const canAfford = state.cash >= currentCost;

        const div = document.createElement('div');
        div.style.cssText = 'display: flex; align-items: center; justify-content: space-between; width: 100%;';

        if (isOwned) {
            div.innerHTML = `
                <div style="display: flex; flex-direction: column;">
                    <span style="color: var(--accent); font-size: 14px; padding: 8px 10px 4px 14px;" title="${item.desc}">${item.name}</span>
                    <span style="font-size: 10px; color: var(--muted); padding: 0 10px 8px 14px;">${item.shortDesc}</span>
                </div>
                <span class="green-highlight" style="font-size: 14px;">&#10003;</span>
            `;
        } else {
            div.innerHTML = `
                <div style="display: flex; flex-direction: column;">
                    <span style="color: var(--accent); font-size: 14px; padding: 8px 10px 4px 14px;" title="${item.desc}">${item.name}</span>
                    <span style="font-size: 10px; color: var(--muted); padding: 0 10px 8px 14px;">${item.shortDesc}</span>
                </div>
                <span style="display: flex; align-items: center; gap: 8px;">
                    <span style="color: var(--accent2); font-size: 18px; font-weight: 300; line-height: 1.1;">${engine.formatMoney(currentCost)}</span>
                    <button onclick="purchaseSynergy('${item.id}')" ${canAfford ? '' : 'disabled'} style="padding: 8px 10px; font-size: 11px; color: #fff; cursor: pointer; border: 1px solid var(--border); background: #222; text-transform: uppercase;">BUY</button>
                </span>
            `;
        }

        synergiesContainer.appendChild(div);
    });

    // Portfolio
    const portfolioContainer = document.getElementById('portfolio-list');
    portfolioContainer.innerHTML = '';
    const owned = state.companies.filter(c => c.isOwned);

    if (owned.length === 0) {
        portfolioContainer.innerHTML = '<p style="text-align: center; color: var(--muted); padding: 8px 10px 8px 14px;">Buy companies to manage portfolio, change locations to advance date</p>';
    } else {
        owned.forEach(c => {
            const strikeLabel = (state.strikeTurns[c.id] && state.strikeTurns[c.id] > 0)
                ? ` <span class="red-highlight">[STRIKE: ${state.strikeTurns[c.id]}t]</span>`
                : '';
            const profitClass = c.profit < 0 ? 'neg' : '';

            portfolioContainer.innerHTML += `
                <div class="company-panel">
                    <div class="company-header">
                        <div class="company-info">
                            <div class="company-name-row">${c.name}${strikeLabel} <span class="viability ${engine.getViabilityRatingClass(c.viability)}">${engine.getViabilityRating(c.viability)}</span></div>
                            <div class="company-ticker">${c.description}</div>
                            <div class="metrics">
                                EV ${engine.formatMoney(c.valuation)} · Debt ${engine.formatMoney(c.debt)} · Assets ${engine.formatMoney(c.assets)} · <span class="${profitClass}">${c.profit < 0 ? '' : '+'}${engine.formatMoney(c.profit)}/turn</span>
                            </div>
                        </div>
                        <button class="btn btn-manage" onclick="openCompanyModal('${c.id}')">
                            <span class="btn-action">MANAGE</span>
                        </button>
                    </div>
                </div>
            `;
        });
    }

    // Acquisitions
    const acquisitionsContainer = document.getElementById('acquisitions-list');
    acquisitionsContainer.innerHTML = '';

    const visibleAcquisitions = state.availableAcquisitions.filter(c => !c.isOwned);
    if (visibleAcquisitions.length === 0) {
        acquisitionsContainer.innerHTML = '<p style="text-align: center; color: var(--bb-green); opacity: 0.4; padding: 40px 10px 40px 14px;">No targets available in this hub.<br>Travel to alternate markets to scout fresh targets.</p>';
    } else {
        visibleAcquisitions.forEach(c => {
            const equityVal = Math.max(0, c.valuation - c.debt);
            const fee = Math.round(equityVal * 0.10);
            const acqCost = equityVal + fee;
            const cashPct = companyLboCashPct[c.id] || 0.20;
            const leveragedDown = Math.round(acqCost * cashPct);
            const leveragedDebt = Math.round(acqCost * (1 - cashPct));
            const profitClass = c.profit < 0 ? 'neg' : '';

            acquisitionsContainer.innerHTML += `
                <div class="company-panel">
                    <div class="company-header">
                        <div class="company-info">
                            <div class="company-name-row">${c.name} <span class="viability ${engine.getViabilityRatingClass(c.viability)}">${engine.getViabilityRating(c.viability)}</span></div>
                            <div class="company-ticker">${c.description}</div>
                            <div class="metrics">
                                <span class="metric-item">EV ${engine.formatMoney(c.valuation)}</span> · <span class="metric-item">Debt: <span class="debt-red">${engine.formatMoney(c.debt)}</span></span> · <span class="metric-item">Assets ${engine.formatMoney(c.assets)}</span> · Profit <span class="${profitClass}">${c.profit < 0 ? '' : '+'}${engine.formatMoney(c.profit)}/turn</span>
                            </div>
                        </div>
                        <div class="lbo-info">
                            <span class="lbo-price">${engine.formatMoney(leveragedDown)}</span>
                            <span class="lbo-debt"><span class="debt-label">Debt</span><br><span class="debt-red">+${engine.formatMoney(leveragedDebt)}</span></span>
                            <span class="lbo-impact">Impact<br><span class="${engine.getViabilityRatingClass(Math.max(0, c.viability - Math.ceil((leveragedDebt / c.baseValuation) * 20)))}">${engine.getViabilityRating(Math.max(0, c.viability - Math.ceil((leveragedDebt / c.baseValuation) * 20)))}</span></span>
                        </div>
                        <div class="lbo-right">
                            <button class="btn btn-lbo" onclick="buyCompanyLeveraged('${c.id}')">
                                <span class="btn-action">BUY LBO<br>${Math.round(cashPct * 100)}% CASH</span>
                            </button>
                            <div class="lbo-cash-ctrl">
                                <button onclick="adjustLboCashPct('${c.id}', 0.10)">+</button>
                                <button onclick="adjustLboCashPct('${c.id}', -0.10)">−</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
    }
}

// Global functions called from HTML onclick handlers
window.openCompanyModal = function(companyId) {
    playBeep('click');
    selectedCompanyId = companyId;
    const c = engine.openCompanyModal(companyId);
    if (!c) return;

    document.getElementById('modal-company-title').innerText = `${c.name.toUpperCase()} (PARODY OF ${c.original.toUpperCase()})`;
    document.getElementById('modal-company-desc').innerText = c.description;

    document.getElementById('modal-company-viability').innerText = engine.getViabilityRating(c.viability);
    document.getElementById('modal-company-viability').className = engine.getViabilityRatingClass(c.viability);

    document.getElementById('modal-company-valuation').innerText = engine.formatMoney(c.valuation);
    document.getElementById('modal-company-assets').innerText = engine.formatMoney(c.assets);
    document.getElementById('modal-company-debt').innerText = engine.formatMoney(c.debt);

    const profDisplay = document.getElementById('modal-company-profit');
    profDisplay.innerText = `${c.profit < 0 ? '' : '+'}${engine.formatMoney(c.profit)} / turn`;
    profDisplay.style.color = c.profit < 0 ? 'var(--bb-red)' : 'var(--bb-green)';

    document.getElementById('btn-modal-strip').disabled = (c.assets <= 0);
    document.getElementById('btn-modal-recap').disabled = (c.valuation <= 0);

    document.getElementById('company-modal').classList.add('active');
};

window.closeCompanyModal = function() {
    playBeep('click');
    document.getElementById('company-modal').classList.remove('active');
    selectedCompanyId = null;
};

window.buyCompanyLeveraged = function(companyId) {
    playBeep('click');
    const cashPct = companyLboCashPct[companyId] || 0.20;
    const result = engine.buyCompanyLeveraged(companyId, cashPct);
    result.messages.forEach(m => {
        showSimpleEventAlert(m.title, m.text, m.type);
    });
    updateUI();
};

window.adjustLboCashPct = function(companyId, delta) {
    playBeep('click');
    if (!companyLboCashPct[companyId]) {
        companyLboCashPct[companyId] = 0.20;
    }
    companyLboCashPct[companyId] = Math.round((companyLboCashPct[companyId] + delta) * 100) / 100;
    updateUI();
};

function travelTo(locName) {
    playBeep('travel');
    const result = engine.travelTo(locName);

    result.messages.forEach(m => {
        showSimpleEventAlert(m.title, m.text, m.type);
    });

    if (result.pendingEvent) {
        pendingEventData = result.pendingEvent;
        showEventModalFromEngine(result.pendingEvent);
    }

    if (result.pendingUpgrade) {
        showUpgradeModal(result.pendingUpgrade);
    }

    if (result.gameOver) {
        playBeep('gameover');
        showGameOverModal(result);
    }

    updateUI();
}

function doStrip() {
    if (!selectedCompanyId) return;
    playBeep('click');
    const result = engine.performStrip(selectedCompanyId);
    result.messages.forEach(m => {
        showSimpleEventAlert(m.title, m.text, m.type);
    });
    if (engine.getState().companies.find(c => c.id === selectedCompanyId).isOwned) {
        openCompanyModal(selectedCompanyId);
    } else {
        closeCompanyModal();
    }
    updateUI();
}

function doRecap() {
    if (!selectedCompanyId) return;
    playBeep('click');
    const result = engine.performRecap(selectedCompanyId);
    result.messages.forEach(m => {
        showSimpleEventAlert(m.title, m.text, m.type);
    });
    if (engine.getState().companies.find(c => c.id === selectedCompanyId).isOwned) {
        openCompanyModal(selectedCompanyId);
    } else {
        closeCompanyModal();
    }
    updateUI();
}

function doCut() {
    if (!selectedCompanyId) return;
    playBeep('click');
    const result = engine.performCut(selectedCompanyId);
    result.messages.forEach(m => {
        showSimpleEventAlert(m.title, m.text, m.type);
    });
    if (engine.getState().companies.find(c => c.id === selectedCompanyId).isOwned) {
        openCompanyModal(selectedCompanyId);
    } else {
        closeCompanyModal();
    }
    updateUI();
}

function doFlip() {
    if (!selectedCompanyId) return;
    playBeep('click');
    const result = engine.performFlip(selectedCompanyId);
    result.messages.forEach(m => {
        showSimpleEventAlert(m.title, m.text, m.type);
    });
    closeCompanyModal();
    updateUI();
}

function doBankrupt() {
    if (!selectedCompanyId) return;
    playBeep('click');
    const result = engine.performBankrupt(selectedCompanyId);
    result.messages.forEach(m => {
        showSimpleEventAlert(m.title, m.text, m.type);
    });
    closeCompanyModal();

    if (result.pendingEvent) {
        pendingEventData = result.pendingEvent;
        showEventModalFromEngine(result.pendingEvent);
    }

    updateUI();
}

window.travelTo = travelTo;
window.doStrip = doStrip;
window.doRecap = doRecap;
window.doCut = doCut;
window.doFlip = doFlip;
window.doBankrupt = doBankrupt;

// These need to be global for the HTML onclick handlers
window.performStrip = function() { doStrip(); };
window.performRecap = function() { doRecap(); };
window.performCut = function() { doCut(); };
window.performFlip = function() { doFlip(); };
window.performBankrupt = function() { doBankrupt(); };
window.borrowCash = function() {
    playBeep('click');
    const result = engine.borrowCash();
    processResult(result);
};
window.repayDebt = function() {
    playBeep('click');
    const result = engine.repayDebt();
    processResult(result);
};
window.purchaseSynergy = function(upgradeId) {
    playBeep('click');
    const result = engine.purchaseSynergy(upgradeId);
    result.messages.forEach(m => {
        showSimpleEventAlert(m.title, m.text, m.type);
    });
    updateUI();
};
