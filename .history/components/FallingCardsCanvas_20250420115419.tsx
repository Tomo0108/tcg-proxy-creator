"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { CardInstances } from "./CardInstances";
import { Suspense, useState, useEffect, useMemo } from "react";
// Removed usePathname import
import * as THREE from "three";
import { EffectComposer } from "@react-three/postprocessing";
// Try importing DepthOfFieldEffect instead
import { DepthOfFieldEffect } from "postprocessing";

// Inner component to access camera via useThree
function Effects() {
  const { camera } = useThree();
  return useMemo(() => <primitive object={new DepthOfFieldEffect(camera, { focusDistance: 0.0, focalLength: 0.03, bokehScale: 2.0, height: 480 })} attach="passes" />, [camera]);
}

export function FallingCardsCanvas() {
  const [isMobile, setIsMobile] = useState(false);
  const [instanceCount, setInstanceCount] = useState(50);
  const [dpr, setDpr] = useState(1);
  // Removed isStandalone and pathname state variables

  useEffect(() => {
    // Simplified effect to only handle mobile/DPR adjustments
    const checkDevice = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setInstanceCount(mobile ? 25 : 50);
      setDpr(Math.min(window.devicePixelRatio, 1.5));
    };

    checkDevice(); // Initial check
    window.addEventListener("resize", checkDevice); // Update on resize

    // Removed standalone check and media query listener logic

    return () => window.removeEventListener("resize", checkDevice); // Cleanup resize listener
  }, []); // Runs once on mount

  // Removed conditional rendering based on isStandalone and pathname

  return (
    // Changed position to absolute, zIndex to 0
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}>
      <Canvas
        gl={{
          antialias: true,
          alpha: true, // Background transparency
          powerPreference: "high-performance",
        }}
        dpr={dpr} // Use state for DPR
        camera={{
          position: [0, 0, 10],
          fov: 50,
          near: 0.1,
          far: 100,
          rotation: [THREE.MathUtils.degToRad(-15), 0, 0],
        }}
        style={{ background: 'transparent' }}
      >
        {/* Wrap scene content with EffectComposer and MotionBlur */}
        <EffectComposer>
          <ambientLight intensity={1.5} />
          <ambientLight intensity={1.5} />
          <Suspense fallback={null}>
            <CardInstances count={instanceCount} isMobile={isMobile} />
          </Suspense>
          {/* Use DepthOfFieldEffect via inner component */}
          <Effects />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
