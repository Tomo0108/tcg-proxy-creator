"use client";

import { Canvas } from "@react-three/fiber";
import { CardInstances } from "./CardInstances";
import { Suspense, useState, useEffect } from "react";
import * as THREE from "three";
import { EffectComposer, MotionBlur } from "@react-three/postprocessing"; // Import postprocessing components

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
          <Suspense fallback={null}>
            <CardInstances count={instanceCount} isMobile={isMobile} />
          </Suspense>
          <MotionBlur
            intensity={0.5} // Adjust intensity (0 to 1)
            jitter={0.2} // Adjust jitter (0 to 1)
            samples={16} // Adjust samples (power of 2)
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
