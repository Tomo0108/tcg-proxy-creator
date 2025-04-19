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
const CARD_HEIGHT = CARD_WIDTH * CARD_ASPECT_RATIO;
const FADE_OUT_START_Y = 0; // このY座標以下でフェードアウト開始
const FADE_OUT_END_Y = -6; // このY座標で完全に消える
const RESET_Y = -7; // このY座標以下でリセット

export function CardInstances({ count, isMobile }: CardInstancesProps) {
  const meshRef = useRef<THREE.InstancedMesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial[]>>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // テクスチャの読み込み
  const frontTextures = useLoader(TextureLoader, [
    "/card/front_01.webp",
    "/card/front_02.webp",
    "/card/front_03.webp",
    "/card/front_04.webp",
    "/card/front_05.webp",
  ]);
  const backTexture = useLoader(TextureLoader, "/card/back.webp");

  // 各インスタンスの状態を管理
  const instancesData = useMemo<CardInstanceData[]>(() => {
    const data: CardInstanceData[] = [];
    const speedFactor = isMobile ? 0.7 : 1.0; // モバイルでは速度を落とす
    for (let i = 0; i < count; i++) {
      data.push({
        id: i,
        position: new THREE.Vector3(
          rand(-8, 8),
          rand(10, 15), // 初期Y位置
          rand(-3, 3)
        ),
        rotation: new THREE.Euler(rand(0, Math.PI * 2), rand(0, Math.PI * 2), rand(0, Math.PI * 2)),
        velocity: rand(0.05, 0.12) * speedFactor,
        rotationSpeed: new THREE.Vector3(
          rand(0.005, 0.02),
          rand(0.005, 0.02),
          rand(0.005, 0.02)
        ).multiplyScalar(speedFactor),
        textureIndex: Math.floor(rand(0, frontTextures.length)),
        opacity: 1.0,
        isFadingOut: false,
      });
    }
    return data;
  }, [count, frontTextures.length, isMobile]);

  // マテリアルの作成 (表面用と裏面用)
  // MeshBasicMaterialの配列を作成し、InstancedMeshの第2型引数に渡す
  const materials = useMemo(() => {
    const frontMats = frontTextures.map(tex => new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    const backMat = new THREE.MeshBasicMaterial({ map: backTexture, side: THREE.BackSide, transparent: true, depthWrite: false }); // 裏面はBackSide
    return [...frontMats, backMat]; // [表面0, 表面1, ..., 表面4, 裏面]
  }, [frontTextures, backTexture]);

  // ジオメトリの作成 (表面と裏面を背中合わせに配置)
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(CARD_WIDTH, CARD_HEIGHT);
    // UV座標を調整する必要があればここで行う
    return geo;
  }, []);

  // 毎フレームの更新処理
  useFrame((state, delta) => {
    if (!meshRef.current) return;

    instancesData.forEach((data, i) => {
      // 位置と回転を更新
      data.position.y -= data.velocity;
      data.rotation.x += data.rotationSpeed.x;
      data.rotation.y += data.rotationSpeed.y;
      data.rotation.z += data.rotationSpeed.z;

      // フェードアウト処理
      if (data.position.y <= FADE_OUT_START_Y && data.position.y > FADE_OUT_END_Y) {
        data.isFadingOut = true;
        // FADE_OUT_START_Y から FADE_OUT_END_Y の間で線形に透明度を変化させる
        data.opacity = 1.0 - (FADE_OUT_START_Y - data.position.y) / (FADE_OUT_START_Y - FADE_OUT_END_Y);
        data.opacity = Math.max(0, Math.min(1, data.opacity)); // 0-1の範囲にクランプ
      } else if (data.position.y <= FADE_OUT_END_Y) {
         data.opacity = 0; // 完全に透明
         data.isFadingOut = true; // フェードアウト完了状態を維持
      } else {
        data.opacity = 1.0; // フェードアウト範囲外なら不透明
        data.isFadingOut = false;
      }

      // 画面外に出たらリセット
      if (data.position.y < RESET_Y) {
        data.position.set(rand(-8, 8), rand(10, 15), rand(-3, 3));
