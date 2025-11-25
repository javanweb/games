
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import { CutDirection, NoteData } from "./types";
import * as THREE from 'three';

// Game World Config
export const TRACK_LENGTH = 50;
export const SPAWN_Z = -30;
export const PLAYER_Z = 0;
export const MISS_Z = 5;
export const NOTE_SPEED = 14; // Faster for high energy feel

export const LANE_WIDTH = 0.8;
export const LAYER_HEIGHT = 0.8;
export const NOTE_SIZE = 0.5;

// Positions for the 4 lanes (centered around 0)
export const LANE_X_POSITIONS = [-1.5 * LANE_WIDTH, -0.5 * LANE_WIDTH, 0.5 * LANE_WIDTH, 1.5 * LANE_WIDTH];
export const LAYER_Y_POSITIONS = [0.8, 1.6, 2.4]; // Low, Mid, High

// Audio
// Using a highly reliable track from Three.js examples to ensure playback works
export const SONG_URL = 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/sounds/376737_Skullbeatz___Bad_Cat_Maste.mp3';
export const SONG_BPM = 120; 
const BEAT_TIME = 60 / SONG_BPM;

// Generate a simple rhythmic chart
export const generateDemoChart = (): NoteData[] => {
  const notes: NoteData[] = [];
  let idCount = 0;

  // Simple pattern generator
  for (let i = 4; i < 300; i += 2) { // Start after 4 beats
    const time = i * BEAT_TIME;
    
    // Complexify patterns based on progress
    const pattern = Math.floor(i / 16) % 4;

    if (pattern === 0) {
      // Basic Alternating
      if (i % 4 === 0) {
         notes.push({
          id: `note-${idCount++}`,
          time: time,
          lineIndex: 1,
          lineLayer: 0,
          type: 'left',
          cutDirection: CutDirection.ANY
        });
      } else {
        notes.push({
          id: `note-${idCount++}`,
          time: time,
          lineIndex: 2,
          lineLayer: 0,
          type: 'right',
          cutDirection: CutDirection.ANY
        });
      }
    } else if (pattern === 1) {
      // Double Hits (Claps)
      if (i % 8 === 0) {
         notes.push(
           { id: `note-${idCount++}`, time, lineIndex: 1, lineLayer: 1, type: 'left', cutDirection: CutDirection.ANY },
           { id: `note-${idCount++}`, time, lineIndex: 2, lineLayer: 1, type: 'right', cutDirection: CutDirection.ANY }
         );
      }
    } else if (pattern === 2) {
      // Wide Splits
      notes.push({
        id: `note-${idCount++}`,
        time: time,
        lineIndex: 0,
        lineLayer: 0,
        type: 'left',
        cutDirection: CutDirection.LEFT
      });
      notes.push({
        id: `note-${idCount++}`,
        time: time,
        lineIndex: 3,
        lineLayer: 0,
        type: 'right',
        cutDirection: CutDirection.RIGHT
      });
    } else {
      // Streams
      notes.push({
        id: `note-${idCount++}`,
        time: time,
        lineIndex: 1,
        lineLayer: 0,
        type: 'left',
        cutDirection: CutDirection.DOWN
      });
       notes.push({
        id: `note-${idCount++}`,
        time: time + (BEAT_TIME/2),
        lineIndex: 2,
        lineLayer: 0,
        type: 'right',
        cutDirection: CutDirection.DOWN
      });
    }
  }

  return notes.sort((a, b) => a.time - b.time);
};

export const DEMO_CHART = generateDemoChart();

// Vectors for direction checking
export const DIRECTION_VECTORS: Record<CutDirection, THREE.Vector3> = {
  [CutDirection.UP]: new THREE.Vector3(0, 1, 0),
  [CutDirection.DOWN]: new THREE.Vector3(0, -1, 0),
  [CutDirection.LEFT]: new THREE.Vector3(-1, 0, 0),
  [CutDirection.RIGHT]: new THREE.Vector3(1, 0, 0),
  [CutDirection.ANY]: new THREE.Vector3(0, 0, 0) // Magnitude check only
};
