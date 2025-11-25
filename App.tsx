
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
import { Play, RefreshCw, VideoOff, Hand, Sparkles, Activity, Trophy, XCircle, Zap, Music } from 'lucide-react';

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
    audio.volume = 0.5;
    // Removing crossOrigin = anonymous can sometimes fix issues with certain simple CDNs if they don't send CORS headers, 
    // but usually it's needed for Web Audio API analysis. For simple playback <audio>, it's less critical.
    audio.crossOrigin = 'anonymous'; 

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
             console.log("Reloading audio...");
             audioRef.current.load();
          }
          audioRef.current.currentTime = 0;
          await audioRef.current.play();
          setGameStatus(GameStatus.PLAYING);
      }
    } catch (e) {
        console.error("Audio play failed", e);
        // Fallback for interaction policies
        alert("Please tap again to start audio.");
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
    <div className="relative w-full h-screen overflow-hidden font-sans bg-[#050508] text-white">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/40 via-[#050508] to-[#050508] z-0" />
      
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

      {/* Camera Widget - Modern Glass */}
      <div className="fixed bottom-8 right-8 z-30 transition-all duration-500 hover:scale-105">
          <WebcamPreview 
              videoRef={videoRef} 
              resultsRef={lastResultsRef} 
              isCameraReady={isCameraReady} 
          />
      </div>

      {/* HUD & UI */}
      <div className="absolute inset-0 pointer-events-none flex flex-col p-6 z-20">
          
          {/* Header Bar */}
          <div className="flex justify-between items-start w-full max-w-7xl mx-auto">
             
             {/* Health Bar - Cyber Style */}
             <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-full h-14 w-72 px-2 flex items-center shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                 <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center mr-3 border border-white/10">
                    <Activity className={`w-5 h-5 ${health < 30 ? 'text-rose-500 animate-pulse' : 'text-emerald-400'}`} />
                 </div>
                 <div className="flex-1 flex flex-col justify-center gap-1">
                     <div className="flex justify-between text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                        <span>Sync Integrity</span>
                        <span>{Math.round(health)}%</span>
                     </div>
                     <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                         <div 
                            className={`h-full transition-all duration-300 ${health > 50 ? 'bg-gradient-to-r from-emerald-400 to-cyan-400' : 'bg-gradient-to-r from-rose-500 to-orange-500'}`}
                            style={{ width: `${health}%` }}
                         />
                     </div>
                 </div>
             </div>

             {/* Score - Clean Modern */}
             <div className="flex flex-col items-center">
                 <div className="relative">
                     <h1 className="text-8xl font-sans font-thin tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-100 to-gray-400 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                         {score.toLocaleString()}
                     </h1>
                     {multiplier > 1 && (
                         <div className="absolute -right-16 top-0 bg-indigo-500/80 backdrop-blur text-white text-xs font-bold px-2 py-1 rounded rotate-12 shadow-[0_0_10px_#6366f1]">
                             {multiplier}x
                         </div>
                     )}
                 </div>
                 <div className={`mt-2 px-6 py-1 rounded-full border text-sm uppercase tracking-[0.3em] transition-all duration-300 ${combo > 0 ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.2)]' : 'border-transparent text-gray-500'}`}>
                     {combo} Combo
                 </div>
             </div>
             
             <div className="w-72 flex justify-end">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-full p-3 shadow-lg">
                    <Music className="w-6 h-6 text-pink-400" />
                </div>
             </div>
          </div>

          {/* Center Interface */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
              
              {/* Loading Screen */}
              {gameStatus === GameStatus.LOADING && (
                  <div className="relative bg-black/20 backdrop-blur-3xl p-16 rounded-[3rem] border border-white/10 flex flex-col items-center shadow-2xl">
                      <div className="w-20 h-20 mb-8 relative">
                          <div className="absolute inset-0 border-4 border-t-cyan-400 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                          <div className="absolute inset-0 border-4 border-t-transparent border-r-pink-500 border-b-transparent border-l-transparent rounded-full animate-spin [animation-direction:reverse]"></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                              <Sparkles className="w-6 h-6 text-white animate-pulse" />
                          </div>
                      </div>
                      <h2 className="text-2xl font-light tracking-[0.2em] text-white mb-2">INITIALIZING</h2>
                      <p className="text-white/40 text-sm font-mono">{!isCameraReady ? "SEARCHING_CAMERA_FEED..." : "LOADING_ASSETS..."}</p>
                      {cameraError && (
                          <div className="mt-8 px-6 py-3 bg-rose-500/10 border border-rose-500/30 rounded-full text-rose-300 text-sm flex items-center gap-3">
                              <XCircle className="w-4 h-4" /> {cameraError}
                          </div>
                      )}
                  </div>
              )}

              {/* Main Menu */}
              {gameStatus === GameStatus.IDLE && (
                  <div className="relative group">
                      {/* Glow effect */}
                      <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 rounded-[2.5rem] opacity-30 blur-xl group-hover:opacity-50 transition duration-1000"></div>
                      
                      <div className="relative bg-[#080810]/80 backdrop-blur-2xl p-20 rounded-[2.5rem] border border-white/10 text-center max-w-3xl shadow-2xl">
                          <div className="flex justify-center mb-8">
                             <div className="w-20 h-20 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/20 rotate-3 group-hover:rotate-6 transition-transform">
                                <Zap className="w-10 h-10 text-white fill-white" />
                             </div>
                          </div>
                          
                          <h1 className="text-7xl font-light text-white mb-6 tracking-tighter">
                              TEMPO<strong className="font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-500">STRIKE</strong>
                          </h1>
                          
                          <p className="text-gray-400 text-lg mb-12 max-w-md mx-auto font-light leading-relaxed">
                              Use your hands to slash through the rhythm. Ensure good lighting and stand back from the camera.
                          </p>

                          {!isCameraReady ? (
                               <div className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-white/5 border border-white/10 text-gray-400 animate-pulse">
                                   <VideoOff className="w-5 h-5" /> 
                                   <span>Awaiting Camera Signal...</span>
                               </div>
                          ) : (
                              <button 
                                  onClick={startGame}
                                  className="group/btn relative inline-flex items-center justify-center gap-4 px-16 py-6 bg-white text-black rounded-full text-lg font-bold tracking-widest hover:scale-105 transition-all duration-300 shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.5)] overflow-hidden"
                              >
                                  <div className="absolute inset-0 bg-gradient-to-r from-gray-100 to-white opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                                  <Play className="w-6 h-6 fill-black relative z-10" /> 
                                  <span className="relative z-10">START GAME</span>
                              </button>
                          )}
                          
                          <div className="mt-16 flex items-center justify-center gap-8 text-xs font-mono text-gray-500 uppercase tracking-widest">
                              <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse"></div>
                                  Left Hand
                              </div>
                              <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse delay-75"></div>
                                  Right Hand
                              </div>
                          </div>
                      </div>
                  </div>
              )}

              {/* End Game Screen */}
              {(gameStatus === GameStatus.GAME_OVER || gameStatus === GameStatus.VICTORY) && (
                  <div className="relative bg-[#080810]/90 backdrop-blur-2xl p-16 rounded-[2.5rem] border border-white/10 text-center shadow-2xl min-w-[450px]">
                      <div className="absolute -top-12 left-1/2 transform -translate-x-1/2">
                          {gameStatus === GameStatus.VICTORY ? (
                              <div className="w-24 h-24 bg-gradient-to-br from-yellow-300 to-amber-500 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(251,191,36,0.4)] border-4 border-[#080810]">
                                  <Trophy className="w-10 h-10 text-white fill-white" />
                              </div>
                          ) : (
                              <div className="w-24 h-24 bg-gradient-to-br from-rose-500 to-red-600 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(244,63,94,0.4)] border-4 border-[#080810]">
                                  <Activity className="w-10 h-10 text-white" />
                              </div>
                          )}
                      </div>
                      
                      <h2 className="mt-10 text-4xl font-bold mb-2 tracking-tight text-white">
                          {gameStatus === GameStatus.VICTORY ? "COMPLETE" : "FAILED"}
                      </h2>
                      
                      <div className="my-10 grid grid-cols-2 gap-4">
                          <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                              <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Score</p>
                              <p className="text-2xl font-mono font-bold text-white">{score.toLocaleString()}</p>
                          </div>
                          <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                              <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Status</p>
                              <p className={`text-2xl font-mono font-bold ${gameStatus === GameStatus.VICTORY ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {gameStatus === GameStatus.VICTORY ? 'CLEAR' : 'CRITICAL'}
                              </p>
                          </div>
                      </div>

                      <button 
                          onClick={() => setGameStatus(GameStatus.IDLE)}
                          className="w-full bg-white hover:bg-gray-200 text-black text-lg font-bold py-5 px-8 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] shadow-lg"
                      >
                          <RefreshCw className="w-5 h-5" /> REPLAY
                      </button>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};

export default App;
