"use client";

import * as THREE from "three";
import { useRef, useMemo, useEffect } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { rand } from "@/lib/utils";

// カードインスタンスごとのデータ構造
interface CardInstanceData {
  id: number; // 元の配列でのインデックス (0 to count-1)
  position: THREE.Vector3;
  rotation: THREE.Euler;
  velocity: number;
  rotationSpeed: THREE.Vector3;
  textureIndex: number; // 0-13
  opacity: number; // スケール制御で代替
  isFadingOut: boolean;
}

interface CardInstancesProps {
  count: number;
  isMobile: boolean;
}

const CARD_ASPECT_RATIO = 1.4;
const CARD_WIDTH = 1;
const CARD_HEIGHT = CARD_WIDTH * CARD_ASPECT_RATIO;
const FADE_OUT_END_Y = -6;
const RESET_Y = -7;
const NUM_FRONT_TEXTURES = 14;

export function CardInstances({ count, isMobile }: CardInstancesProps) {
  const frontMeshRefs = useRef<(THREE.InstancedMesh | null)[]>(new Array(NUM_FRONT_TEXTURES).fill(null));
  const backMeshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // テクスチャ読み込み
  const texturePaths = useMemo(() => [
    ...Array.from({ length: NUM_FRONT_TEXTURES }, (_, i) => `/card/front_${String(i + 1).padStart(2, '0')}.webp`),
    '/card/back.webp'
  ], []);
  const textures = useLoader(THREE.TextureLoader, texturePaths);
  const frontTextures = useMemo(() => textures.slice(0, NUM_FRONT_TEXTURES), [textures]);
  const backTexture = useMemo(() => textures[NUM_FRONT_TEXTURES], [textures]);

  // インスタンスデータの初期化と管理
  const instancesData = useRef<CardInstanceData[]>([]);
  useEffect(() => {
    instancesData.current = []; // countやisMobileが変わった場合にリセット
    const speedFactor = isMobile ? 0.7 : 1.0;
    for (let i = 0; i < count; i++) {
      instancesData.current.push({
        id: i,
        position: new THREE.Vector3(rand(-8, 8), rand(10, 15), rand(-3, 3)),
        rotation: new THREE.Euler(rand(0, Math.PI * 2), rand(0, Math.PI * 2), rand(0, Math.PI * 2)),
        velocity: rand(0.05, 0.12) * speedFactor,
        rotationSpeed: new THREE.Vector3(rand(0.005, 0.02), rand(0.005, 0.02), rand(0.005, 0.02)).multiplyScalar(speedFactor),
        textureIndex: Math.floor(rand(0, NUM_FRONT_TEXTURES)),
        opacity: 1.0,
        isFadingOut: false,
      });
    }
    // count変更時にInstancedMeshのcountも更新する必要があるかもしれないが、
    // R3Fがargsの変更を検知して再生成してくれるはず。
  }, [count, isMobile]); // count や isMobile が変わったらインスタンスデータを再生成

  // マテリアル作成
  const frontMaterials = useMemo(() =>
  const frontMaterials = useMemo(() =>
    frontTextures.map(tex => new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, alphaTest: 0.1 }))
  , [frontTextures]);

  const backMaterial = useMemo(() =>
    new THREE.MeshBasicMaterial({ map: backTexture, side: THREE.BackSide, transparent: true, depthWrite: false, alphaTest: 0.1 })
  , [backTexture]);

  // ジオメトリの作成
  const geometry = useMemo(() => new THREE.PlaneGeometry(CARD_WIDTH, CARD_HEIGHT), []);

  // 毎フレームの更新処理
  useFrame(() => {
    if (!backMeshRef.current || frontMeshRefs.current.length !== NUM_FRONT_TEXTURES) return;

    // 全てのInstancedMeshのマトリックス更新フラグを立てる準備
    const needsMatrixUpdateRefs = [...frontMeshRefs.current, backMeshRef.current];

    instancesData.forEach((data, i) => {
      // 位置と回転を更新
      data.position.y -= data.velocity;
      data.rotation.x += data.rotationSpeed.x;
      data.rotation.y += data.rotationSpeed.y;
      data.rotation.z += data.rotationSpeed.z;

      // 画面外に出たらリセット
      if (data.position.y < RESET_Y) {
        data.position.set(rand(-8, 8), rand(10, 15), rand(-3, 3));
        data.rotation.set(rand(0, Math.PI * 2), rand(0, Math.PI * 2), rand(0, Math.PI * 2));
        const speedFactor = isMobile ? 0.7 : 1.0;
        data.velocity = rand(0.05, 0.12) * speedFactor;
        data.rotationSpeed.set(rand(0.005, 0.02), rand(0.005, 0.02), rand(0.005, 0.02)).multiplyScalar(speedFactor);
        data.textureIndex = Math.floor(rand(0, NUM_FRONT_TEXTURES)); // テクスチャもリセット
        data.opacity = 1.0; // スケールリセットのため内部的には使用
        data.isFadingOut = false;
      }

      // ダミーオブジェクトに位置と回転を設定
      dummy.position.copy(data.position);
      dummy.rotation.copy(data.rotation);

      // フェードアウト処理 (スケールで代替)
      if (data.position.y <= FADE_OUT_END_Y) {
        dummy.scale.set(0, 0, 0); // 見えなくする
      } else {
        dummy.scale.set(1, 1, 1);
      }
      dummy.updateMatrix();

      // 該当する表面InstancedMeshと裏面InstancedMeshのマトリックスを設定
      const frontMesh = frontMeshRefs.current[data.textureIndex];
      if (frontMesh) {
        frontMesh.setMatrixAt(i, dummy.matrix);
      }
      backMeshRef.current.setMatrixAt(i, dummy.matrix);

    });

    // 全てのInstancedMeshのマトリックス更新を通知
    needsMatrixUpdateRefs.forEach(meshRef => {
      if (meshRef) {
        meshRef.instanceMatrix.needsUpdate = true;
      }
    });
  });

  // useEffectでref配列のサイズを確保
  useEffect(() => {
    frontMeshRefs.current = frontMeshRefs.current.slice(0, NUM_FRONT_TEXTURES);
  }, []);


  return (
    <>
      {/* 表面用 InstancedMesh (テクスチャごとに1つずつ) */}
      {frontMaterials.map((material, index) => (
        <instancedMesh
          key={`front-${index}`}
          ref={el => frontMeshRefs.current[index] = el} // ref配列に格納
          args={[geometry, material, count]} // countは全インスタンス数
          frustumCulled={false}
        />
      ))}
      {/* 裏面用 InstancedMesh */}
      <instancedMesh
        ref={backMeshRef}
        args={[geometry, backMaterial, count]} // countは全インスタンス数
        frustumCulled={false}
      />
    </>
  );
}
