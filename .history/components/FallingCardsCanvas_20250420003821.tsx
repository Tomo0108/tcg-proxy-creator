"use client";

import { Canvas } from "@react-three/fiber";
import { CardInstances } from "./CardInstances";
import { Suspense, useState, useEffect } from "react";
import * as THREE from "three";

export function FallingCardsCanvas() {
  const [isMobile, setIsMobile] = useState(false);
  const [instanceCount, setInstanceCount] = useState(150); // Default for SSR/PC
  const [dpr, setDpr] = useState(1); // Default DPR for SSR

  useEffect(() => {
    // This effect runs only on the client after mount
    const checkDevice = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setInstanceCount(mobile ? 80 : 150); // Adjust count based on width
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
        <ambientLight intensity={1.5} />
        <Suspense fallback={null}>
          {/* Render CardInstances only after client-side check? Or let it handle count changes? */}
          {/* Let CardInstances handle count changes via props */}
          <CardInstances count={instanceCount} isMobile={isMobile} />
        </Suspense>
      </Canvas>
    </div>
  );
}
