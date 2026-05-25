import { createEngine } from './engine.js';
import { showToast, showBreakingToast, initToastContainers } from './components/toast.js';

let audioCtx = null;
let soundEnabled = true;
let engine = null;
let selectedCompanyId = null;
let pendingEventData = null;

export function initRenderer() {
    engine = createEngine();

    initAudio();
    initToastContainers();

    const soundToggle = document.getElementById('sound-toggle');
    soundToggle.addEventListener('click', toggleSound);

    document.addEventListener('keydown', handleKeyDown);

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
        toggleBtn.innerText = '[SOUND: ON]';
        playBeep('success');
    } else {
        toggleBtn.innerText = '[SOUND: OFF]';
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
        }
    } catch (e) {
        console.warn("Web Audio API blocked or not supported:", e);
    }
}

function handleKeyDown(e) {
    const companyModal = document.getElementById('company-modal');
    const eventModal = document.getElementById('event-modal');

    if (eventModal.classList.contains('active') && pendingEventData) {
        const optionButtons = document.querySelectorAll('#event-actions button');
        const keyNum = parseInt(e.key);
        if (keyNum >= 1 && keyNum <= optionButtons.length) {
            optionButtons[keyNum - 1].click();
        }
        return;
    }

    if (companyModal.classList.contains('active')) {
        const key = e.key.toUpperCase();
        if (key === 'S') doStrip();
        else if (key === 'D') doRecap();
        else if (key === 'C') doCut();
        else if (key === 'F') doFlip();
        else if (key === 'X') doBankrupt();
        else if (key === 'E') closeCompanyModal();
        return;
    }

    const key = e.key.toUpperCase();
    if (key === 'B') {
        playBeep('click');
        const result = engine.borrowCash();
        processResult(result);
    } else if (key === 'P') {
        playBeep('click');
        const result = engine.repayDebt();
        processResult(result);
    } else if (key === '1') travelTo('Cayman Islands');
    else if (key === '2') travelTo('Wall Street (NYC)');
    else if (key === '3') travelTo('Silicon Valley');
    else if (key === '4') travelTo('Delaware');
    else if (key === '5') travelTo('London City');
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
            text += "<br><br><span style='color:#33ff33;'>IMMUNITY ACTIVATED: Your funded Supreme Court Justice 'friend' placed an informal call to the regional SEC enforcement office. The investigation is quietly dismissed.</span>";
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
            text += "<br><br><span style='color:#33ff33;'>IMMUNITY ACTIVATED: Your elite private mercenary bodyguards instantly return fire with tactical submachine guns. The assailant is neutralized. You sip your Macallan 25 year single-malt in complete safety.</span>";
            choices = [{ id: 'close', label: 'WIPE A SPECK OF DUST OFF YOUR ARMANI' }];
        } else {
            text += `<br><br><span class='red-highlight'>You survived the impact, but suffered extreme trauma. Undergoing emergency non-union surgical procedures at a private hospital costs a premium of $2,000,000 cash.</span>`;
            choices = [{ id: 'pay', label: `SURRENDER TO CAPITAL HOSPITAL FEES ($2.0M)` }];
        }
    } else if (eventData.eventId === 'expose') {
        title = "INVESTIGATIVE PRESS EXPOSÉ";
        text = `A national investigative reporter has drafted a highly critical story outlining your asset-stripping techniques, calling you a 'Vampire Squid sucking capital from main street'.`;

        if (state.upgrades.ownsNewspaper) {
            text += `<br><br><span style='color:#33ff33;'>MEDIA SHIELD ACTIVATED: You own 'The Financial Sentinel'. You can order your editors to run a smear campaign on the reporter and kill the story, or let it slide.</span>`;
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
        btn.innerHTML = `[${index + 1}] ${choice.label}`;
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

    document.getElementById('turn-display').innerText = `${String(state.turn).padStart(2, '0')}/${30}`;
    document.getElementById('cash-display').innerText = engine.formatMoney(state.cash);

    const debtDisplay = document.getElementById('debt-display');
    debtDisplay.innerText = engine.formatMoney(state.debt);
    debtDisplay.className = state.debt > 0 ? 'red-highlight' : 'white-highlight';

    const nw = engine.calculateNetWorth();
    const nwDisplay = document.getElementById('net-worth-display');
    nwDisplay.innerText = engine.formatMoney(nw);
    nwDisplay.style.color = nw < 0 ? '#ff3333' : '#fff';

    document.getElementById('location-display').innerText = state.location;

    document.getElementById('heat-fill').style.width = `${state.heat}%`;
    document.getElementById('heat-text').innerText = `${state.heat}%`;

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
        btn.innerHTML = `[${shortcut}] ${l.name}`;
        btn.title = l.desc;

        if (state.location === l.name) {
            btn.disabled = true;
            btn.innerHTML += ' (HERE)';
        } else {
            btn.onclick = () => travelTo(l.name);
        }
        travelContainer.appendChild(btn);
    });

    // Upgrades
    const upgradesContainer = document.getElementById('upgrades-status');
    upgradesContainer.innerHTML = '';
    let ownedUpgrades = 0;
    for (let id in state.upgrades) {
        const active = state.upgrades[id];
        const item = engine.getUpgradeItems().find(u => u.id === id);
        if (active) {
            ownedUpgrades++;
            const span = document.createElement('span');
            span.className = 'green-highlight';
            span.innerText = `[x] ${item.name}`;
            span.title = item.desc;
            upgradesContainer.appendChild(span);
        }
    }
    if (ownedUpgrades === 0) {
        upgradesContainer.innerHTML = '<span style="color: rgba(57,255,20,0.5)">[ ] No active legal shields or bribed assets. You are fully exposed to audits and security events.</span>';
    }

    // Portfolio
    const portfolioContainer = document.getElementById('portfolio-list');
    portfolioContainer.innerHTML = '';
    const owned = state.companies.filter(c => c.isOwned);

    if (owned.length === 0) {
        portfolioContainer.innerHTML = '<p style="text-align: center; color: rgba(57, 255, 20, 0.4); padding-top: 40px;">No companies currently in portfolio.<br>Spend cash on Available Targets to execute leveraged buyouts.</p>';
    } else {
        owned.forEach(c => {
            const item = document.createElement('div');
            item.className = 'list-item';

            const strikeLabel = (state.strikeTurns[c.id] && state.strikeTurns[c.id] > 0)
                ? ` <span class="red-highlight">[STRIKE: ${state.strikeTurns[c.id]}t]</span>`
                : '';

            item.innerHTML = `
                <div class="list-item-details">
                    <span class="company-name" onclick="openCompanyModal('${c.id}')">${c.name}</span>${strikeLabel}
                    <div class="company-stats">
                        Valuation: ${engine.formatMoney(c.valuation)} | Company Debt: ${engine.formatMoney(c.debt)} | Viability: ${c.viability}%
                        <br>Flow: <span style="color: ${c.profit < 0 ? '#ff3333' : '#33ff33'}">${c.profit < 0 ? '' : '+'}${engine.formatMoney(c.profit)}/turn</span> | Strip Assets: ${engine.formatMoney(c.assets)}
                    </div>
                </div>
                <div class="list-item-action">
                    <button onclick="openCompanyModal('${c.id}')">[MANAGE]</button>
                </div>
            `;
            portfolioContainer.appendChild(item);
        });
    }

    // Acquisitions
    const acquisitionsContainer = document.getElementById('acquisitions-list');
    acquisitionsContainer.innerHTML = '';

    const visibleAcquisitions = state.availableAcquisitions.filter(c => !c.isOwned);
    if (visibleAcquisitions.length === 0) {
        acquisitionsContainer.innerHTML = '<p style="text-align: center; color: rgba(57, 255, 20, 0.4); padding-top: 40px;">No targets available in this hub.<br>Travel to alternate markets to scout fresh targets.</p>';
    } else {
        visibleAcquisitions.forEach(c => {
            const item = document.createElement('div');
            item.className = 'acquisition-item';

            const equityVal = Math.max(0, c.valuation - c.debt);
            const fee = Math.round(equityVal * 0.10);
            const acqCost = equityVal + fee;

            item.innerHTML = `
                <div class="list-item-details">
                    <span style="font-weight: bold; font-size:15px; color:var(--bb-cyan);">${c.name}</span> <span style="font-size:10px; color:rgba(57,255,20,0.6)">(${c.original})</span>
                    <div class="company-stats">
                        Enterprise Value: ${engine.formatMoney(c.valuation)} | Existing Debt: ${engine.formatMoney(c.debt)}
                        <br>Operating Yield: <span style="color: ${c.profit < 0 ? '#ff3333' : '#33ff33'}">${c.profit < 0 ? '' : '+'}${engine.formatMoney(c.profit)}/turn</span>
                        <br>Strippable Assets: ${engine.formatMoney(c.assets)} | Initial Viability: ${c.viability}%
                    </div>
                </div>
                <div class="acquisition-buttons">
                    <button onclick="buyCompanyCash('${c.id}')">[BUY] CASH</button>
                    <button onclick="buyCompanyLeveraged('${c.id}')">[BUY] LEVERAGED</button>
                </div>
                <div class="acquisition-values">
                    <div class="acquisition-cost-row">${engine.formatMoney(acqCost)}</div>
                    <div class="acquisition-cost-row leveraged">
                        ${engine.formatMoney(Math.round(acqCost * 0.2))} <span class="acquisition-cost-debt">(${engine.formatMoney(Math.round(acqCost * 0.8))})</span>
                    </div>
                </div>
            `;
            acquisitionsContainer.appendChild(item);
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

    document.getElementById('modal-company-viability').innerText = `${c.viability}%`;
    document.getElementById('modal-company-viability').className = c.viability < 40 ? 'red-highlight' : '';

    document.getElementById('modal-company-valuation').innerText = engine.formatMoney(c.valuation);
    document.getElementById('modal-company-assets').innerText = engine.formatMoney(c.assets);
    document.getElementById('modal-company-debt').innerText = engine.formatMoney(c.debt);

    const profDisplay = document.getElementById('modal-company-profit');
    profDisplay.innerText = `${c.profit < 0 ? '' : '+'}${engine.formatMoney(c.profit)} / turn`;
    profDisplay.style.color = c.profit < 0 ? '#ff3333' : '#33ff33';

    document.getElementById('btn-modal-strip').disabled = (c.assets <= 0);
    document.getElementById('btn-modal-recap').disabled = (c.valuation <= 0);

    document.getElementById('company-modal').classList.add('active');
};

window.closeCompanyModal = function() {
    playBeep('click');
    document.getElementById('company-modal').classList.remove('active');
    selectedCompanyId = null;
};

window.buyCompanyCash = function(companyId) {
    playBeep('click');
    const result = engine.buyCompanyCash(companyId);
    result.messages.forEach(m => {
        showSimpleEventAlert(m.title, m.text, m.type);
    });
    updateUI();
};

window.buyCompanyLeveraged = function(companyId) {
    playBeep('click');
    const result = engine.buyCompanyLeveraged(companyId);
    result.messages.forEach(m => {
        showSimpleEventAlert(m.title, m.text, m.type);
    });
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