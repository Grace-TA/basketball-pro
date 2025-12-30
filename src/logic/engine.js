export const TARGET_SCORE = 11;
const BASE_CHANCE = { DRIVE: 60, MID: 50, THREE: 40 };
const PER_POINT = 0.4;
const RPS = { BIG_WIN: 20, WIN: 10, LOSE: -10, BIG_LOSE: -20 };
const CLAMP_MIN = 1, CLAMP_MAX = 99;
const HIT_VARIANCE = { low: 3, high: 7 };

export const SHOTS = ["DRIVE", "MID", "THREE"];
export const SHOT_NAME = { DRIVE: "突破", MID: "中距", THREE: "三分" };

// Utility
function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
function randInt(n) { return Math.floor(Math.random() * n); }
function randChoice(arr) { return arr[randInt(arr.length)]; }

// Mechanics
function dunkTriggerFromJump(j) {
    if (j >= 90) return 42 + (j - 90) * 1.0;
    if (j >= 70) return 28 + (j - 70) * 0.9;
    return 12 + j * 0.25;
}

function blockTriggerFromJump(j) {
    if (j >= 90) return 38 + (j - 90) * 0.9;
    if (j >= 70) return 24 + (j - 70) * 0.8;
    return 10 + j * 0.20;
}

function blockSuccessBase(defJump, defDef) {
    const v = 20 + (defJump * 0.25 + defDef * 0.25);
    return clamp(v, 1, 99);
}

function rpsAdjust(offStat, defStat, guessedRight) {
    const diff = offStat - defStat;
    const big = Math.abs(diff) >= 15;
    if (guessedRight) {
        return big && diff <= -15 ? RPS.BIG_LOSE : RPS.LOSE;
    } else {
        return big && diff >= 15 ? RPS.BIG_WIN : RPS.WIN;
    }
}

function applyHitVariance(chance, context = {}) {
    const { isClutch = false, isSkillUsed = false, shotType = null } = context;
    let variance = HIT_VARIANCE.high;
    if (isClutch) variance -= 2;
    if (isSkillUsed) variance -= 1;
    if (shotType === "THREE") variance += 1;
    variance = Math.max(1, variance);
    const delta = (Math.random() * 2 - 1) * variance;
    return chance + delta;
}

// Cooldowns
const COOLDOWN_DEFAULT = 3;
const COOLDOWN_OVERRIDES = {
    aomine: () => 3,
    kise: () => 4,
    akashi: (pointsScored) => (pointsScored === 3 ? 4 : 3),
    murasakibara: () => 3,
};
const COOLDOWN_BY_TYPE = {
    FORCED_3PT: () => 4,
    DUNK: () => 3,
    DEFENSE: () => 3,
    BUFF_DEFENSE: () => 3,
    BUFF: (pointsScored) => (pointsScored === 3 ? 4 : 2),
};

export function calcCooldownAfterUse(char, pointsScored, ctx = {}) {
    if (!char || !char.skill) return COOLDOWN_DEFAULT;
    const id = char.id;
    const type = char.skill.type;
    const overrideFn = COOLDOWN_OVERRIDES[id];
    if (overrideFn) return overrideFn(pointsScored, ctx);
    const typeFn = COOLDOWN_BY_TYPE[type];
    if (typeFn) return typeFn(pointsScored, ctx);
    return COOLDOWN_DEFAULT;
}

// AI Logic
export function aiChooseDefenseAgainst(shot, aiChar) {
    const def = aiChar?.stats?.defense ?? 70;
    const pCorrect = clamp(0.45 + def / 200, 0.45, 0.70);
    if (Math.random() < pCorrect) return shot;
    return randChoice(SHOTS.filter(s => s !== shot));
}

export function aiChooseOffense(aiChar) {
    const s = aiChar.stats;
    const driveVal = s.drive;
    const midVal = s.two;
    const threeVal = s.three;
    const sum = driveVal + midVal + threeVal;
    let r = Math.random() * sum;
    if ((r -= driveVal) < 0) return "DRIVE";
    if ((r -= midVal) < 0) return "MID";
    return "THREE";
}

export function aiDecideUseSkill(phase, planned, aiChar, pScore, aScore, aSkillCD) {
    if (aSkillCD > 0) return false;
    if (!aiChar || !aiChar.skill) return false;
    const canUse = Array.isArray(aiChar.skill.canUseOn) ? aiChar.skill.canUseOn : [];
    if (!canUse.includes(phase)) return false;

    const isClutch = (pScore >= TARGET_SCORE - 2) || (aScore >= TARGET_SCORE - 2);
    const isBehind = (aScore < pScore);
    let p = (phase === "DEFENSE") ? 0.38 : 0.28;
    const t = (aiChar.skill.type || "").toUpperCase();
    if (t.includes("DEFENSE")) p += (phase === "DEFENSE" ? 0.14 : 0.04);
    if (t.includes("BUFF")) p += 0.06;

    if (t.includes("DUNK")) {
        p += (phase === "OFFENSE" && planned === "DRIVE") ? 0.10 : -0.20;
    }
    if (t.includes("FORCED_3PT") || t.includes("FORCED")) {
        p += (phase === "OFFENSE" && planned === "THREE") ? 0.28 : -0.30;
    }

    const s = aiChar.stats || {};
    let shotStat = 60;
    if (planned === "DRIVE") shotStat = s.drive ?? 60;
    else if (planned === "MID") shotStat = s.two ?? 60;
    else if (planned === "THREE") shotStat = s.three ?? 60;

    if (phase === "OFFENSE") {
        if (shotStat >= 80) p += 0.10;
        else if (shotStat <= 55) p -= 0.06;
    }
    if (phase === "DEFENSE") {
        const defStat = s.defense ?? 60;
        if (defStat >= 85) p += 0.08;
        else if (defStat <= 60) p -= 0.05;
    }
    if (isClutch) p += 0.08;
    if (isBehind) p += 0.08;
    p = clamp(p, 0.05, 0.75);
    return Math.random() < p;
}


// Event & Effect Helpers
function addSkillEvent(events, { side, charName, skillName, status, message }) {
    events.push({ side, charName, skillName, status, message });
}

function computeSkillEffects(ctx) {
    const {
        offenseShot,
        offChar, defChar,
        offUsesSkill, defUsesSkill,
        guessedRight
    } = ctx;

    const events = [];
    const mods = {
        baseChanceAdd: 0,
        finalBonusAdd: 0,
        finalPenaltyAdd: 0,
        blockTriggerAdd: 0,
        blockSuccessAdd: 0,
        forceDunk: false,
        forcedMake: false
    };

    let guessedRightOverride = null;

    // DEFENSE SKILLS
    if (defUsesSkill && defChar?.skill?.name) {
        const dn = defChar.name;
        const sk = defChar.skill.name;

        if (defChar.id === "itsuki") {
            if (!guessedRight) {
                if (Math.random() < 0.48) {
                    guessedRightOverride = true;
                    addSkillEvent(events, { side: "DEF", charName: dn, skillName: sk, status: "success", message: "視為守到（鷲之眼）" });
                } else {
                    addSkillEvent(events, { side: "DEF", charName: dn, skillName: sk, status: "fail", message: "未觸發（鷲之眼）" });
                }
            } else {
                addSkillEvent(events, { side: "DEF", charName: dn, skillName: sk, status: "fail", message: "未觸發（本回合已守到）" });
            }
        }
        else if (defChar.id === "akashi" || defChar.id === "kiyoshi") {
            const basePenalty = 10;
            const extraPenalty = guessedRight ? 8 : 0;
            const blockAdd = defChar.id === "kiyoshi" ? 8 : 5;
            mods.finalPenaltyAdd += basePenalty + extraPenalty;
            mods.blockSuccessAdd += blockAdd;
            addSkillEvent(events, { side: "DEF", charName: dn, skillName: sk, status: "success", message: `防守壓制 -${basePenalty + extraPenalty}%` });
        }
        else if (defChar.id === "murasakibara") {
            if (guessedRight) {
                const distBlock = (offenseShot === "DRIVE") ? 12 : (offenseShot === "MID") ? 8 : 4;
                mods.finalPenaltyAdd += 10 + (offenseShot === "DRIVE" ? 8 : 2);
                mods.blockSuccessAdd += 12 + distBlock;
                addSkillEvent(events, { side: "DEF", charName: dn, skillName: sk, status: "success", message: `火鍋率大幅提升` });
            } else {
                addSkillEvent(events, { side: "DEF", charName: dn, skillName: sk, status: "fail", message: "未觸發（未守到）" });
            }
        }
        else if (defChar.id === "hayakawa") {
            if (guessedRight) {
                mods.finalPenaltyAdd += 10;
                mods.blockTriggerAdd += 12;
                mods.blockSuccessAdd += 8;
                addSkillEvent(events, { side: "DEF", charName: dn, skillName: sk, status: "success", message: `壓迫防守` });
            }
        }
        else if (defChar.id === "kobori") {
            if (guessedRight) {
                mods.finalPenaltyAdd += 8;
                mods.blockSuccessAdd += 10;
                addSkillEvent(events, { side: "DEF", charName: dn, skillName: sk, status: "success", message: `禁區防守` });
            }
        }
    }

    // OFFENSE SKILLS
    if (offUsesSkill && offChar?.skill?.name) {
        const on = offChar.name;
        const sk = offChar.skill.name;

        if (offChar.id === "kagami") {
            if (offenseShot === "DRIVE") {
                mods.forceDunk = true;
                mods.baseChanceAdd += 8;
                addSkillEvent(events, { side: "OFF", charName: on, skillName: sk, status: "success", message: "急停灌籃" });
            }
        }
        else if (offChar.id === "midorima") {
            if (offenseShot === "THREE") {
                mods.forcedMake = true;
                addSkillEvent(events, { side: "OFF", charName: on, skillName: sk, status: "success", message: "全範圍投籃（必定命中）" });
            }
        }
        else if (offChar.id === "aomine") {
            mods.baseChanceAdd += (offenseShot === "MID" ? 15 : 10); // simplified
            addSkillEvent(events, { side: "OFF", charName: on, skillName: sk, status: "success", message: "無定式投籃" });
        }
        else if (offChar.id === "kise") {
            mods.baseChanceAdd += 8;
            addSkillEvent(events, { side: "OFF", charName: on, skillName: sk, status: "success", message: "完美模仿" });
        }
        else if (offChar.id === "hyuga") {
            if (offenseShot === "THREE") {
                mods.baseChanceAdd += 15;
                addSkillEvent(events, { side: "OFF", charName: on, skillName: sk, status: "success", message: "關鍵射手" });
            }
        }
        else if (offChar.id === "kasamatsu") {
            mods.finalBonusAdd += 12;
            addSkillEvent(events, { side: "OFF", charName: on, skillName: sk, status: "success", message: "隊長節奏" });
        }
        else if (offChar.id === "moriyama") {
            if (offenseShot === "THREE") {
                mods.baseChanceAdd += 12;
                addSkillEvent(events, { side: "OFF", charName: on, skillName: sk, status: "success", message: "定點狙擊" });
            }
        }
        else if (offChar.id === "mitobe" && (offenseShot === "DRIVE" || offenseShot === "MID")) {
            mods.baseChanceAdd += 10;
            mods.blockSuccessAdd -= 20; // Harder to block
            addSkillEvent(events, { side: "OFF", charName: on, skillName: sk, status: "success", message: "無聲鉤射" });
        }
    }

    return { mods, events, guessedRightOverride };
}


// MAIN RESOLVE FUNCTION
export function resolvePossession(state) {
    const {
        offense, offenseShot,
        defense, defenseGuard,
        offChar, defChar,
        offUsesSkill, defUsesSkill,
        pScore, aScore
    } = state;

    let offStat = 60;
    if (offenseShot === "DRIVE") offStat = offChar.stats.drive;
    else if (offenseShot === "MID") offStat = offChar.stats.two;
    else if (offenseShot === "THREE") offStat = offChar.stats.three;

    let defStat = defChar.stats.defense;
    let guessedRight = (offenseShot === defenseGuard);

    // Compute Skills
    const { mods, events, guessedRightOverride } = computeSkillEffects({
        offenseShot, offChar, defChar, offUsesSkill, defUsesSkill, guessedRight
    });
    if (guessedRightOverride === true) guessedRight = true;

    // Base Chance
    let base = BASE_CHANCE[offenseShot] || 50;
    base += mods.baseChanceAdd;

    // Stat Diff
    const diff = offStat - defStat;
    let hitChance = base + (diff * PER_POINT);

    // RPS Bonus
    let rpsVal = rpsAdjust(offStat, defStat, guessedRight);
    hitChance += (guessedRight ? -15 : 10) + rpsVal; // Basic penalty + rps adjust

    hitChance += mods.finalBonusAdd;
    hitChance -= mods.finalPenaltyAdd;

    // Variance
    hitChance = applyHitVariance(hitChance, { isSkillUsed: offUsesSkill, shotType: offenseShot });
    hitChance = clamp(hitChance, CLAMP_MIN, CLAMP_MAX);
    if (mods.forcedMake) hitChance = 100;

    // Block Logic
    let blocked = false;
    let blockRate = 0;
    let blockSuccess = 0;

    if (guessedRight || mods.forceDunk) {
        if (guessedRight) {
            blockRate = blockTriggerFromJump(defChar.stats.jump) + mods.blockTriggerAdd;
            if (Math.random() * 100 < blockRate) {
                blockSuccess = blockSuccessBase(defChar.stats.jump, defChar.stats.defense) + mods.blockSuccessAdd;
                if (mods.forceDunk) blockSuccess -= 15;
                if (Math.random() * 100 < blockSuccess) blocked = true;
            }
        }
    }

    // Outcome
    let points = (offenseShot === "THREE") ? 3 : 2;
    let result = "MISS";
    let finalPct = hitChance;

    if (blocked) {
        result = "BLOCK";
    } else {
        if (Math.random() * 100 < hitChance) {
            result = "MAKE";
        }
    }

    return {
        result,
        points: (result === "MAKE") ? points : 0,
        pct: finalPct,
        logs: events, // skill events
        blocked
    };
}
