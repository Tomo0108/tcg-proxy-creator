"use client";

import { Canvas } from "@react-three/fiber";
import { CardInstances } from "./CardInstances";
import { Suspense, useState, useEffect } from "react";
import * as THREE from "three";

export function FallingCardsCanvas() {
  const [isMobile, setIsMobile] = useState(false);
  const [instanceCount, setInstanceCount] = useState(150); // デフォルトはPC用

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setInstanceCount(mobile ? 80 : 150); // スマホなら枚数を減らす
    };
    checkMobile(); // 初期チェック
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1, pointerEvents: 'none' }}>
      <Canvas
        gl={{
          antialias: true,
          alpha: true, // 背景透過
          powerPreference: "high-performance",
        }}
        dpr={Math.min(window.devicePixelRatio, 1.5)} // DPR制限
        camera={{
          position: [0, 0, 10], // カメラ位置調整
          fov: 50,
          near: 0.1,
          far: 100,
          rotation: [THREE.MathUtils.degToRad(-15), 0, 0], // 少し下向きに (-25度だと下すぎたので調整)
        }}
        style={{ background: 'transparent' }} // Canvas自体の背景も透過
      >
        <ambientLight intensity={1.5} /> {/* Corrected: camelCase */}
        <Suspense fallback={null}> {/* テクスチャ読み込み中のフォールバック */}
          <CardInstances count={instanceCount} isMobile={isMobile} />
        </Suspense>
      </Canvas>
    </div>
  );
}
