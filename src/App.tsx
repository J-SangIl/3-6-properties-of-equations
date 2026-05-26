/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RotateCcw, Check, ArrowLeft } from 'lucide-react';

// --- Constants & Types ---

enum StoneType {
  X_PLUS = 'X_PLUS',
  X_MINUS = 'X_MINUS',
  ONE_PLUS = 'ONE_PLUS',
  ONE_MINUS = 'ONE_MINUS',
}

interface SideState {
  xp: number; // x plus
  xm: number; // x minus
  up: number; // units plus
  um: number; // units minus
}

enum Phase {
  MODE_SELECT = 0,
  SETUP = 1,
  SOLVE = 2,
}

enum GameMode {
  PRACTICE = 'PRACTICE',
  PROBLEM = 'PROBLEM',
}

// --- Components ---

const Pentagram = ({ label, color }: { label: string; color: string }) => (
  <div className={`relative flex items-center justify-center w-10 h-10 ${color} drop-shadow-sm`}>
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full fill-current">
      <path d="M50 8 L92 38 L76 88 L24 88 L8 38 Z" />
    </svg>
    <span className="relative z-10 text-white font-bold text-sm select-none">{label}</span>
  </div>
);

const Circle = ({ label, color }: { label: string; color: string }) => (
  <div className={`relative flex items-center justify-center w-10 h-10 rounded-full ${color} drop-shadow-sm`}>
    <span className="text-white font-bold text-sm select-none">{label}</span>
  </div>
);

const Stone = ({ type }: { type: StoneType }) => {
  const content = (() => {
    switch (type) {
      case StoneType.X_PLUS: return <Pentagram label="x" color="text-blue-600" />;
      case StoneType.X_MINUS: return <Pentagram label="-x" color="text-red-600" />;
      case StoneType.ONE_PLUS: return <Circle label="1" color="bg-blue-600" />;
      case StoneType.ONE_MINUS: return <Circle label="-1" color="bg-red-600" />;
    }
  })();

  return (
    <motion.div
      initial={{ scale: 0, y: -20, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {content}
    </motion.div>
  );
};

const EquationDisplay = ({ left, right }: { left: SideState; right: SideState }) => {
  const formatSide = (side: SideState) => {
    const netX = side.xp - side.xm;
    const netU = side.up - side.um;
    const parts: string[] = [];
    
    if (netX !== 0) {
      if (netX === 1) parts.push('x');
      else if (netX === -1) parts.push('-x');
      else parts.push(`${netX}x`);
    }
    
    if (netU !== 0) {
      const absU = Math.abs(netU);
      if (netU > 0) {
        if (parts.length > 0) parts.push(` + ${absU}`);
        else parts.push(`${absU}`);
      } else {
        if (parts.length > 0) parts.push(` - ${absU}`);
        else parts.push(`-${absU}`);
      }
    }
    
    return parts.length === 0 ? '0' : parts.join('');
  };

  return (
    <div className="flex items-center justify-center py-6 px-12">
      <div className="bg-[#EBF5FF] px-16 py-4 rounded-3xl flex items-center justify-center gap-10 shadow-sm border border-blue-100">
        <motion.div 
          key={`left-${JSON.stringify(left)}`}
          initial={{ y: -5, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-4xl font-bold font-sans tracking-tight text-blue-600"
        >
          {formatSide(left)}
        </motion.div>
        <div className="text-3xl font-bold text-blue-400">=</div>
        <motion.div 
          key={`right-${JSON.stringify(right)}`}
          initial={{ y: -5, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-4xl font-bold font-sans tracking-tight text-blue-600"
        >
          {formatSide(right)}
        </motion.div>
      </div>
    </div>
  );
};

export default function App() {
  const [phase, setPhase] = useState<Phase>(Phase.MODE_SELECT);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.PRACTICE);
  const [leftState, setLeftState] = useState<SideState>({ xp: 0, xm: 0, up: 0, um: 0 });
  const [rightState, setRightState] = useState<SideState>({ xp: 0, xm: 0, up: 0, um: 0 });
  const [isAnimating, setIsAnimating] = useState(false);

  const isSuccess = useMemo(() => {
    if (gameMode !== GameMode.PROBLEM) return false;

    const lx = leftState.xp - leftState.xm;
    const lu = leftState.up - leftState.um;
    const rx = rightState.xp - rightState.xm;
    const ru = rightState.up - rightState.um;

    // x = n 꼴
    const xOnLeft = lx === 1 && lu === 0 && rx === 0;
    // n = x 꼴
    const xOnRight = rx === 1 && ru === 0 && lx === 0;

    return (xOnLeft || xOnRight) && phase === Phase.SOLVE;
  }, [leftState, rightState, phase, gameMode]);

  const generateProblem = useCallback(() => {
    // ax + b = cx + d => (a-c)x = d-b
    // To ensure integer solution, pick x first
    const solution = Math.floor(Math.random() * 11) - 5; // x between -5 and 5
    
    let a = Math.floor(Math.random() * 5) - 2; // -2 to 2
    let c = Math.floor(Math.random() * 5) - 2;
    while (a === c) {
        a = Math.floor(Math.random() * 5) - 2;
        c = Math.floor(Math.random() * 5) - 2;
    }

    const b = Math.floor(Math.random() * 11) - 5;
    // d = (a-c)*solution + b
    const d = (a - c) * solution + b;

    setLeftState({
      xp: a > 0 ? a : 0,
      xm: a < 0 ? Math.abs(a) : 0,
      up: b > 0 ? b : 0,
      um: b < 0 ? Math.abs(b) : 0,
    });
    setRightState({
      xp: c > 0 ? c : 0,
      xm: c < 0 ? Math.abs(c) : 0,
      up: d > 0 ? d : 0,
      um: d < 0 ? Math.abs(d) : 0,
    });
  }, []);

  const reset = () => {
    if (gameMode === GameMode.PROBLEM) {
        generateProblem();
    } else {
        setLeftState({ xp: 0, xm: 0, up: 0, um: 0 });
        setRightState({ xp: 0, xm: 0, up: 0, um: 0 });
    }
  };

  const startPractice = () => {
    setGameMode(GameMode.PRACTICE);
    setPhase(Phase.SETUP);
    setLeftState({ xp: 0, xm: 0, up: 0, um: 0 });
    setRightState({ xp: 0, xm: 0, up: 0, um: 0 });
  };

  const startProblem = () => {
    setGameMode(GameMode.PROBLEM);
    setPhase(Phase.SOLVE);
    generateProblem();
  };

  const settle = (side: SideState): SideState => {
    const netX = side.xp - side.xm;
    const netU = side.up - side.um;
    return {
      xp: netX > 0 ? netX : 0,
      xm: netX < 0 ? Math.abs(netX) : 0,
      up: netU > 0 ? netU : 0,
      um: netU < 0 ? Math.abs(netU) : 0,
    };
  };

  const addStone = (side: 'left' | 'right', type: StoneType) => {
    if (isAnimating) return;
    const setter = side === 'left' ? setLeftState : setRightState;
    
    setter(prev => {
      let next = { ...prev };
      switch (type) {
        case StoneType.X_PLUS: next.xp += 1; break;
        case StoneType.X_MINUS: next.xm += 1; break;
        case StoneType.ONE_PLUS: next.up += 1; break;
        case StoneType.ONE_MINUS: next.um += 1; break;
      }
      // Phase 1 constant settling
      return settle(next);
    });
  };

  const applyBoth = async (type: StoneType) => {
    if (isAnimating) return;
    setIsAnimating(true);
    
    // Step 1: Add raw stone to both sides
    const updater = (prev: SideState) => {
      let next = { ...prev };
      switch (type) {
        case StoneType.X_PLUS: next.xp += 1; break;
        case StoneType.X_MINUS: next.xm += 1; break;
        case StoneType.ONE_PLUS: next.up += 1; break;
        case StoneType.ONE_MINUS: next.um += 1; break;
      }
      return next;
    };
    
    setLeftState(updater);
    setRightState(updater);

    // Step 2: 0.4s delay
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Step 3: Settle (cancel out opposites)
    setLeftState(prev => settle(prev));
    setRightState(prev => settle(prev));

    await new Promise(resolve => setTimeout(resolve, 200));
    setIsAnimating(false);
  };

  const multiplyBoth = async (factor: number) => {
    if (isAnimating) return;
    setIsAnimating(true);
    const mult = (s: SideState) => ({
        xp: s.xp * factor,
        xm: s.xm * factor,
        up: s.up * factor,
        um: s.um * factor,
    });
    setLeftState(prev => mult(prev));
    setRightState(prev => mult(prev));
    await new Promise(resolve => setTimeout(resolve, 800));
    setIsAnimating(false);
  };

  const divideBoth = async (divisor: number) => {
    if (isAnimating || !canDivide(divisor)) return;
    setIsAnimating(true);
    const div = (s: SideState) => ({
        xp: s.xp / divisor,
        xm: s.xm / divisor,
        up: s.up / divisor,
        um: s.um / divisor,
    });
    setLeftState(prev => div(prev));
    setRightState(prev => div(prev));
    await new Promise(resolve => setTimeout(resolve, 800));
    setIsAnimating(false);
  };

  const flipSigns = async () => {
    if (isAnimating) return;
    setIsAnimating(true);
    const flip = (s: SideState) => ({
        xp: s.xm,
        xm: s.xp,
        up: s.um,
        um: s.up,
    });
    setLeftState(prev => flip(prev));
    setRightState(prev => flip(prev));
    await new Promise(resolve => setTimeout(resolve, 600));
    setIsAnimating(false);
  };

  const canDivide = (n: number) => {
    const l = leftState;
    const r = rightState;
    const check = (s: SideState) => (s.xp - s.xm) % n === 0 && (s.up - s.um) % n === 0;
    return check(l) && check(r);
  };

  const renderStones = (state: SideState) => {
    const items: React.ReactNode[] = [];
    const pushItems = (count: number, type: StoneType, keyPrefix: string) => {
        for (let i = 0; i < count; i++) {
            items.push(
                <motion.div layout key={`${keyPrefix}-${i}`}>
                    <Stone type={type} />
                </motion.div>
            );
        }
    };

    pushItems(state.xp, StoneType.X_PLUS, 'xp');
    pushItems(state.xm, StoneType.X_MINUS, 'xm');
    pushItems(state.up, StoneType.ONE_PLUS, 'up');
    pushItems(state.um, StoneType.ONE_MINUS, 'um');
    
    return items;
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 select-none font-sans">
      <h1 className="sr-only">등식의 성질</h1>

      {/* Main Container */}
      <div className="w-full max-w-5xl bg-white rounded-[2rem] shadow-2xl shadow-blue-900/10 overflow-hidden flex flex-col border border-slate-100 relative">
        
        {phase !== Phase.MODE_SELECT && (
            <button 
                onClick={() => setPhase(Phase.MODE_SELECT)}
                className="absolute top-6 left-6 z-50 p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm group"
                title="모드 선택"
            >
                <ArrowLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
            </button>
        )}

        {phase === Phase.MODE_SELECT ? (
           <div className="flex-1 flex flex-col items-center justify-center py-32 px-12 text-center gap-12 bg-white">
                <div className="space-y-4">
                    <h2 className="text-5xl font-black text-slate-800 tracking-tight">등식의 성질</h2>
                    <p className="text-slate-500 font-medium text-lg">양팔 저울을 이용해 방정식의 원리를 배워보세요!</p>
                </div>
                <div className="flex gap-6 w-full max-w-md">
                    <button 
                        onClick={startPractice}
                        className="flex-1 flex flex-col items-center gap-4 p-8 bg-blue-50 border-2 border-blue-100 rounded-3xl hover:border-blue-300 hover:bg-blue-100/50 transition-all group"
                    >
                        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
                            <RotateCcw size={32} />
                        </div>
                        <span className="text-xl font-bold text-blue-700">연습 모드</span>
                    </button>
                    <button 
                        onClick={startProblem}
                        className="flex-1 flex flex-col items-center gap-4 p-8 bg-indigo-50 border-2 border-indigo-100 rounded-3xl hover:border-indigo-300 hover:bg-indigo-100/50 transition-all group"
                    >
                        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform">
                            <Check size={32} />
                        </div>
                        <span className="text-xl font-bold text-indigo-700">문제 모드</span>
                    </button>
                </div>
           </div>
        ) : (
          <div className="flex flex-col flex-1">
            
            {/* Top: Equation */}
            <EquationDisplay left={leftState} right={rightState} />

            {/* Center: Scale */}
            <div className="relative h-[420px] flex flex-col items-center justify-center px-12 bg-white mb-4">
                {/* Success Announcement */}
                <AnimatePresence>
                    {isSuccess && (
                        <motion.div 
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            className="absolute inset-0 z-40 bg-white/40 flex flex-col items-center justify-center p-8 text-center"
                        >
                            <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100 flex flex-col items-center max-w-sm">
                                <motion.div 
                                    animate={{ y: [0, -10, 0] }} 
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center text-white shadow-xl mb-6"
                                >
                                    <Check size={40} strokeWidth={4} />
                                </motion.div>
                                <h3 className="text-3xl font-black text-slate-800 mb-2">성공!</h3>
                                <p className="text-slate-500 font-bold text-lg mb-8">방정식의 해를 찾았습니다.</p>
                                
                                <div className="flex flex-col gap-3 w-full">
                                    {gameMode === GameMode.PROBLEM && (
                                        <button 
                                            onClick={generateProblem}
                                            className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg hover:bg-blue-700 transition-all"
                                        >
                                            다음 문제
                                        </button>
                                    )}
                                    {gameMode === GameMode.PRACTICE && (
                                        <button 
                                            onClick={() => setPhase(Phase.SETUP)}
                                            className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                                        >
                                            <RotateCcw size={18} />
                                            돌 다시 배치하기
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => setPhase(Phase.MODE_SELECT)}
                                        className="w-full py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all border border-slate-200"
                                    >
                                        모드 선택
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Beam */}
            <div className="absolute top-[60px] left-10 right-10 h-3 bg-[#8D9CB4] rounded-full shadow-sm z-30"></div>
            
            {/* Scale Pivot area */}
            <div className="absolute top-[60px] left-1/2 -translate-x-1/2 flex flex-col items-center">
                <div className="w-4 h-4 rounded-full border-4 border-white bg-[#8D9CB4] -mt-1.5 z-40"></div>
                {/* Vertical support */}
                <div className="w-3 h-64 bg-[#8D9CB4] -mt-0.5"></div>
                {/* Pivot Diamond */}
                <div className="w-12 h-12 bg-[#CED9E5] rotate-45 border-4 border-white shadow-sm -mt-6"></div>
                {/* Base */}
                <div className="w-40 h-3.5 bg-[#6B7B94] rounded-full -mt-2"></div>
            </div>

            <div className="flex gap-16 w-full mt-40 relative z-10">
                {/* Left Pan */}
                <div className="flex-1 flex flex-col items-center relative">
                    {/* Hanging Line */}
                    <div className="absolute -top-[160px] left-1/2 -translate-x-1/2 w-0.5 h-[160px] bg-[#D1D9E6]"></div>
                    <div className="w-full h-44 border-2 border-[#D1D9E6] border-t-0 rounded-b-[40px] relative flex flex-wrap content-end justify-center p-4 pb-6 gap-2 bg-slate-50/30">
                        <AnimatePresence>
                            {renderStones(leftState)}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Right Pan */}
                <div className="flex-1 flex flex-col items-center relative">
                     {/* Hanging Line */}
                    <div className="absolute -top-[160px] left-1/2 -translate-x-1/2 w-0.5 h-[160px] bg-[#D1D9E6]"></div>
                    <div className="w-full h-44 border-2 border-[#D1D9E6] border-t-0 rounded-b-[40px] relative flex flex-wrap content-end justify-center p-4 pb-6 gap-2 bg-slate-50/30">
                        <AnimatePresence>
                            {renderStones(rightState)}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>

        {/* Bottom: Controls */}
        <div className="p-8 bg-slate-50 min-h-[240px] border-t border-slate-100">
          {phase === Phase.SETUP ? (
            <div className="flex justify-between items-center h-full gap-8 max-w-4xl mx-auto">
              {/* Left Controls */}
              <div className="grid grid-cols-2 gap-3 p-5 bg-white rounded-2xl shadow-sm border border-slate-100">
                <button onClick={() => addStone('left', StoneType.X_PLUS)} className="hover:scale-110 transition-transform"><Stone type={StoneType.X_PLUS} /></button>
                <button onClick={() => addStone('left', StoneType.ONE_PLUS)} className="hover:scale-110 transition-transform"><Stone type={StoneType.ONE_PLUS} /></button>
                <button onClick={() => addStone('left', StoneType.X_MINUS)} className="hover:scale-110 transition-transform"><Stone type={StoneType.X_MINUS} /></button>
                <button onClick={() => addStone('left', StoneType.ONE_MINUS)} className="hover:scale-110 transition-transform"><Stone type={StoneType.ONE_MINUS} /></button>
              </div>

              {/* Center Logic Controls */}
              <div className="flex flex-col gap-4">
                <button onClick={reset} className="flex items-center justify-center gap-2 px-8 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
                  <RotateCcw size={18} />
                  초기화
                </button>
                <button 
                    onClick={() => setPhase(Phase.SOLVE)} 
                    className="flex items-center justify-center gap-2 px-10 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Check size={20} />
                  배치 완료
                </button>
              </div>

              {/* Right Controls */}
              <div className="grid grid-cols-2 gap-3 p-5 bg-white rounded-2xl shadow-sm border border-slate-100">
                <button onClick={() => addStone('right', StoneType.X_PLUS)} className="hover:scale-110 transition-transform"><Stone type={StoneType.X_PLUS} /></button>
                <button onClick={() => addStone('right', StoneType.ONE_PLUS)} className="hover:scale-110 transition-transform"><Stone type={StoneType.ONE_PLUS} /></button>
                <button onClick={() => addStone('right', StoneType.X_MINUS)} className="hover:scale-110 transition-transform"><Stone type={StoneType.X_MINUS} /></button>
                <button onClick={() => addStone('right', StoneType.ONE_MINUS)} className="hover:scale-110 transition-transform"><Stone type={StoneType.ONE_MINUS} /></button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-4 justify-center max-w-4xl mx-auto">
              {/* Box 1: x operations */}
              <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 flex gap-4 items-center">
                <button onClick={() => applyBoth(StoneType.X_PLUS)} className="hover:scale-110 transition-transform"><Stone type={StoneType.X_PLUS} /></button>
                <button onClick={() => applyBoth(StoneType.X_MINUS)} className="hover:scale-110 transition-transform"><Stone type={StoneType.X_MINUS} /></button>
              </div>

              {/* Box 2: unit operations */}
              <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 flex gap-4 items-center">
                <button onClick={() => applyBoth(StoneType.ONE_PLUS)} className="hover:scale-110 transition-transform"><Stone type={StoneType.ONE_PLUS} /></button>
                <button onClick={() => applyBoth(StoneType.ONE_MINUS)} className="hover:scale-110 transition-transform"><Stone type={StoneType.ONE_MINUS} /></button>
              </div>

              {/* Box 4: Multipliers */}
              <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 grid grid-cols-2 gap-2">
                {[2, 3, 5, 7].map(n => (
                  <button key={n} onClick={() => multiplyBoth(n)} className="w-12 h-10 border border-slate-200 rounded-lg font-bold text-blue-600 hover:bg-blue-50 transition-colors">x{n}</button>
                ))}
              </div>

              {/* Box 5: Divisors */}
              <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 grid grid-cols-2 gap-2">
                {[2, 3, 5, 7].map(n => (
                  <button 
                    key={n} 
                    disabled={!canDivide(n)}
                    onClick={() => divideBoth(n)} 
                    className="w-12 h-10 border border-slate-200 rounded-lg font-bold text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-20 flex items-center justify-center"
                   >
                       ÷{n}
                    </button>
                ))}
              </div>

              {/* Box 3: Flip */}
              <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center">
                <button onClick={flipSigns} className="flex flex-col items-center justify-center font-bold text-xs text-slate-600 hover:bg-slate-50 transition-colors w-24 h-20 p-2 rounded-xl border border-slate-100">
                    <span>부호 바꾸기</span>
                    <span className="text-base text-blue-600">×(-1)</span>
                </button>
              </div>

                {/* Phase 2 Side Controls */}
                <div className="flex flex-col justify-center">
                    {gameMode === GameMode.PRACTICE ? (
                        <button 
                            onClick={() => setPhase(Phase.SETUP)} 
                            className="flex items-center justify-center gap-2 px-4 py-3 text-slate-400 hover:text-slate-600 font-bold rounded-xl transition-colors text-sm"
                        >
                            <RotateCcw size={16} />
                            다시 만들기
                        </button>
                    ) : (
                        <button 
                            onClick={reset} 
                            className="flex items-center justify-center gap-2 px-4 py-3 text-slate-400 hover:text-slate-600 font-bold rounded-xl transition-colors text-sm"
                        >
                            <RotateCcw size={16} />
                            다른 문제
                        </button>
                    )}
                </div>
            </div>
          )}
        </div>
        </div>
        )}
      </div>
      
      {/* Visual Overlay if animating to prevent clicks */}
      {isAnimating && <div className="fixed inset-0 z-50 cursor-wait"></div>}
    </div>
  );
}

