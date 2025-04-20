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
  const [isStandalone, setIsStandalone] = useState(false);
  const pathname = usePathname(); // Get current pathname

  useEffect(() => {
    // This effect runs only on the client after mount
    const checkEnvironment = () => {
      const mobile = window.innerWidth < 768;
      const standalone = window.matchMedia('(display-mode: standalone)').matches;

      setIsMobile(mobile);
      setInstanceCount(mobile ? 25 : 50);
      setDpr(Math.min(window.devicePixelRatio, 1.5));
      setIsStandalone(standalone); // Update standalone state
    };

    checkEnvironment(); // Initial check on mount
    window.addEventListener("resize", checkEnvironment); // Update on resize

    // Also listen for changes in display mode if possible, though resize often covers this
    const mediaQueryList = window.matchMedia('(display-mode: standalone)');
    const handleChange = () => setIsStandalone(mediaQueryList.matches);
    mediaQueryList.addEventListener('change', handleChange);


    return () => {
      window.removeEventListener("resize", checkEnvironment); // Cleanup resize listener
      mediaQueryList.removeEventListener('change', handleChange); // Cleanup media query listener
    }
  }, []); // Empty dependency array ensures this runs only once on mount and cleanup on unmount

  // If running in PWA standalone mode AND not on the homepage, don't render the canvas
  if (isStandalone && pathname !== '/') {
    return null;
  }

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
