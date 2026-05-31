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
import { RotateCcw, Check, ArrowLeft, HelpCircle } from 'lucide-react';

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
  const [pendingType, setPendingType] = useState<StoneType | null>(null);
  const [pendingCount, setPendingCount] = useState<number>(0);

  // Score & Tutorial States for Problem Mode
  const [solvedCount, setSolvedCount] = useState<number>(0);
  const [hasCredited, setHasCredited] = useState<boolean>(false);
  const [isTutorial, setIsTutorial] = useState<boolean>(false);
  const [tutorialStep, setTutorialStep] = useState<number>(0);
  const [hasSeenTutorial, setHasSeenTutorial] = useState<boolean>(false);

  const handleStoneSelect = (type: StoneType) => {
    if (pendingType === type) {
      setPendingCount(prev => Math.min(10, prev + 1));
    } else {
      setPendingType(type);
      setPendingCount(1);
    }
  };

  const handleApplyPending = async () => {
    if (!pendingType || pendingCount <= 0 || isAnimating) return;
    const currentType = pendingType;
    const currentCount = pendingCount;
    setPendingType(null);
    setPendingCount(0);
    await applyBoth(currentType, currentCount);
  };

  const clearPending = () => {
    setPendingType(null);
    setPendingCount(0);
  };

  const canSettle = (): boolean => {
    return (
      (leftState.xp > 0 && leftState.xm > 0) ||
      (leftState.up > 0 && leftState.um > 0) ||
      (rightState.xp > 0 && rightState.xm > 0) ||
      (rightState.up > 0 && rightState.um > 0)
    );
  };

  const handleSettleBoth = async () => {
    if (isAnimating || !canSettle()) return;
    setIsAnimating(true);
    
    // Settle both sides
    setLeftState(prev => settle(prev));
    setRightState(prev => settle(prev));

    await new Promise(resolve => setTimeout(resolve, 600));
    setIsAnimating(false);
  };

  const isSuccess = useMemo(() => {
    if (gameMode !== GameMode.PROBLEM) return false;

    // Must not have any opposing stones that can still be settled (상쇄하기)
    const oppositesCanSettle = (
      (leftState.xp > 0 && leftState.xm > 0) ||
      (leftState.up > 0 && leftState.um > 0) ||
      (rightState.xp > 0 && rightState.xm > 0) ||
      (rightState.up > 0 && rightState.um > 0)
    );
    if (oppositesCanSettle) return false;

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

  // Score Crediting
  useEffect(() => {
    if (isSuccess && !hasCredited) {
      setSolvedCount(prev => prev + 1);
      setHasCredited(true);
    }
  }, [isSuccess, hasCredited]);

  // Interactive Tutorial Step Control
  useEffect(() => {
    if (!isTutorial) return;
    if (tutorialStep === 1) {
      if (leftState.um >= 3 && rightState.um >= 3) {
        setTutorialStep(2);
      }
    } else if (tutorialStep === 2) {
      if (leftState.um === 0 && leftState.up === 0 && rightState.um === 0 && rightState.up === 4) {
        setTutorialStep(3);
      }
    } else if (tutorialStep === 3) {
      // Step 3 leads to resolution where isSuccess is met
    }
  }, [isTutorial, tutorialStep, leftState, rightState]);

  const generateProblem = useCallback(() => {
    setHasCredited(false);
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
    if (isTutorial) {
      setLeftState({ xp: 2, xm: 0, up: 3, um: 0 });
      setRightState({ xp: 0, xm: 0, up: 7, um: 0 });
      setTutorialStep(0);
      setPendingType(null);
      setPendingCount(0);
    } else if (gameMode === GameMode.PROBLEM) {
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
    setPendingType(null);
    setPendingCount(0);
  };

  const startTutorial = () => {
    setIsTutorial(true);
    setTutorialStep(0);
    setPendingType(null);
    setPendingCount(0);
    setLeftState({ xp: 2, xm: 0, up: 3, um: 0 });
    setRightState({ xp: 0, xm: 0, up: 7, um: 0 });
  };

  const startProblem = () => {
    setGameMode(GameMode.PROBLEM);
    setPhase(Phase.SOLVE);
    setPendingType(null);
    setPendingCount(0);

    if (!hasSeenTutorial) {
      setSolvedCount(0);
      setHasCredited(false);
      startTutorial();
    } else {
      setIsTutorial(false);
      generateProblem();
    }
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

  const applyBoth = async (type: StoneType, count: number) => {
    if (isAnimating || count <= 0) return;
    setIsAnimating(true);
    
    // Step 1: Add raw stone to both sides
    const updater = (prev: SideState) => {
      let next = { ...prev };
      switch (type) {
        case StoneType.X_PLUS: next.xp += count; break;
        case StoneType.X_MINUS: next.xm += count; break;
        case StoneType.ONE_PLUS: next.up += count; break;
        case StoneType.ONE_MINUS: next.um += count; break;
      }
      return next;
    };
    
    setLeftState(updater);
    setRightState(updater);

    // Step 2: 0.5s delay
    await new Promise(resolve => setTimeout(resolve, 500));
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
    const check = (s: SideState) => 
      s.xp % n === 0 && 
      s.xm % n === 0 && 
      s.up % n === 0 && 
      s.um % n === 0;
    return check(l) && check(r);
  };

  const largestDivisor = useMemo(() => {
    const maxVal = Math.max(
      leftState.xp, leftState.xm, leftState.up, leftState.um,
      rightState.xp, rightState.xm, rightState.up, rightState.um
    );
    if (maxVal < 2) return null;
    for (let n = maxVal; n >= 2; n--) {
      if (canDivide(n)) {
        return n;
      }
    }
    return null;
  }, [leftState, rightState]);

  const renderXStones = (state: SideState, prefix: string) => {
    const items: React.ReactNode[] = [];
    for (let i = 0; i < state.xp; i++) {
        items.push(
            <motion.div layout key={`${prefix}-xp-${i}`}>
                <Stone type={StoneType.X_PLUS} />
            </motion.div>
        );
    }
    for (let i = 0; i < state.xm; i++) {
        items.push(
            <motion.div layout key={`${prefix}-xm-${i}`}>
                <Stone type={StoneType.X_MINUS} />
            </motion.div>
        );
    }
    return items;
  };

  const renderUnitStones = (state: SideState, prefix: string) => {
    const items: React.ReactNode[] = [];
    for (let i = 0; i < state.up; i++) {
        items.push(
            <motion.div layout key={`${prefix}-up-${i}`}>
                <Stone type={StoneType.ONE_PLUS} />
            </motion.div>
        );
    }
    for (let i = 0; i < state.um; i++) {
        items.push(
            <motion.div layout key={`${prefix}-um-${i}`}>
                <Stone type={StoneType.ONE_MINUS} />
            </motion.div>
        );
    }
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
                className={`absolute top-6 left-6 z-50 p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm group ${isTutorial && tutorialStep !== 0 ? 'opacity-20 pointer-events-none' : ''}`}
                title="모드 선택"
                disabled={isTutorial && tutorialStep !== 0}
            >
                <ArrowLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
            </button>
        )}

        {gameMode === GameMode.PROBLEM && phase !== Phase.MODE_SELECT && !isTutorial && (
            <button 
                onClick={startTutorial}
                className="absolute top-6 left-20 z-50 p-3 bg-white border border-slate-100  rounded-2xl text-slate-500 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm text-xs font-black flex items-center gap-1.5 cursor-pointer"
                title="튜토리얼 다시 보기"
            >
                <HelpCircle size={20} className="text-indigo-500 animate-pulse-slow" />
                <span className="hidden sm:inline">튜토리얼 다시 보기</span>
            </button>
        )}

        {gameMode === GameMode.PROBLEM && phase !== Phase.MODE_SELECT && (
            <div className={`absolute top-6 right-6 z-40 bg-indigo-50 border border-indigo-110 rounded-2xl px-4 py-2.5 flex items-center gap-2 text-indigo-700 font-bold shadow-sm select-none animate-fade-in ${isTutorial && tutorialStep !== 0 ? 'opacity-20 pointer-events-none' : ''}`}>
                <Check size={16} className="text-indigo-600 animate-pulse" strokeWidth={3} />
                <span className="text-xs">해결한 문제: <strong className="text-sm font-black text-indigo-800">{solvedCount}개</strong></span>
            </div>
        )}

        {phase === Phase.MODE_SELECT ? (
           <div className="flex-1 flex flex-col items-center justify-center py-32 px-12 text-center gap-12 bg-white">
                <div className="space-y-4">
                    <h2 className="text-5xl font-black text-slate-800 tracking-tight">등식의 성질</h2>
                    <p className="text-slate-500 font-medium text-lg">양팔 저울을 이용해 방정식의 원리를 배워보세요!</p>
                </div>
                <div className="flex gap-6 w-full max-w-md">
                    <button 
                        onClick={startProblem}
                        className="flex-1 flex flex-col items-center gap-4 p-8 bg-indigo-50 border-2 border-indigo-100 rounded-3xl hover:border-indigo-300 hover:bg-indigo-100/50 transition-all group lg:scale-105 cursor-pointer"
                    >
                        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 group-hover:scale-110 transition-transform">
                            <Check size={32} />
                        </div>
                        <span className="text-xl font-bold text-indigo-700">문제 모드</span>
                    </button>
                    <button 
                        onClick={startPractice}
                        className="flex-1 flex flex-col items-center gap-4 p-8 bg-blue-50 border-2 border-blue-100 rounded-3xl hover:border-blue-300 hover:bg-blue-100/50 transition-all group cursor-pointer"
                    >
                        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
                            <RotateCcw size={32} />
                        </div>
                        <span className="text-xl font-bold text-blue-700">자유 탐구 모드</span>
                    </button>
                </div>
           </div>
        ) : (
          <div className="flex flex-col flex-1 relative">
            {isTutorial && tutorialStep === 0 && (
              <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[6px] z-50 flex items-center justify-center p-6 animate-fade-in">
                <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-blue-100 max-w-md w-full text-center flex flex-col items-center gap-6">
                  <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-white text-3xl shadow-lg shadow-indigo-150 animate-pulse animate-bounce-slow">
                    🎯
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">💡 시작하기</h3>
                    <p className="text-slate-600 text-sm font-bold leading-relaxed mt-4 px-2 text-center">
                      x의 무게를 알아내기 위해 한쪽 저울에는 x 돌 1개만, 다른 쪽 저울에는 숫자 돌만 남겨주세요!
                    </p>
                  </div>
                  
                  <div className="flex flex-col gap-2.5 w-full mt-2">
                    <button
                      onClick={() => setTutorialStep(1)}
                      className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-[#ffffff] font-extrabold text-sm rounded-2xl transition-all shadow-md active:scale-[0.98] cursor-pointer flex items-center justify-center"
                    >
                      🚀 튜토리얼 시작하기
                    </button>
                    <button 
                      onClick={() => {
                        setIsTutorial(false);
                        setHasSeenTutorial(true);
                        generateProblem();
                      }}
                      className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 font-bold text-xs rounded-2xl transition-all border border-slate-200/60 cursor-pointer"
                    >
                      튜토리얼 건너뛰기
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className={`flex flex-col flex-1 transition-all duration-300 ${isTutorial && tutorialStep === 0 ? 'filter blur-md pointer-events-none opacity-40 select-none' : ''}`}>
              
              {/* Top: Equation */}
              <EquationDisplay left={leftState} right={rightState} />

              {isTutorial && tutorialStep > 0 && (
                <div className="mx-8 mb-6 p-5 bg-gradient-to-r from-[#eff6ff] to-[#f5f3ff] border-2 border-blue-200 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm animate-fade-in relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-blue-500 to-indigo-500"></div>
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-extrabold text-base shrink-0 shadow-md">
                      {tutorialStep}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-slate-800 font-extrabold text-base flex items-center gap-1.5">
                        {tutorialStep === 1 && "💡 1단계: 양변에 -1 돌 추가하기"}
                        {tutorialStep === 2 && "💡 2단계: 돌 상쇄하기 (정리)"}
                        {tutorialStep === 3 && "💡 3단계: 양변 나누어 해 구하기"}
                      </h4>
                      
                      <p className="text-slate-600 text-sm font-bold leading-relaxed text-left mt-2">
                        {tutorialStep === 1 && "[-1] 돌을 3번 누른 다음, [추가하기]버튼을 눌러 양쪽에 추가해주세요."}
                        {tutorialStep === 2 && "[상쇄하기] 버튼을 누르면 부호가 서로 반대인 돌이 서로 상쇄되어 사라집니다!"}
                        {tutorialStep === 3 && "[÷2]를 누르면 양 쪽 저울에 있는 돌의 개수를 2로 나눌 수 있습니다. 최종 답을 구해보세요!"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3 shrink-0 items-center">
                    <button 
                      onClick={() => {
                        setIsTutorial(false);
                        setHasSeenTutorial(true);
                        generateProblem();
                      }}
                      className="px-4 py-2.5 bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl transition-all border border-slate-200 shadow-sm whitespace-nowrap cursor-pointer hover:border-slate-300"
                    >
                      튜토리얼 건너뛰기
                    </button>
                  </div>
                </div>
              )}

              {/* Center: Scale */}
              <div className="relative h-[280px] flex flex-col items-center justify-center px-12 bg-white mb-2">
                  {/* Success Announcement */}
                  <AnimatePresence>
                      {isSuccess && (
                          <motion.div 
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              className="absolute inset-0 z-40 bg-white/40 flex flex-col items-center justify-center p-8 text-center animate-fade-in"
                          >
                              <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-200/80 flex flex-col items-center max-w-sm">
                                  <h3 className="text-3xl font-black text-slate-800 mb-4">성공!</h3>

                                  {isTutorial && (
                                    <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-800 text-xs font-bold leading-relaxed text-left">
                                      🎉 축하합니다! 드디어 해결하셨습니다.<br/><br/>
                                      우리의 <strong>최종 목표</strong>는 이렇게 <strong className="text-emerald-950 font-black">한쪽 저울에는 x 돌 1개만, 다른 쪽 저울에는 숫자 돌만</strong> 남겨두어 x의 무게를 알아내는 것입니다!
                                    </div>
                                  )}
                                  
                                  <div className="flex flex-col gap-3 w-full">
                                      {gameMode === GameMode.PROBLEM && (
                                          <button 
                                              onClick={() => {
                                                  if (isTutorial) {
                                                      setIsTutorial(false);
                                                      setHasSeenTutorial(true);
                                                  }
                                                  generateProblem();
                                              }}
                                              className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg hover:bg-blue-700 transition-all text-sm"
                                          >
                                              다음 문제
                                          </button>
                                      )}
                                    {gameMode === GameMode.PRACTICE && (
                                        <button 
                                            onClick={() => setPhase(Phase.SETUP)}
                                            className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2 text-sm"
                                        >
                                            <RotateCcw size={18} />
                                            돌 다시 배치하기
                                        </button>
                                    )}
                                    {gameMode !== GameMode.PROBLEM && (
                                        <button 
                                            onClick={() => setPhase(Phase.MODE_SELECT)}
                                            className="w-full py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all border border-slate-200 text-sm"
                                        >
                                            모드 선택
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Beam */}
            <div className="absolute top-[35px] left-10 right-10 h-3 bg-[#8D9CB4] rounded-full shadow-sm z-30"></div>
            
            {/* Scale Pivot area */}
            <div className="absolute top-[35px] left-1/2 -translate-x-1/2 flex flex-col items-center">
                <div className="w-4 h-4 rounded-full border-4 border-white bg-[#8D9CB4] -mt-1.5 z-40"></div>
                {/* Vertical support */}
                <div className="w-3 h-[160px] bg-[#8D9CB4] -mt-0.5"></div>
                {/* Pivot Diamond */}
                <div className="w-12 h-12 bg-[#CED9E5] rotate-45 border-4 border-white shadow-sm -mt-6"></div>
                {/* Base */}
                <div className="w-40 h-3.5 bg-[#6B7B94] rounded-full -mt-2"></div>
            </div>

             <div className="flex gap-16 w-full mt-24 relative z-10">
                 {/* Left Pan */}
                 <div className="flex-1 flex flex-col items-center relative">
                     {/* Hanging Line */}
                     <div className="absolute -top-[96px] left-1/2 -translate-x-1/2 w-0.5 h-[96px] bg-[#D1D9E6]"></div>
                     <div className="w-full h-32 border-2 border-[#D1D9E6] border-t-0 rounded-b-[32px] relative flex flex-col justify-end p-3 pb-3 gap-0.5 bg-slate-50/30">
                         {/* Upper row for x and -x (윗줄) */}
                         <div className="flex flex-wrap justify-center items-end gap-1 min-h-[34px]">
                             <AnimatePresence>
                                 {renderXStones(leftState, 'left')}
                             </AnimatePresence>
                         </div>
                         
                         {/* Lower row for 1 and -1 (아랫줄) */}
                         <div className="flex flex-wrap justify-center items-end gap-1 min-h-[34px]">
                             <AnimatePresence>
                                 {renderUnitStones(leftState, 'left')}
                             </AnimatePresence>
                         </div>
                     </div>
                 </div>
 
                 {/* Right Pan */}
                 <div className="flex-1 flex flex-col items-center relative">
                      {/* Hanging Line */}
                     <div className="absolute -top-[96px] left-1/2 -translate-x-1/2 w-0.5 h-[96px] bg-[#D1D9E6]"></div>
                     <div className="w-full h-32 border-2 border-[#D1D9E6] border-t-0 rounded-b-[32px] relative flex flex-col justify-end p-3 pb-3 gap-0.5 bg-slate-50/30">
                         {/* Upper row for x and -x (윗줄) */}
                         <div className="flex flex-wrap justify-center items-end gap-1 min-h-[34px]">
                             <AnimatePresence>
                                 {renderXStones(rightState, 'right')}
                             </AnimatePresence>
                         </div>
                         
                         {/* Lower row for 1 and -1 (아랫줄) */}
                         <div className="flex flex-wrap justify-center items-end gap-1 min-h-[34px]">
                             <AnimatePresence>
                                 {renderUnitStones(rightState, 'right')}
                             </AnimatePresence>
                         </div>
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
                <button onClick={() => addStone('left', StoneType.X_MINUS)} className="hover:scale-110 transition-transform"><Stone type={StoneType.X_MINUS} /></button>
                <button onClick={() => addStone('left', StoneType.ONE_PLUS)} className="hover:scale-110 transition-transform"><Stone type={StoneType.ONE_PLUS} /></button>
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
                <button onClick={() => addStone('right', StoneType.X_MINUS)} className="hover:scale-110 transition-transform"><Stone type={StoneType.X_MINUS} /></button>
                <button onClick={() => addStone('right', StoneType.ONE_PLUS)} className="hover:scale-110 transition-transform"><Stone type={StoneType.ONE_PLUS} /></button>
                <button onClick={() => addStone('right', StoneType.ONE_MINUS)} className="hover:scale-110 transition-transform"><Stone type={StoneType.ONE_MINUS} /></button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-4 justify-center max-w-4xl mx-auto">
              {/* Box 1: Stone Selection & Click Incrementer */}
              <div className={`p-5 bg-white rounded-2xl shadow-sm border border-slate-100 grid grid-cols-2 gap-3 select-none justify-center items-center transition-all duration-300 ${
                isTutorial && tutorialStep > 0
                  ? (tutorialStep === 1 
                      ? 'relative z-30 ring-4 ring-indigo-500/30 scale-[1.02] shadow-xl' 
                      : 'opacity-20 pointer-events-none filter blur-[1px] scale-[0.98]') 
                  : ''
              }`}>
                <button 
                  onClick={() => handleStoneSelect(StoneType.X_PLUS)} 
                  disabled={isTutorial && tutorialStep === 1}
                  className={`hover:scale-110 active:scale-95 transition-all p-2 rounded-xl relative group border-2 ${isTutorial && tutorialStep === 1 ? 'opacity-30 cursor-not-allowed' : ''} ${
                    pendingType === StoneType.X_PLUS 
                      ? 'border-blue-500 bg-blue-50/20 shadow-sm' 
                      : 'border-transparent hover:bg-slate-50'
                  }`}
                >
                  <Stone type={StoneType.X_PLUS} />
                  {pendingType === StoneType.X_PLUS && pendingCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white font-black text-xs px-1.5 py-0.5 rounded-full flex items-center justify-center shadow-md animate-bounce">
                      +{pendingCount}
                    </span>
                  )}
                </button>
                
                <button 
                  onClick={() => handleStoneSelect(StoneType.X_MINUS)} 
                  disabled={isTutorial && tutorialStep === 1}
                  className={`hover:scale-110 active:scale-95 transition-all p-2 rounded-xl relative group border-2 ${isTutorial && tutorialStep === 1 ? 'opacity-30 cursor-not-allowed' : ''} ${
                    pendingType === StoneType.X_MINUS 
                      ? 'border-red-500 bg-red-50/20 shadow-sm' 
                      : 'border-transparent hover:bg-slate-50'
                  }`}
                >
                  <Stone type={StoneType.X_MINUS} />
                  {pendingType === StoneType.X_MINUS && pendingCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white font-black text-xs px-1.5 py-0.5 rounded-full flex items-center justify-center shadow-md animate-bounce">
                      +{pendingCount}
                    </span>
                  )}
                </button>

                <button 
                  onClick={() => handleStoneSelect(StoneType.ONE_PLUS)} 
                  disabled={isTutorial && tutorialStep === 1}
                  className={`hover:scale-110 active:scale-95 transition-all p-2 rounded-xl relative group border-2 ${isTutorial && tutorialStep === 1 ? 'opacity-30 cursor-not-allowed' : ''} ${
                    pendingType === StoneType.ONE_PLUS 
                      ? 'border-blue-500 bg-blue-50/20 shadow-sm' 
                      : 'border-transparent hover:bg-slate-50'
                  }`}
                >
                  <Stone type={StoneType.ONE_PLUS} />
                  {pendingType === StoneType.ONE_PLUS && pendingCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white font-black text-xs px-1.5 py-0.5 rounded-full flex items-center justify-center shadow-md animate-bounce">
                      +{pendingCount}
                    </span>
                  )}
                </button>

                <button 
                  onClick={() => handleStoneSelect(StoneType.ONE_MINUS)} 
                  className={`hover:scale-110 active:scale-95 transition-all p-2 rounded-xl relative group border-2 ${
                    pendingType === StoneType.ONE_MINUS 
                      ? 'border-red-500 bg-red-50/20 shadow-sm' 
                      : 'border-transparent hover:bg-slate-50'
                  } ${
                    isTutorial && tutorialStep === 1 && pendingType !== StoneType.ONE_MINUS
                      ? 'ring-4 ring-indigo-500 ring-offset-2 animate-pulse scale-105 shadow-md shadow-indigo-100 bg-indigo-50/50'
                      : ''
                  }`}
                >
                  <Stone type={StoneType.ONE_MINUS} />
                  {pendingType === StoneType.ONE_MINUS && pendingCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white font-black text-xs px-1.5 py-0.5 rounded-full flex items-center justify-center shadow-md animate-bounce">
                      +{pendingCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Box 2: Staging Action panel (Add to both side button) */}
              <div className={`p-4 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-between w-[220px] h-[196px] select-none transition-all duration-300 ${
                isTutorial && tutorialStep > 0
                  ? (tutorialStep === 1 
                      ? 'relative z-30 ring-4 ring-indigo-500/30 scale-[1.02] shadow-xl' 
                      : 'opacity-20 pointer-events-none filter blur-[1px] scale-[0.98]') 
                  : ''
              }`}>
                {/* Visual stones list preview */}
                <div className={`p-2 rounded-xl w-full h-[96px] min-h-[96px] max-h-[96px] flex items-center justify-center ${
                  pendingType && pendingCount > 0 
                    ? 'bg-slate-50 border border-slate-100 overflow-hidden' 
                    : 'bg-slate-50/50 border border-dashed border-slate-200'
                }`}>
                  {pendingType && pendingCount > 0 ? (
                    <div className="grid grid-cols-5 gap-x-1.5 gap-y-1 justify-items-center items-center mx-auto">
                      {Array.from({ length: pendingCount }).map((_, i) => (
                        <div key={i} className="scale-75 origin-center animate-fade-in">
                          <Stone type={pendingType} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-300 font-bold"></span>
                  )}
                </div>

                {/* Controls (Cancel and Count Adjuster) */}
                <div className={`flex gap-2 w-full transition-all duration-150 ${
                  pendingType && pendingCount > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}>
                  <button 
                    onClick={clearPending}
                    disabled={!pendingType}
                    className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-xs rounded-xl transition-colors"
                  >
                    취소
                  </button>
                  <div className="flex items-center bg-slate-50 rounded-xl overflow-hidden border border-slate-100 flex-1 justify-between">
                    <button 
                      onClick={() => setPendingCount(prev => Math.max(1, prev - 1))}
                      disabled={!pendingType}
                      className="px-2 py-1 hover:bg-slate-200 font-extrabold text-slate-600 text-xs transition-colors"
                    >
                      -
                    </button>
                    <span className="font-extrabold text-slate-700 text-xs">{pendingCount}</span>
                    <button 
                      onClick={() => setPendingCount(prev => Math.min(10, prev + 1))}
                      disabled={!pendingType}
                      className="px-2 py-1 hover:bg-slate-200 font-extrabold text-slate-600 text-xs transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Apply Button */}
                <button
                  onClick={handleApplyPending}
                  disabled={isAnimating || !pendingType || pendingCount === 0 || (isTutorial && tutorialStep === 1 && (pendingType !== StoneType.ONE_MINUS || pendingCount !== 3))}
                  className={`w-full py-2 font-black text-xs rounded-xl transition-all ${
                    pendingType && pendingCount > 0 && !(isTutorial && tutorialStep === 1 && (pendingType !== StoneType.ONE_MINUS || pendingCount !== 3))
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md active:scale-98 animate-pulse cursor-pointer'
                      : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                  } ${
                    isTutorial && tutorialStep === 1 && pendingType === StoneType.ONE_MINUS && pendingCount === 3
                      ? 'ring-4 ring-indigo-500 ring-offset-1 animate-pulse scale-102 font-extrabold text-[#ffffff]'
                      : ''
                  }`}
                >
                  추가하기
                </button>
              </div>

              {/* Combined Box 4: Multipliers & Divisors */}
              <div className={`p-4 bg-white rounded-2xl shadow-sm border border-slate-100 flex gap-4 select-none h-[196px] items-center transition-all duration-300 ${
                isTutorial && tutorialStep > 0
                  ? (tutorialStep === 3 
                      ? 'relative z-30 ring-4 ring-indigo-500/30 scale-[1.02] shadow-xl' 
                      : 'opacity-20 pointer-events-none filter blur-[1px] scale-[0.98]') 
                  : ''
              }`}>
                {/* Multipliers column */}
                <div className="flex flex-col gap-1.5 items-center justify-center">
                  <span className="text-[10px] font-black text-slate-400">곱하기</span>
                  <div className="grid grid-cols-2 gap-2">
                    {[2, 3, 5, 7].map(n => (
                      <button 
                        key={n} 
                        onClick={() => multiplyBoth(n)} 
                        className="w-12 h-10 border border-slate-200 rounded-lg font-bold text-blue-600 hover:bg-blue-50 transition-colors active:scale-95 text-sm"
                      >
                        x{n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Divider line */}
                <div className="w-[1px] bg-slate-100 self-stretch my-2"></div>

                {/* Divisors column */}
                <div className="flex flex-col gap-1.5 items-center justify-center w-[104px]">
                  <span className="text-[10px] font-black text-slate-400">나누기</span>
                  <div className="w-full h-[88px] flex items-center justify-center">
                    {largestDivisor ? (
                      <button 
                        onClick={() => divideBoth(largestDivisor)} 
                        className={`w-full h-full border border-slate-200 rounded-lg font-bold text-blue-600 hover:bg-blue-50 transition-colors active:scale-95 flex flex-col items-center justify-center shadow-sm ${
                          isTutorial && tutorialStep === 3 && largestDivisor === 2
                            ? 'ring-4 ring-indigo-500 ring-offset-2 animate-pulse scale-105 bg-indigo-50 text-indigo-700 border-indigo-200'
                            : ''
                        }`}
                      >
                        <span className="text-base font-black">÷{largestDivisor}</span>
                        <span className="text-[9px] text-blue-500 font-bold mt-0.5">나누기 {largestDivisor}</span>
                      </button>
                    ) : (
                      <div className="w-full h-full border border-dashed border-slate-200 bg-slate-50/50 rounded-lg flex items-center justify-center">
                        {/* Empty/blank placeholder to keep layout fully stable */}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Box 3: Settle / Simplify */}
              <div className={`p-4 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center transition-all duration-300 ${
                isTutorial && tutorialStep > 0
                  ? (tutorialStep === 2 
                      ? 'relative z-30 ring-4 ring-indigo-500/30 scale-[1.02] shadow-xl' 
                      : 'opacity-20 pointer-events-none filter blur-[1px] scale-[0.98]') 
                  : ''
              }`}>
                <button 
                  onClick={handleSettleBoth} 
                  disabled={isAnimating || !canSettle()}
                  className={`flex flex-col items-center justify-center font-bold text-xs w-24 h-20 p-2 rounded-xl border transition-all active:scale-95 ${
                    canSettle()
                      ? 'border-indigo-100 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-250 shadow-sm shadow-indigo-100 cursor-pointer animate-pulse-slow'
                      : 'border-slate-100 text-slate-300 bg-slate-50 opacity-40 cursor-not-allowed'
                  } ${
                    isTutorial && tutorialStep === 2 && canSettle()
                      ? 'ring-4 ring-indigo-500 ring-offset-2 animate-pulse scale-105 border-indigo-200 bg-indigo-100'
                      : ''
                  }`}
                >
                    <span className="text-sm font-black">상쇄하기</span>
                    {canSettle() && (
                      <span className="text-[10px] text-indigo-500 mt-1">정리 가능</span>
                    )}
                </button>
              </div>

                {/* Phase 2 Side Controls */}
                <div className={`flex flex-col justify-center transition-all duration-300 ${
                  isTutorial && tutorialStep > 0 ? 'opacity-20 pointer-events-none filter blur-[1px]' : ''
                }`}>
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
        </div>
        )}
      </div>
      
      {/* Visual Overlay if animating to prevent clicks */}
      {isAnimating && <div className="fixed inset-0 z-50 cursor-wait"></div>}
    </div>
  );
}

