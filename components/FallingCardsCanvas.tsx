"use client";

import { Canvas, useThree } from "@react-three/fiber"; // Import useThree
import { CardInstances } from "./CardInstances";
import { Suspense, useState, useEffect, useMemo } from "react";
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
  const [instanceCount, setInstanceCount] = useState(50); // Default for SSR/PC (Changed to 50)
  const [dpr, setDpr] = useState(1); // Default DPR for SSR

  useEffect(() => {
    // This effect runs only on the client after mount
    const checkDevice = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setInstanceCount(mobile ? 25 : 50); // Adjust count based on width (Changed to 25/50)
      setDpr(Math.min(window.devicePixelRatio, 1.5)); // Calculate DPR on client
    };

    checkDevice(); // Initial check on mount
    window.addEventListener("resize", checkDevice); // Update on resize

    return () => window.removeEventListener("resize", checkDevice); // Cleanup listener
  }, []); // Empty dependency array ensures this runs only once on mount and cleanup on unmount

  // Render null or a placeholder during SSR or before client-side check is complete
  // to avoid using potentially incorrect initial state for DPR/count.
  // However, since the canvas itself is fixed and background, initial render might be acceptable.
  // Let's proceed with rendering the canvas immediately.

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1, pointerEvents: 'none' }}>
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
