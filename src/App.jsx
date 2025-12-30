import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, updateDoc, increment, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { CHARACTERS } from './data/characters';
import {
  TARGET_SCORE, SHOT_NAME,
  resolvePossession, aiChooseDefenseAgainst, aiChooseOffense, aiDecideUseSkill, calcCooldownAfterUse
} from './logic/engine';

// --- Firebase Config ---
const getFirebaseConfig = () => {
  const envConfig = import.meta.env.VITE_FIREBASE_CONFIG;
  if (envConfig) {
    try { return JSON.parse(envConfig); } catch (e) { console.error("Config Parse Error", e); }
  }
  return { apiKey: "PLACEHOLDER" };
};

const firebaseConfig = getFirebaseConfig();
let app, auth, db;
try {
  if (firebaseConfig.apiKey !== "PLACEHOLDER") {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  }
} catch (e) { console.error("Firebase Init Error", e); }

const appId = 'basketball-pro-vercel';

export default function App() {
  // Auth State
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [view, setView] = useState('loading'); // loading, auth, menu, game, history

  // Data State
  const [profile, setProfile] = useState(null);
  const [matchHistory, setMatchHistory] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);

  // Game State
  const [pScore, setPScore] = useState(0);
  const [aScore, setAScore] = useState(0);
  const [playerChar, setPlayerChar] = useState(CHARACTERS[0]);
  const [aiChar, setAiChar] = useState(CHARACTERS[1]);
  const [logs, setLogs] = useState([]);
  const [winner, setWinner] = useState(null);

  // Turn State
  const [turn, setTurn] = useState(1);
  const [possession, setPossession] = useState('P'); // 'P' or 'A'
  const [phase, setPhase] = useState('IDLE'); // IDLE, OFFENSE_SELECT, DEFENSE_SELECT, RESOLVING
  const [pSkillCD, setPSkillCD] = useState(0);
  const [aSkillCD, setASkillCD] = useState(0);
  const [pendingSkill, setPendingSkill] = useState(false);

  const [pMomentum, setPMomentum] = useState(false); // Visual only for now (logic inside engine if needed)

  // --- Auth & Data Effects ---
  useEffect(() => {
    if (!auth) { setView('auth'); return; }
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      if (u) setView('menu');
      else setView('auth');
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'profile');
    const unsubP = onSnapshot(profileRef, s => {
      if (s.exists()) setProfile(s.data());
      else setDoc(profileRef, { nickname: user.email.split('@')[0], wins: 0, totalPoints: 0 });
    });

    const histRef = collection(db, 'artifacts', appId, 'users', user.uid, 'matches');
    const unsubH = onSnapshot(histRef, s => {
      setMatchHistory(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)).slice(0, 10));
    });

    const lbRef = collection(db, 'artifacts', appId, 'public', 'data', 'leaderboard');
    const unsubL = onSnapshot(lbRef, s => {
      setLeaderboard(s.docs.map(d => d.data()).sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 5));
    });

    return () => { unsubP(); unsubH(); unsubL(); };
  }, [user]);

  // --- Game Logic ---

  const startGame = () => {
    setPScore(0); setAScore(0); setWinner(null);
    setLogs(["Start Game! 11 points (stats based)"]);
    setAiChar(CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)]);
    setTurn(1);
    setPossession('P');
    setPSkillCD(0); setASkillCD(0);
    setPendingSkill(false);
    setPhase('OFFENSE_SELECT'); // Player starts OFF
    setView('game');
  };

  const toMenu = () => setView('menu');

  // Player Actions
  const handlePlayerAction = async (choice) => {
    // choice is 'DRIVE', 'MID', 'THREE' (Offense) OR 'DRIVE', 'MID', 'THREE' (Defense Guard)
    setPhase('RESOLVING');

    let turnResult = null;
    let logMsgs = [];

    // 1. AI Decision
    let aiMove = null;
    let aiUsesSkill = false;
    let pUsesSkill = pendingSkill;

    if (possession === 'P') {
      // Player is Offense, AI is Defense
      // Player chose 'choice' (Shot Type)
      // AI guesses defense
      aiMove = aiChooseDefenseAgainst(choice, aiChar);
      aiUsesSkill = aiDecideUseSkill('DEFENSE', aiMove, aiChar, pScore, aScore, aSkillCD);

      turnResult = resolvePossession({
        offense: 'P', offenseShot: choice,
        defense: 'A', defenseGuard: aiMove,
        offChar: playerChar, defChar: aiChar,
        offUsesSkill: pUsesSkill, defUsesSkill: aiUsesSkill,
        pScore, aScore
      });

    } else {
      // Player is Defense, AI is Offense
      // Player chose 'choice' (Guard Type)
      // AI chooses offense
      aiMove = aiChooseOffense(aiChar);
      aiUsesSkill = aiDecideUseSkill('OFFENSE', aiMove, aiChar, pScore, aScore, aSkillCD);

      turnResult = resolvePossession({
        offense: 'A', offenseShot: aiMove,
        defense: 'P', defenseGuard: choice,
        offChar: aiChar, defChar: playerChar,
        offUsesSkill: aiUsesSkill, defUsesSkill: pUsesSkill,
        pScore, aScore
      });
    }

    // 2. Process Result
    const { result, points, pct, logs: skillLogs, blocked } = turnResult;

    // Add skill logs
    skillLogs.forEach(l => logMsgs.push(`${l.status === 'success' ? '✅' : '❌'} ${l.charName} [${l.skillName}]: ${l.message}`));

    // Result Log
    const actor = possession === 'P' ? playerChar.name : aiChar.name;
    const moveName = SHOT_NAME[possession === 'P' ? choice : aiMove];
    const probStr = `(${pct.toFixed(1)}%)`;

    if (result === 'BLOCK') {
      logMsgs.push(`🚫 ${actor}'s ${moveName} BLOCKED!`);
    } else if (result === 'MAKE') {
      logMsgs.push(`🏀 ${actor} ${moveName} MADE! ${probStr}`);
    } else {
      logMsgs.push(`⚪ ${actor} ${moveName} MISSED ${probStr}`);
    }

    setLogs(prev => [...logMsgs.reverse(), ...prev]);

    // 3. Update Score
    let newP = pScore;
    let newA = aScore;
    if (result === 'MAKE') {
      if (possession === 'P') newP += points;
      else newA += points;
    }
    setPScore(newP); setAScore(newA);

    // 4. Update Cooldowns / Reset Skill
    if (pUsesSkill) setPSkillCD(calcCooldownAfterUse(playerChar, result === 'MAKE' ? points : 0));
    else if (pSkillCD > 0) setPSkillCD(c => c - 1);

    if (aiUsesSkill) setASkillCD(calcCooldownAfterUse(aiChar, result === 'MAKE' ? points : 0));
    else if (aSkillCD > 0) setASkillCD(c => c - 1);

    setPendingSkill(false);

    // 5. Check Win or Swap Phase
    if (newP >= TARGET_SCORE || newA >= TARGET_SCORE) {
      await endGame(newP, newA);
    } else {
      // Swap Possession
      const nextPos = possession === 'P' ? 'A' : 'P';
      setPossession(nextPos);
      setPhase(nextPos === 'P' ? 'OFFENSE_SELECT' : 'DEFENSE_SELECT');
      setTurn(t => t + 1);
    }
  };

  const endGame = async (finalP, finalA) => {
    const isWin = finalP > finalA;
    setWinner(isWin ? 'PLAYER' : 'AI');
    setPhase('FINISHED');

    if (user && db) {
      try {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'profile'), {
          wins: increment(isWin ? 1 : 0), totalPoints: increment(finalP)
        });
        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'matches'), {
          playerScore: finalP, aiScore: finalA, result: isWin ? 'WIN' : 'LOSS', timestamp: serverTimestamp()
        });
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leaderboard', user.uid), {
          nickname: profile?.nickname || 'Player', totalPoints: (profile?.totalPoints || 0) + finalP, userId: user.uid
        });
      } catch (e) { console.error(e); }
    }
  };

  // --- Views ---

  if (view === 'auth') return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 rounded-3xl p-8 border border-slate-800">
        <h1 className="text-3xl font-black text-orange-500 mb-6 text-center">BASKETBALL PRO</h1>
        <form onSubmit={(e) => { e.preventDefault(); if (authMode === 'login') signInWithEmailAndPassword(auth, email, password).catch(e => setError(e.message)); else createUserWithEmailAndPassword(auth, email, password).catch(e => setError(e.message)); }} className="space-y-4">
          <input type="email" placeholder="Email" className="w-full bg-slate-800 text-white placeholder-slate-400 p-3 rounded" value={email} onChange={e => setEmail(e.target.value)} />
          <input type="password" placeholder="Password" className="w-full bg-slate-800 text-white placeholder-slate-400 p-3 rounded" value={password} onChange={e => setPassword(e.target.value)} />
          {error && <div className="text-red-400 text-sm">{error}</div>}
          <button className="w-full bg-orange-600 p-3 rounded font-bold">{authMode === 'login' ? 'Login' : 'Sign Up'}</button>
        </form>
        <div className="mt-4 flex gap-4 text-sm justify-center text-slate-400">
          <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}>{authMode === 'login' ? 'Need account?' : 'Have account?'}</button>
          <button onClick={() => { if (auth) signInAnonymously(auth); }}>Guest</button>
        </div>
        <div className="mt-8 text-center text-sm text-slate-400 font-mono">
          Created by Horace Chen using Vibe Coding in 2025.12.30
        </div>
      </div>
    </div>
  );

  if (view === 'menu') return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-black text-orange-500">COURT LOBBY</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
            <h2 className="text-xl font-bold text-slate-400">Player Profile</h2>
            <div className="text-3xl font-black">{profile?.nickname || 'Baller'}</div>
            <div className="flex gap-4">
              <div className="bg-slate-800 p-3 rounded-lg"><div className="text-xs text-slate-500">WINS</div><div className="font-mono text-xl">{profile?.wins || 0}</div></div>
              <div className="bg-slate-800 p-3 rounded-lg"><div className="text-xs text-slate-500">POINTS</div><div className="font-mono text-xl">{profile?.totalPoints || 0}</div></div>
            </div>
          </div>
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 max-h-60 overflow-y-auto custom-scrollbar">
            <h2 className="text-xl font-bold text-slate-400 mb-4">Global Rank</h2>
            {leaderboard.map((u, i) => (
              <div key={i} className="flex justify-between py-2 border-b border-slate-800 last:border-0">
                <span>#{i + 1} {u.nickname}</span>
                <span className="font-mono text-orange-500">{u.totalPoints}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-slate-400">Select Character</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {CHARACTERS.map(c => (
              <button key={c.id} onClick={() => setPlayerChar(c)} className={`p-4 rounded-xl border text-left transition-all ${playerChar.id === c.id ? 'border-orange-500 bg-orange-500/10' : 'border-slate-800 bg-slate-900 hover:bg-slate-800'}`}>
                <div className="font-bold text-sm">{c.name}</div>
                <div className="text-[10px] text-slate-500 mt-1">{c.skill.name}</div>
              </button>
            ))}
          </div>
        </div>

        <button onClick={startGame} className="w-full py-6 bg-orange-600 hover:bg-orange-500 rounded-2xl font-black text-2xl shadow-xl shadow-orange-900/40">ENTER COURT</button>
        <button onClick={() => signOut(auth)} className="w-full py-4 bg-slate-900 text-slate-500 rounded-xl hover:text-white">Sign Out</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header */}
      <div className="bg-slate-900 md:px-8 px-4 py-4 flex justify-between items-center border-b border-slate-800">
        <div className="font-black text-orange-500">GAME ON</div>
        <div className="font-mono text-xl bg-black px-4 py-1 rounded border border-slate-700">
          {String(Math.floor((TARGET_SCORE - pScore))).padStart(2, '0')} : {String(Math.floor((TARGET_SCORE - aScore))).padStart(2, '0')}
          <span className="text-xs text-slate-500 ml-2">TO WIN</span>
        </div>
        <button onClick={toMenu} className="text-xs bg-slate-800 px-3 py-1 rounded">QUIT</button>
      </div>

      {/* Main Court */}
      <div className="flex-1 max-w-5xl mx-auto w-full p-4 grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left: Player Stats */}
        <div className="lg:col-span-3 space-y-4 hidden lg:block">
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <div className="text-xs text-slate-500 font-bold mb-2">YOU</div>
            <h3 className="text-xl font-bold">{playerChar.name}</h3>
            <div className="mt-4 space-y-2 text-xs font-mono text-slate-400">
              <div className="flex justify-between"><span>2PT</span><span>{playerChar.stats.two}</span></div>
              <div className="flex justify-between"><span>3PT</span><span>{playerChar.stats.three}</span></div>
              <div className="flex justify-between"><span>DEF</span><span>{playerChar.stats.defense}</span></div>
            </div>
          </div>
        </div>

        {/* Center: Action */}
        <div className="lg:col-span-6 flex flex-col">
          {/* Scoreboard */}
          <div className="bg-slate-900 rounded-3xl p-8 mb-6 border border-slate-800 text-center relative overflow-hidden">
            <div className="flex justify-between items-end relative z-10">
              <div className="text-left">
                <div className="text-5xl font-black text-orange-500">{pScore}</div>
                <div className="text-sm font-bold text-slate-400 mt-1">PLAYER</div>
              </div>
              <div className="text-xl font-black text-slate-700 italic">VS</div>
              <div className="text-right">
                <div className="text-5xl font-black text-white">{aScore}</div>
                <div className="text-sm font-bold text-slate-400 mt-1">CPU ({aiChar.name})</div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex-1 bg-slate-900/50 rounded-3xl p-6 border border-slate-800 flex flex-col justify-center items-center gap-6 backdrop-blur-sm">
            {winner ? (
              <div className="text-center animate-in zoom-in">
                <h2 className={`text-4xl font-black mb-4 ${winner === 'PLAYER' ? 'text-green-400' : 'text-red-500'}`}>{winner === 'PLAYER' ? 'VICTORY' : 'DEFEAT'}</h2>
                <button onClick={toMenu} className="px-8 py-3 bg-slate-700 rounded-xl font-bold hover:bg-slate-600 transition-all">Back to Menu</button>
              </div>
            ) : (
              <>
                <div className="text-center space-y-1">
                  <div className="text-xs font-bold tracking-widest text-slate-500 uppercase">Current Turn</div>
                  <div className={`text-2xl font-black ${possession === 'P' ? 'text-orange-500' : 'text-blue-400'}`}>
                    {possession === 'P' ? "YOUR OFFENSE" : "YOUR DEFENSE"}
                  </div>
                  <div className="text-sm text-slate-400">
                    {possession === 'P' ? "Select a shot type" : "Guess where CPU will attack"}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
                  {['DRIVE', 'MID', 'THREE'].map(type => (
                    <button
                      key={type}
                      onClick={() => handlePlayerAction(type)}
                      className={`py-6 rounded-xl font-black text-sm border-b-4 transition-all active:scale-95 active:border-b-0 active:translate-y-1 
                                        ${possession === 'P'
                          ? 'bg-orange-600 border-orange-800 hover:bg-orange-500'
                          : 'bg-blue-600 border-blue-800 hover:bg-blue-500'}`}
                    >
                      {SHOT_NAME[type]}
                    </button>
                  ))}
                </div>

                {/* Skill Btn */}
                <button
                  disabled={pSkillCD > 0}
                  onClick={() => setPendingSkill(!pendingSkill)}
                  className={`px-6 py-2 rounded-full text-xs font-bold border transition-all ${pendingSkill
                    ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500 animate-pulse'
                    : pSkillCD > 0
                      ? 'bg-slate-800 text-slate-600 border-slate-800 cursor-not-allowed'
                      : 'bg-transparent text-slate-400 border-slate-600 hover:text-white hover:border-white'
                    }`}
                >
                  {pSkillCD > 0 ? `Skill CD: ${pSkillCD}` : pendingSkill ? 'SKILL ACTIVE (Click to Cancel)' : `ACTIVATE SKILL: ${playerChar.skill.name}`}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right: Logs */}
        <div className="lg:col-span-3 bg-slate-900 rounded-2xl border border-slate-800 p-4 flex flex-col h-[500px] lg:h-auto">
          <div className="text-xs font-bold text-slate-500 uppercase mb-3 text-center">Play Log</div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar text-xs">
            {logs.map((l, i) => (
              <div key={i} className="p-3 bg-slate-800/50 rounded-lg border border-slate-800/50 leading-relaxed text-slate-300">
                {l}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
