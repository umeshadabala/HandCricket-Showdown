const $ = sel => document.querySelector(sel);
const show = id => $(id).classList.remove('hidden');
const hide = id => $(id).classList.add('hidden');

const ui = {
    youScore: $('#youScore'),
    cpuScore: $('#cpuScore'),
    revives: $('#revives'),
    status: $('#status'),
    prompt: $('#prompt'),
    phase: $('#phaseHeading'),
    title: '#screenTitle',
    mode: '#screenMode',
    tossPar: '#screenTossParity',
    tossNum: '#screenTossNumber',
    choose: '#screenChooseRole',
    play: '#screenPlay',
    btnChooseNumber: $('#btnChooseNumber'),
    btnModeSelect: $('#btnModeSelect'),
    btnModeNormal: $('#btnModeNormal'),
    btnModeCrazy: $('#btnModeCrazy'),
    btnModeBack: $('#btnModeBack'),
    btnOdd: $('#btnOdd'),
    btnEven: $('#btnEven'),
    btnTossBack: $('#btnTossBack'),
    gridToss: $('#gridTossNums'),
    btnTossNumBack: $('#btnTossNumBack'),
    btnBatFirst: $('#btnBatFirst'),
    btnBowlFirst: $('#btnBowlFirst'),
    gridPlay: $('#gridPlayNums'),
    btnRevive: $('#btnRevive'),
    btnSkip: $('#btnSkip'),
    btnReset: $('#btnReset'),
};

const G = {
    mode: null,
    screen: 'title',
    parityPick: null,
    tossUserNum: null,
    playerFirstRole: null,
    phase: 'idle',
    player: 0,
    cpu: 0,
    life: 1,
    usedRevives: 0,
    pendingOut: null,
    inputLocked: false,
};

function randi(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function disableGrid(disabled) {
    [...ui.gridPlay.querySelectorAll('button')].forEach(b => b.disabled = disabled);
    G.inputLocked = disabled;
}
function setReviveBar(visible) {
    ui.btnRevive.disabled = !visible;
    ui.btnSkip.disabled = !visible;
}

function baseCost(score) {
    if (score < 20) return 0;
    if (score < 50) return 10;
    if (score < 100) return 20;
    if (score < 150) return 30;
    return -1;
}
function scaledReviveCost(score, reviveIndex) {
    if (score >= 150) return score - 70;
    let b = baseCost(score);
    if (b < 0) b = 30;
    const r = Math.max(1, Math.min(5, reviveIndex));
    const multipliers = { 1: 1.00, 2: 1.10, 3: 1.20, 4: 1.30, 5: 1.50 };
    return Math.ceil(b * multipliers[r]);
}

function resolveNormal(p, c, cur) {
    if (p === c) {
        return { status: 'out', score: cur, gain: 0 };
    }
    return { status: 'runs', score: cur + p, gain: p };
}
function resolveCrazy(p, c, cur) {
    if (p === c) {
        const gain = p * c;
        return { status: 'runs', score: cur + gain, gain };
    }
    if (Math.abs(p - c) === 1) {
        return { status: 'out', score: cur, gain: 0 };
    }
    return { status: 'runs', score: cur + p, gain: p };
}
function currentResolver() { return G.mode === 'crazy' ? resolveCrazy : resolveNormal; }

function setHUD(status, prompt) {
    ui.youScore.textContent = `You: ${G.player}`;
    ui.cpuScore.textContent = `CPU: ${G.cpu}`;
    ui.revives.textContent = `Revives: ${G.usedRevives}/5`;
    if (status !== undefined) ui.status.textContent = status;
    if (prompt !== undefined) ui.prompt.textContent = prompt;
}
function goto(screen) {
    [ui.title, ui.mode, ui.tossPar, ui.tossNum, ui.choose, ui.play].forEach(id => hide(id));
    show(screen);
    G.screen = screen.substring(1);
}

function buildNumGrid(parent, onClick) {
    parent.innerHTML = '';
    for (let i = 1; i <= 10; i++) {
        const b = document.createElement('button');
        b.textContent = String(i);
        b.type = 'button';
        b.addEventListener('click', () => onClick(i));
        parent.appendChild(b);
    }
}

function resetAll() {
    G.mode = null; G.parityPick = null; G.tossUserNum = null; G.playerFirstRole = null;
    G.phase = 'idle'; G.player = 0; G.cpu = 0; G.life = 1; G.usedRevives = 0;
    G.pendingOut = null; G.inputLocked = false;
    setReviveBar(false); disableGrid(false);
    ui.phase.textContent = 'Innings';
    setHUD('Welcome!', 'Tap a button to start');
    goto(ui.title);
}
function startModeSelect() { setHUD('Select game mode', 'Normal or Crazy?'); goto(ui.mode); }
function pickMode(m) { G.mode = m; setHUD('Toss: Odd or Even?', 'Choose odd/even'); goto(ui.tossPar); }
function pickParity(p) { G.parityPick = p; setHUD(`Toss: You picked ${p}`, 'Choose your toss number (1–10)'); goto(ui.tossNum); }
function pickTossNumber(num) {
    const cpu = randi(1, 10);
    const sum = num + cpu;
    const res = (sum % 2 === 0) ? 'even' : 'odd';
    if (res === G.parityPick) {
        setHUD(`You:${num} CPU:${cpu} → ${res.toUpperCase()} • You won the toss!`, 'Bat first or Bowl first?');
        goto(ui.choose);
    } else {
        const cpuChoice = Math.random() < 0.5 ? 'bat' : 'bowl';
        G.playerFirstRole = (cpuChoice === 'bat') ? 'bowl' : 'bat';
        setHUD(`You:${num} CPU:${cpu} → ${res.toUpperCase()} • CPU chooses ${cpuChoice}.`, '');
        startMatch();
    }
}
function chooseRole(role) { G.playerFirstRole = role; startMatch(); }
function startMatch() {
    G.player = 0; G.cpu = 0; G.life = 1; G.usedRevives = 0;
    G.pendingOut = null; G.inputLocked = false; setReviveBar(false);
    goto(ui.play);
    if (G.playerFirstRole === 'bat') {
        G.phase = 'innings1';
        ui.phase.textContent = 'Innings 1: You bat';
        setHUD('Innings 1: You bat', 'Pick 1–10');
    } else {
        G.phase = 'innings1';
        ui.phase.textContent = 'Innings 1: You bowl';
        setHUD('Innings 1: You bowl', 'Bowl 1–10');
    }
}
function swapToInnings2() {
    G.pendingOut = null; setReviveBar(false); disableGrid(false);
    G.phase = 'innings2';
    if (G.playerFirstRole === 'bat') {
        ui.phase.textContent = 'Innings 2: You bowl';
        setHUD(ui.status.textContent, `Bowl 1–10 • CPU needs > ${G.player}`);
    } else {
        ui.phase.textContent = 'Innings 2: You bat';
        setHUD(ui.status.textContent, `Pick 1–10 • Need > ${G.cpu}`);
    }
}
function endMatch() {
    G.pendingOut = null; setReviveBar(false); disableGrid(true);
    G.phase = 'end';
    let msg = '';
    if (G.playerFirstRole === 'bat') {
        if (G.cpu > G.player) msg = `CPU wins ${G.cpu} > ${G.player} • Tap Reset`;
        else if (G.cpu === G.player) msg = 'Tie • Tap Reset';
        else msg = 'You win! • Tap Reset';
    } else {
        if (G.player > G.cpu) msg = 'You win the chase! • Tap Reset';
        else if (G.player === G.cpu) msg = 'Tie • Tap Reset';
        else msg = 'CPU wins • Tap Reset';
    }
    setHUD(ui.status.textContent, msg);
}

function pressNumber(val) {
    if (G.phase === 'end' || G.inputLocked) return;
    if (G.screen === 'screenTossNumber') { pickTossNumber(val); return; }
    if (G.screen !== 'screenPlay') return;

    const cpu = randi(1, 10);

    if (G.phase === 'innings1' && G.playerFirstRole === 'bat') {
        const R = currentResolver()(val, cpu, G.player);
        if (R.status === 'out') {
            G.life -= 1;
            if (G.usedRevives < 5) {
                G.pendingOut = 'bat1';
                setReviveBar(true);
                disableGrid(true);
                setHUD(`You:${val} CPU:${cpu} → OUT! Revive?`, 'Tap Revive or Skip below');
            } else {
                setHUD(`You:${val} CPU:${cpu} → OUT!`, '');
                swapToInnings2();
            }
        } else {
            G.player = R.score;
            setHUD(`You:${val} CPU:${cpu} → +${R.gain}`, 'Pick 1–10');
        }
        return;
    }

    if (G.phase === 'innings1' && G.playerFirstRole === 'bowl') {
        if (G.mode === 'crazy') {
            if (Math.abs(val - cpu) === 1) {
                setHUD(`You:${val} CPU:${cpu} → WICKET!`, '');
                swapToInnings2(); return;
            }
            const gain = (val === cpu) ? cpu * val : cpu;
            G.cpu += gain;
            setHUD(`You:${val} CPU:${cpu} → CPU +${gain}`, 'Bowl 1–10');
        } else {
            if (val === cpu) {
                setHUD(`You:${val} CPU:${cpu} → WICKET!`, '');
                swapToInnings2(); return;
            }
            const gain = cpu;
            G.cpu += gain;
            setHUD(`You:${val} CPU:${cpu} → CPU +${gain}`, 'Bowl 1–10');
        }
        return;
    }

    if (G.phase === 'innings2' && G.playerFirstRole === 'bowl') {
        const R = currentResolver()(val, cpu, G.player);
        if (R.status === 'out') {
            G.life -= 1;
            if (G.usedRevives < 5) {
                G.pendingOut = 'bat2';
                setReviveBar(true);
                disableGrid(true);
                setHUD(`You:${val} CPU:${cpu} → OUT! Revive?`, 'Tap Revive or Skip below');
            } else {
                endMatch();
            }
        } else {
            G.player = R.score;
            setHUD(`You:${val} CPU:${cpu} → +${R.gain}`, `Need > ${G.cpu} to win`);
            if (G.player > G.cpu) { endMatch(); }
        }
        return;
    }

    if (G.phase === 'innings2' && G.playerFirstRole === 'bat') {
        if (G.mode === 'crazy') {
            if (Math.abs(val - cpu) === 1) {
                setHUD(`You:${val} CPU:${cpu} → WICKET! You win!`, '');
                endMatch(); return;
            }
            const gain = (val === cpu) ? cpu * val : cpu;
            G.cpu += gain;
            setHUD(`You:${val} CPU:${cpu} → CPU +${gain}`, '');
        } else {
            if (val === cpu) {
                setHUD(`You:${val} CPU:${cpu} → WICKET! You win!`, '');
                endMatch(); return;
            }
            const gain = cpu;
            G.cpu += gain;
            setHUD(`You:${val} CPU:${cpu} → CPU +${gain}`, '');
        }
        if (G.cpu > G.player) { endMatch(); }
    }
}

function decideRevive(accept) {
    if (!G.pendingOut) return;
    if (!accept) {
        const tag = G.pendingOut; G.pendingOut = null; setReviveBar(false); disableGrid(false);
        if (tag === 'bat1') swapToInnings2(); else endMatch();
        return;
    }
    const cost = scaledReviveCost(G.player, G.usedRevives + 1);
    const newScore = G.player - cost;
    setHUD(`Revive cost ${cost}. Score → ${newScore}.`, '');
    if (newScore < 0) {
        G.player = newScore; G.pendingOut = null; setReviveBar(false); endMatch(); return;
    }
    G.player = newScore; G.usedRevives += 1; G.life = 1; G.pendingOut = null;
    setReviveBar(false); disableGrid(false);
    setHUD(undefined, 'Continue: Pick 1–10');
}

function gotoAndBuild() {
    buildNumGrid(ui.gridToss, pressNumber);
    buildNumGrid(ui.gridPlay, pressNumber);
    resetAll();
}
function wire() {
    ui.btnChooseNumber.addEventListener('click', () => setHUD('Choose Number', 'Use the number grid during toss/game'));
    ui.btnModeSelect.addEventListener('click', startModeSelect);
    ui.btnModeNormal.addEventListener('click', () => pickMode('normal'));
    ui.btnModeCrazy.addEventListener('click', () => pickMode('crazy'));
    ui.btnModeBack.addEventListener('click', resetAll);
    ui.btnOdd.addEventListener('click', () => pickParity('odd'));
    ui.btnEven.addEventListener('click', () => pickParity('even'));
    ui.btnTossBack.addEventListener('click', resetAll);
    ui.btnTossNumBack.addEventListener('click', resetAll);
    ui.btnBatFirst.addEventListener('click', () => chooseRole('bat'));
    ui.btnBowlFirst.addEventListener('click', () => chooseRole('bowl'));
    ui.btnRevive.addEventListener('click', () => decideRevive(true));
    ui.btnSkip.addEventListener('click', () => decideRevive(false));
    ui.btnReset.addEventListener('click', resetAll);
}

gotoAndBuild();
wire();
