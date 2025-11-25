
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import * as THREE from 'three';
import React from 'react';

export enum GameStatus {
  LOADING = 'LOADING',
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY'
}

export type HandType = 'left' | 'right';

// 0: Up, 1: Down, 2: Left, 3: Right, 4: Any (Dot)
export enum CutDirection {
  UP = 0,
  DOWN = 1,
  LEFT = 2,
  RIGHT = 3,
  ANY = 4
}

export interface NoteData {
  id: string;
  time: number;     // Time in seconds when it should reach the player
  lineIndex: number; // 0-3 (horizontal position)
  lineLayer: number; // 0-2 (vertical position)
  type: HandType;    // which hand should cut it
  cutDirection: CutDirection;
  hit?: boolean;
  missed?: boolean;
  hitTime?: number; // Time when hit occurred
}

export interface HandPositions {
  left: THREE.Vector3 | null;
  right: THREE.Vector3 | null;
  leftVelocity: THREE.Vector3;
  rightVelocity: THREE.Vector3;
}

// Modern Neon Palette - Updated for fresher look
export const COLORS = {
  left: '#f472b6',  // Neon Pink
  right: '#22d3ee', // Neon Cyan
  track: '#0f172a', // Slate 900
  hittable: '#ffffff'
};

// Robust fix for "Property does not exist on type JSX.IntrinsicElements" errors
declare global {
  namespace JSX {
    interface IntrinsicElements {
       [elemName: string]: any;
    }
  }
}
