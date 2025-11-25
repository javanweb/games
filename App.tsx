
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Loader, useProgress } from '@react-three/drei';
import { GameStatus, NoteData, COLORS } from './types';
import { DEMO_CHART, SONG_URL, SONG_BPM } from './constants';
import { useMediaPipe } from './hooks/useMediaPipe';
import GameScene from './components/GameScene';
import WebcamPreview from './components/WebcamPreview';
import { Play, RefreshCw, VideoOff, Hand, Sparkles, Activity, Trophy, XCircle, Zap, Music, RotateCcw } from 'lucide-react';

const App: React.FC = () => {
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.LOADING);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [health, setHealth] = useState(100);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Robust Audio Initialization
    const audio = new Audio();
    audio.src = SONG_URL;
    audio.preload = 'auto';
    audio.volume = 0.6;
    // REMOVED crossOrigin = 'anonymous' to fix playback errors with direct file links.
    // We do not need analysis data for this version, so simple playback is sufficient and safer.

    const handleError = (e: Event | string) => {
        console.warn("Audio failed to load:", e);
    };
    audio.addEventListener('error', handleError);

    audioRef.current = audio;

    return () => {
      audio.removeEventListener('error', handleError);
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  const videoRef = useRef<HTMLVideoElement>(null);
  
  const { isCameraReady, handPositionsRef, lastResultsRef, error: cameraError } = useMediaPipe(videoRef);
  
  const handleNoteHit = useCallback((note: NoteData, goodCut: boolean) => {
     let points = 100;
     if (goodCut) points += 50; 

     if (navigator.vibrate) {
         navigator.vibrate(goodCut ? 40 : 20);
     }

     setCombo(c => {
       const newCombo = c + 1;
       if (newCombo > 30) setMultiplier(8);
       else if (newCombo > 20) setMultiplier(4);
       else if (newCombo > 10) setMultiplier(2);
       else setMultiplier(1);
       return newCombo;
     });

     setScore(s => s + (points * multiplier));
     setHealth(h => Math.min(100, h + 2));
  }, [multiplier]);

  const handleNoteMiss = useCallback((note: NoteData) => {
      setCombo(0);
      setMultiplier(1);
      setHealth(h => {
          const newHealth = h - 15;
          if (newHealth <= 0) {
             setTimeout(() => endGame(false), 0);
             return 0;
          }
          return newHealth;
      });
  }, []);

  const startGame = async () => {
    if (!isCameraReady) return;
    
    setScore(0);
    setCombo(0);
    setMultiplier(1);
    setHealth(100);

    DEMO_CHART.forEach(n => { n.hit = false; n.missed = false; });

    try {
      if (audioRef.current) {
          if (audioRef.current.error) {
             console.log("Audio previously failed, reloading...");
             audioRef.current.load();
          }
          audioRef.current.currentTime = 0;
          await audioRef.current.play();
          setGameStatus(GameStatus.PLAYING);
      }
    } catch (e) {
        console.error("Audio play failed", e);
        alert("Tap Start again to play audio (browser interaction policy).");
    }
  };

  const endGame = (victory: boolean) => {
      setGameStatus(victory ? GameStatus.VICTORY : GameStatus.GAME_OVER);
      if (audioRef.current) {
          audioRef.current.pause();
      }
  };

  useEffect(() => {
      if (gameStatus === GameStatus.LOADING && isCameraReady) {
          setGameStatus(GameStatus.IDLE);
      }
  }, [isCameraReady, gameStatus]);

  return (
    <div className="relative w-full h-screen overflow-hidden font-sans bg-gradient-to-br from-[#050508] via-[#0f172a] to-[#050508] text-white selection:bg-cyan-500/30">
      
      {/* Hidden Video */}
      <video 
        ref={videoRef} 
        className="absolute opacity-0 pointer-events-none"
        playsInline
        muted
        autoPlay
        style={{ width: '640px', height: '480px' }}
      />

      {/* 3D Scene */}
      <Canvas shadows dpr={[1, 2]} className="z-0">
          {gameStatus !== GameStatus.LOADING && (
             <GameScene 
                gameStatus={gameStatus}
                audioRef={audioRef as React.RefObject<HTMLAudioElement>}
                handPositionsRef={handPositionsRef}
                chart={DEMO_CHART}
                onNoteHit={handleNoteHit}
                onNoteMiss={handleNoteMiss}
                onSongEnd={() => endGame(true)}
             />
          )}
      </Canvas>

      {/* Camera Widget - Floating Glass */}
      <div className="fixed top-6 right-6 z-30 transition-all duration-500 hover:scale-105 group">
          <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500 to-pink-500 rounded-2xl opacity-0 group-hover:opacity-20 blur-lg transition-opacity duration-500" />
          <WebcamPreview 
              videoRef={videoRef} 
              resultsRef={lastResultsRef} 
              isCameraReady={isCameraReady} 
          />
      </div>

      {/* HUD & UI - Modern Aero / Glassmorphism */}
      <div className="absolute inset-0 pointer-events-none flex flex-col p-6 z-20">
          
          {/* Playing HUD */}
          {gameStatus === GameStatus.PLAYING && (
            <div className="flex flex-col w-full h-full justify-between">
                {/* Top Bar */}
                <div className="flex justify-between items-start w-full max-w-6xl mx-auto pt-4">
                  
                  {/* Health Gauge */}
                   <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-full p-1 pr-6 flex items-center shadow-lg">
                       <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors duration-500 ${health > 30 ? 'border-cyan-400 bg-cyan-400/10' : 'border-rose-500 bg-rose-500/10 animate-pulse'}`}>
                          <Activity className={`w-6 h-6 ${health > 30 ? 'text-cyan-400' : 'text-rose-500'}`} />
                       </div>
                       <div className="ml-4 w-48">
                           <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold mb-1 text-white/60">
                              <span>Integrity</span>
                           </div>
                           <div className="h-2 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                               <div 
                                  className={`h-full transition-all duration-300 rounded-full ${health > 50 ? 'bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'bg-gradient-to-r from-rose-500 to-orange-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'}`}
                                  style={{ width: `${health}%` }}
                               />
                           </div>
                       </div>
                   </div>

                   {/* Score Center */}
                   <div className="flex flex-col items-center transform -translate-y-2">
                       <div className="flex flex-col items-center">
                          <span className="text-[10px] tracking-[0.3em] text-cyan-200 uppercase mb-1 opacity-70">Total Score</span>
                          <h1 className="text-7xl font-light tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 drop-shadow-xl font-sans">
                              {score.toLocaleString()}
                          </h1>
                       </div>
                       
                       {combo > 0 && (
                         <div className="mt-2 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4">
                             <span className="text-4xl font-bold italic tracking-tighter text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]">
                               {combo}x
                             </span>
                             <span className="text-xs tracking-[0.5em] text-white/40 uppercase">Combo</span>
                         </div>
                       )}
                   </div>
                   
                   {/* Multiplier Badge */}
                   <div className="w-64 flex justify-end">
                      <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-3 flex flex-col items-end shadow-lg">
                          <span className="text-[10px] uppercase tracking-widest text-white/40">Multiplier</span>
                          <div className="text-3xl font-bold text-white flex items-baseline gap-1">
                              <span>x</span>
                              <span className={`${multiplier >= 8 ? 'text-pink-400 drop-shadow-[0_0_8px_rgba(244,114,182,0.8)]' : multiplier >= 4 ? 'text-cyan-400' : 'text-white'}`}>
                                {multiplier}
                              </span>
                          </div>
                      </div>
                   </div>
                </div>
                
                {/* Bottom Visuals */}
                <div className="flex justify-between items-end pb-8 px-12 opacity-50">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-pink-400 shadow-[0_0_10px_#f472b6] animate-pulse" />
                        <span className="text-xs font-mono text-pink-300 tracking-widest">LEFT_HAND_ACTIVE</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-cyan-300 tracking-widest">RIGHT_HAND_ACTIVE</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-pulse delay-75" />
                    </div>
                </div>
            </div>
          )}

          {/* Center Interface (Menus) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-auto z-50">
              
              {/* Loading Screen */}
              {gameStatus === GameStatus.LOADING && (
                  <div className="relative bg-white/5 backdrop-blur-2xl p-12 rounded-[3rem] border border-white/10 flex flex-col items-center shadow-2xl">
                      <div className="w-16 h-16 mb-6 relative">
                          <div className="absolute inset-0 border-t-2 border-cyan-400 rounded-full animate-spin"></div>
                          <div className="absolute inset-2 border-r-2 border-pink-500 rounded-full animate-spin [animation-direction:reverse]"></div>
                      </div>
                      <h2 className="text-xl font-light tracking-[0.3em] text-white mb-2">SYSTEM INITIALIZING</h2>
                      <p className="text-white/30 text-xs font-mono">{!isCameraReady ? "WAITING_FOR_OPTICS..." : "CALIBRATING_SPATIAL_DATA..."}</p>
                      {cameraError && (
                          <div className="mt-6 px-6 py-3 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-200 text-xs flex items-center gap-2">
                              <XCircle className="w-4 h-4" /> {cameraError}
                          </div>
                      )}
                  </div>
              )}

              {/* Main Menu */}
              {gameStatus === GameStatus.IDLE && (
                  <div className="relative group perspective-1000">
                      {/* Glass Card */}
                      <div className="relative bg-black/40 backdrop-blur-3xl p-20 rounded-[3rem] border border-white/5 text-center max-w-4xl shadow-[0_0_60px_rgba(0,0,0,0.5)] overflow-hidden">
                          
                          {/* Decorative background gradients inside card */}
                          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                          <div className="absolute -top-20 -left-20 w-60 h-60 bg-cyan-500/20 rounded-full blur-3xl" />
                          <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-pink-500/20 rounded-full blur-3xl" />

                          <div className="relative z-10">
                            <div className="flex justify-center mb-10">
                               <div className="w-24 h-24 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-[2rem] flex items-center justify-center shadow-[0_20px_50px_rgba(6,182,212,0.3)] rotate-6 hover:rotate-0 transition-all duration-500">
                                  <Zap className="w-12 h-12 text-white fill-white" />
                               </div>
                            </div>
                            
                            <h1 className="text-8xl font-thin text-white mb-4 tracking-tighter leading-none">
                                TEMPO<span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500">STRIKE</span>
                            </h1>
                            <div className="flex items-center justify-center gap-4 mb-10">
                                <div className="h-px w-12 bg-gradient-to-r from-transparent to-white/30"></div>
                                <p className="text-white/50 text-sm tracking-[0.4em] uppercase font-light">Rhythm Action Experience</p>
                                <div className="h-px w-12 bg-gradient-to-l from-transparent to-white/30"></div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-6 mb-12 text-left">
                                <div className="bg-white/5 rounded-2xl p-5 border border-white/5 hover:bg-white/10 transition-colors">
                                    <Hand className="w-6 h-6 text-cyan-400 mb-3" />
                                    <h3 className="text-white font-bold text-sm mb-1">Motion Control</h3>
                                    <p className="text-white/40 text-xs leading-relaxed">Use your hands to slash incoming notes.</p>
                                </div>
                                <div className="bg-white/5 rounded-2xl p-5 border border-white/5 hover:bg-white/10 transition-colors">
                                    <Sparkles className="w-6 h-6 text-pink-400 mb-3" />
                                    <h3 className="text-white font-bold text-sm mb-1">Rhythm Sync</h3>
                                    <p className="text-white/40 text-xs leading-relaxed">Strike to the beat for maximum score.</p>
                                </div>
                                <div className="bg-white/5 rounded-2xl p-5 border border-white/5 hover:bg-white/10 transition-colors">
                                    <Activity className="w-6 h-6 text-emerald-400 mb-3" />
                                    <h3 className="text-white font-bold text-sm mb-1">Stay Alive</h3>
                                    <p className="text-white/40 text-xs leading-relaxed">Missing notes drains your integrity.</p>
                                </div>
                            </div>

                            {!isCameraReady ? (
                                 <div className="inline-flex items-center justify-center gap-3 px-10 py-5 rounded-full bg-white/5 border border-white/10 text-white/40 animate-pulse">
                                     <VideoOff className="w-5 h-5" /> 
                                     <span>INITIALIZING SENSORS...</span>
                                 </div>
                            ) : (
                                <button 
                                    onClick={startGame}
                                    className="group/btn relative inline-flex items-center justify-center gap-4 px-20 py-6 bg-white hover:bg-gray-50 text-black rounded-full text-lg font-bold tracking-widest hover:scale-105 transition-all duration-300 shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:shadow-[0_0_80px_rgba(34,211,238,0.4)] overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 opacity-0 group-hover/btn:opacity-10 transition-opacity duration-300" />
                                    <Play className="w-5 h-5 fill-black relative z-10" /> 
                                    <span className="relative z-10">ENGAGE LINK</span>
                                </button>
                            )}
                          </div>
                      </div>
                  </div>
              )}

              {/* End Game Screen */}
              {(gameStatus === GameStatus.GAME_OVER || gameStatus === GameStatus.VICTORY) && (
                  <div className="relative bg-black/60 backdrop-blur-3xl p-16 rounded-[3rem] border border-white/10 text-center shadow-2xl min-w-[500px]">
                      <div className="absolute -top-14 left-1/2 transform -translate-x-1/2">
                          {gameStatus === GameStatus.VICTORY ? (
                              <div className="w-28 h-28 bg-gradient-to-br from-amber-300 to-orange-500 rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(251,191,36,0.6)] border-8 border-[#050508]">
                                  <Trophy className="w-12 h-12 text-white fill-white" />
                              </div>
                          ) : (
                              <div className="w-28 h-28 bg-gradient-to-br from-rose-500 to-red-700 rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(244,63,94,0.6)] border-8 border-[#050508]">
                                  <XCircle className="w-12 h-12 text-white" />
                              </div>
                          )}
                      </div>
                      
                      <h2 className="mt-12 text-5xl font-bold mb-2 tracking-tighter text-white">
                          {gameStatus === GameStatus.VICTORY ? "SESSION CLEAR" : "SYNC FAILED"}
                      </h2>
                      <p className="text-white/40 text-sm tracking-widest uppercase mb-10">Performance Summary</p>
                      
                      <div className="grid grid-cols-2 gap-4 mb-10">
                          <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                              <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2">Final Score</p>
                              <p className="text-3xl font-sans font-bold text-white">{score.toLocaleString()}</p>
                          </div>
                          <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                              <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2">Max Combo</p>
                              <p className="text-3xl font-sans font-bold text-cyan-400">{combo}x</p>
                          </div>
                      </div>

                      <button 
                          onClick={() => setGameStatus(GameStatus.IDLE)}
                          className="w-full bg-white hover:bg-gray-200 text-black text-lg font-bold py-6 px-8 rounded-2xl flex items-center justify-center gap-3 transition-all hover:scale-[1.02] shadow-lg"
                      >
                          <RotateCcw className="w-5 h-5" /> RESTART SESSION
                      </button>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};

export default App;
