
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { HandType, COLORS } from '../types';

interface SaberProps {
  type: HandType;
  positionRef: React.MutableRefObject<THREE.Vector3 | null>;
  velocityRef: React.MutableRefObject<THREE.Vector3 | null>;
}

const Saber: React.FC<SaberProps> = ({ type, positionRef, velocityRef }) => {
  const meshRef = useRef<THREE.Group>(null);
  const saberLength = 1.3; 

  const targetRotation = useRef(new THREE.Euler());
  
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    const targetPos = positionRef.current;
    const velocity = velocityRef.current;

    if (targetPos) {
      meshRef.current.visible = true;
      meshRef.current.position.lerp(targetPos, 0.4); 
      
      const restingX = -Math.PI / 3.5; 
      const restingY = 0;
      const restingZ = type === 'left' ? 0.2 : -0.2; 

      let swayX = 0;
      let swayY = 0;
      let swayZ = 0;

      if (velocity) {
          swayX = velocity.y * 0.05; 
          swayZ = -velocity.x * 0.05;
          swayX += velocity.z * 0.02;
      }

      targetRotation.current.set(
          restingX + swayX,
          restingY + swayY,
          restingZ + swayZ
      );

      meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, targetRotation.current.x, 0.2);
      meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, targetRotation.current.y, 0.2);
      meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, targetRotation.current.z, 0.2);

    } else {
      meshRef.current.visible = false;
    }
  });

  const color = type === 'left' ? COLORS.left : COLORS.right;

  return (
    <group ref={meshRef}>
      {/* Sleek White Handle (Aero Style) */}
      <mesh position={[0, -0.06, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.16, 32]} />
        <meshPhysicalMaterial 
          color="#ffffff" 
          roughness={0.1} 
          metalness={0.2} 
          clearcoat={1}
        />
      </mesh>
      
      {/* Chrome Pommel */}
      <mesh position={[0, -0.145, 0]}>
         <cylinderGeometry args={[0.02, 0.02, 0.01, 32]} />
         <meshStandardMaterial color="#cbd5e1" roughness={0.2} metalness={1.0} />
      </mesh>

      {/* Emitter Guard - Chrome */}
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.022, 0.018, 0.02, 32]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.1} metalness={1} />
      </mesh>

      {/* Emitter Glow Ring */}
      <mesh position={[0, 0.031, 0]}>
        <torusGeometry args={[0.02, 0.002, 8, 32]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>


      {/* --- BLADE --- */}
      {/* Intense White Core */}
      <mesh position={[0, 0.05 + saberLength / 2, 0]}>
        <cylinderGeometry args={[0.008, 0.008, saberLength, 8]} />
        <meshBasicMaterial color="white" toneMapped={false} />
      </mesh>

      {/* Plasma Glow Field - Glassy Look */}
      <mesh position={[0, 0.05 + saberLength / 2, 0]}>
        <capsuleGeometry args={[0.035, saberLength, 8, 16]} />
        <meshPhysicalMaterial 
          color={color} 
          emissive={color} 
          emissiveIntensity={3} 
          toneMapped={false} 
          transparent
          opacity={0.3} 
          thickness={0.5}
          roughness={0}
          transmission={0.6}
        />
      </mesh>
      
      <pointLight color={color} intensity={3} distance={5} decay={2} position={[0, 0.3, 0]} />
    </group>
  );
};

export default Saber;
