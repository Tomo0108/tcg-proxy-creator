"use client";

import * as THREE from "three";
import { useRef, useMemo, useEffect } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { TextureLoader } from "three/src/loaders/TextureLoader";
import { rand } from "@/lib/utils";

// カードインスタンスごとのデータ構造
interface CardInstanceData {
  id: number;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  velocity: number; // 落下速度
  rotationSpeed: THREE.Vector3; // 回転速度
  textureIndex: number; // 表面テクスチャのインデックス
  opacity: number; // 透明度 (フェードアウト用)
  isFadingOut: boolean; // フェードアウト中か
}

interface CardInstancesProps {
  count: number; // 表示するカードの枚数
  isMobile: boolean; // モバイル判定
}

const CARD_ASPECT_RATIO = 1.4; // カードの縦横比 (高さ / 幅)
const CARD_WIDTH = 1;
