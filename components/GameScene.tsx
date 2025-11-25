
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment, Grid, PerspectiveCamera, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { GameStatus, NoteData, HandPositions, COLORS, CutDirection } from '../types';
import { PLAYER_Z, SPAWN_Z, MISS_Z, NOTE_SPEED, DIRECTION_VECTORS, LANE_X_POSITIONS, LAYER_Y_POSITIONS, SONG_BPM } from '../constants';
import Note from './Note';
import Saber from './Saber';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

interface GameSceneProps {
  gameStatus: GameStatus;
  audioRef: React.RefObject<HTMLAudioElement>;
  handPositionsRef: React.MutableRefObject<any>;
  chart: NoteData[];
  onNoteHit: (note: NoteData, goodCut: boolean) => void;
  onNoteMiss: (note: NoteData) => void;
  onSongEnd: () => void;
}

const BEAT_TIME = 60 / SONG_BPM;

const GameScene: React.FC<GameSceneProps> = ({ 
    gameStatus, 
    audioRef, 
    handPositionsRef, 
    chart,
    onNoteHit,
    onNoteMiss,
    onSongEnd
}) => {
  const [notesState, setNotesState] = useState<NoteData[]>(chart);
  const [currentTime, setCurrentTime] = useState(0);

  const activeNotesRef = useRef<NoteData[]>([]);
  const nextNoteIndexRef = useRef(0);
  const shakeIntensity = useRef(0);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const ambientLightRef = useRef<THREE.AmbientLight>(null);
  const spotLightRef = useRef<THREE.SpotLight>(null);

  const vecA = useMemo(() => new THREE.Vector3(), []);
  const vecB = useMemo(() => new THREE.Vector3(), []);

  const handleHit = (note: NoteData, goodCut: boolean) => {
      shakeIntensity.current = goodCut ? 0.3 : 0.15;
      onNoteHit(note, goodCut);
  }

  useFrame((state, delta) => {
    // --- Beat Pulsing ---
    if (audioRef.current && gameStatus === GameStatus.PLAYING) {
        const time = audioRef.current.currentTime;
        const beatPhase = (time % BEAT_TIME) / BEAT_TIME;
        const pulse = Math.pow(1 - beatPhase, 3); 
        
        if (ambientLightRef.current) {
            ambientLightRef.current.intensity = 0.5 + (pulse * 0.3);
        }
    }

    // --- Camera Shake ---
    if (shakeIntensity.current > 0 && cameraRef.current) {
        const shake = shakeIntensity.current;
        cameraRef.current.position.x = (Math.random() - 0.5) * shake;
        cameraRef.current.position.y = 1.8 + (Math.random() - 0.5) * shake;
        cameraRef.current.position.z = 4 + (Math.random() - 0.5) * shake;
        
        shakeIntensity.current = THREE.MathUtils.lerp(shakeIntensity.current, 0, 12 * delta);
        if (shakeIntensity.current < 0.01) {
             shakeIntensity.current = 0;
             cameraRef.current.position.set(0, 1.8, 4);
        }
    }

    if (gameStatus !== GameStatus.PLAYING || !audioRef.current) return;

    const time = audioRef.current.currentTime;
    setCurrentTime(time);

    if (audioRef.current.ended) {
        onSongEnd();
        return;
    }

    // Spawn Notes
    const spawnAheadTime = Math.abs(SPAWN_Z - PLAYER_Z) / NOTE_SPEED;
    
    while (nextNoteIndexRef.current < notesState.length) {
      const nextNote = notesState[nextNoteIndexRef.current];
      if (nextNote.time - spawnAheadTime <= time) {
        activeNotesRef.current.push(nextNote);
        nextNoteIndexRef.current++;
      } else {
        break;
      }
    }

    // Update & Collide
    const hands = handPositionsRef.current as HandPositions;

    for (let i = activeNotesRef.current.length - 1; i >= 0; i--) {
        const note = activeNotesRef.current[i];
        if (note.hit || note.missed) continue;

        const timeDiff = note.time - time; 
        const currentZ = PLAYER_Z - (timeDiff * NOTE_SPEED);

        if (currentZ > MISS_Z) {
            note.missed = true;
            onNoteMiss(note);
            activeNotesRef.current.splice(i, 1);
            continue;
        }

        if (currentZ > PLAYER_Z - 1.5 && currentZ < PLAYER_Z + 1.0) {
            const handPos = note.type === 'left' ? hands.left : hands.right;
            const handVel = note.type === 'left' ? hands.leftVelocity : hands.rightVelocity;

            if (handPos) {
                 const notePos = vecA.set(
                     LANE_X_POSITIONS[note.lineIndex],
                     LAYER_Y_POSITIONS[note.lineLayer],
                     currentZ
                 );

                 if (handPos.distanceTo(notePos) < 0.9) {
                     let goodCut = true;
                     const speed = handVel.length();

                     if (note.cutDirection !== CutDirection.ANY) {
                         const requiredDir = DIRECTION_VECTORS[note.cutDirection];
                         vecB.copy(handVel).normalize();
                         const dot = vecB.dot(requiredDir);
                         
                         // More forgiving angle check
                         if (dot < 0.3 || speed < 1.0) { 
                             goodCut = false;
                         }
                     } else {
                         if (speed < 1.0) goodCut = false; 
                     }

                     note.hit = true;
                     note.hitTime = time;
                     handleHit(note, goodCut);
                     activeNotesRef.current.splice(i, 1);
                 }
            }
        }
    }
  });

  const visibleNotes = useMemo(() => {
     return notesState.filter(n => 
         !n.missed && 
         (!n.hit || (currentTime - (n.hitTime || 0) < 0.5)) && 
         (n.time - currentTime) < 5 && 
         (n.time - currentTime) > -2 
     );
  }, [notesState, currentTime]);

  const leftHandPosRef = useRef<THREE.Vector3 | null>(null);
  const rightHandPosRef = useRef<THREE.Vector3 | null>(null);
  const leftHandVelRef = useRef<THREE.Vector3 | null>(null);
  const rightHandVelRef = useRef<THREE.Vector3 | null>(null);

  useFrame(() => {
     leftHandPosRef.current = handPositionsRef.current.left;
     rightHandPosRef.current = handPositionsRef.current.right;
     leftHandVelRef.current = handPositionsRef.current.leftVelocity;
     rightHandVelRef.current = handPositionsRef.current.rightVelocity;
  });

  return (
    <>
      <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 1.8, 4]} fov={60} />
      
      {/* Updated Background Color - Deep Midnight Blue */}
      <color attach="background" args={['#050508']} />
      <fog attach="fog" args={['#050508', 10, 50]} />
      
      <ambientLight ref={ambientLightRef} intensity={0.5} />
      {/* Main performance light */}
      <spotLight 
        ref={spotLightRef} 
        position={[0, 15, 5]} 
        angle={0.6} 
        penumbra={1} 
        intensity={2} 
        castShadow 
        color="#ffffff"
      />
      {/* Rim light for player */}
      <pointLight position={[0, 2, -5]} intensity={1} color="#4f46e5" />

      {/* Glossy Reflective Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
          <planeGeometry args={[20, 100]} />
          <meshPhysicalMaterial 
            color="#0a0a0e" 
            roughness={0.05} 
            metalness={0.8}
            reflectivity={1}
            clearcoat={1}
            clearcoatRoughness={0}
          />
      </mesh>

      {/* Neon Grid */}
      <Grid 
        position={[0, 0.01, 0]} 
        args={[8, 100]} 
        cellThickness={0.1} 
        cellColor="#334155" 
        sectionSize={2} 
        sectionThickness={1.5} 
        sectionColor="#475569" 
        fadeDistance={40} 
        infiniteGrid 
      />
      
      {/* Side Track Guides - Cyan/Pink Glow */}
      <group position={[-4, 0, 0]}>
         <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
             <planeGeometry args={[0.2, 100]} />
             <meshBasicMaterial color={COLORS.left} transparent opacity={0.3} />
         </mesh>
      </group>
      <group position={[4, 0, 0]}>
         <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
             <planeGeometry args={[0.2, 100]} />
             <meshBasicMaterial color={COLORS.right} transparent opacity={0.3} />
         </mesh>
      </group>

      <Stars radius={80} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      <Saber type="left" positionRef={leftHandPosRef} velocityRef={leftHandVelRef} />
      <Saber type="right" positionRef={rightHandPosRef} velocityRef={rightHandVelRef} />

      {visibleNotes.map(note => (
          <Note 
            key={note.id} 
            data={note} 
            zPos={PLAYER_Z - ((note.time - currentTime) * NOTE_SPEED)} 
            currentTime={currentTime}
          />
      ))}
    </>
  );
};

export default GameScene;
