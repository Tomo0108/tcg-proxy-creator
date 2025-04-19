"use client";

import * as THREE from "three";
import { useRef, useMemo, useEffect } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { rand } from "@/lib/utils";

// カードインスタンスごとのデータ構造
interface CardInstanceData {
  id: number;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  velocity: number; // 落下速度
  rotationSpeed: THREE.Vector3; // 回転速度
  textureIndex: number; // 表面テクスチャのインデックス (0-13)
  opacity: number; // 透明度 (フェードアウト用 - スケール制御で代替)
  isFadingOut: boolean; // フェードアウト中か
}

interface CardInstancesProps {
  count: number; // 表示するカードの枚数
  isMobile: boolean; // モバイル判定
}

const CARD_ASPECT_RATIO = 1.4; // カードの縦横比 (高さ / 幅)
const CARD_WIDTH = 1;
const CARD_HEIGHT = CARD_WIDTH * CARD_ASPECT_RATIO;
const FADE_OUT_START_Y = 0; // このY座標以下でフェードアウト開始 (未使用)
const FADE_OUT_END_Y = -6; // このY座標で完全に消える
const RESET_Y = -7; // このY座標以下でリセット

export function CardInstances({ count, isMobile }: CardInstancesProps) {
  const frontMeshRef = useRef<THREE.InstancedMesh>(null!);
  const backMeshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // テクスチャの読み込み (表面は1枚だけ使用)
  const frontTexture = useLoader(THREE.TextureLoader, "/card/front_01.webp");
  const backTexture = useLoader(THREE.TextureLoader, "/card/back.webp");

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
        // textureIndex: Math.floor(rand(0, 5)), // 未使用
        opacity: 1.0,
        isFadingOut: false,
      });
    }
    return data;
  }, [count, isMobile]);

  // マテリアルの作成
  const frontMaterial = useMemo(() =>
    new THREE.MeshBasicMaterial({ map: frontTexture, transparent: true, depthWrite: false, alphaTest: 0.1 })
  , [frontTexture]);

  const backMaterial = useMemo(() =>
    new THREE.MeshBasicMaterial({ map: backTexture, side: THREE.BackSide, transparent: true, depthWrite: false, alphaTest: 0.1 })
  , [backTexture]);

  // ジオメトリの作成
  const geometry = useMemo(() => new THREE.PlaneGeometry(CARD_WIDTH, CARD_HEIGHT), []);

  // 毎フレームの更新処理
  useFrame(() => {
    if (!frontMeshRef.current || !backMeshRef.current) return;

    let needsMaterialUpdate = false;

    instancesData.forEach((data, i) => {
      const previousOpacity = data.opacity;

      // 位置と回転を更新
      data.position.y -= data.velocity;
      data.rotation.x += data.rotationSpeed.x;
      data.rotation.y += data.rotationSpeed.y;
      data.rotation.z += data.rotationSpeed.z;

      // フェードアウト処理
      if (data.position.y <= FADE_OUT_START_Y && data.position.y > FADE_OUT_END_Y) {
        data.isFadingOut = true;
        data.opacity = 1.0 - (FADE_OUT_START_Y - data.position.y) / (FADE_OUT_START_Y - FADE_OUT_END_Y);
        data.opacity = Math.max(0, Math.min(1, data.opacity)); // 0-1の範囲にクランプ
      } else if (data.position.y <= FADE_OUT_END_Y) {
         data.opacity = 0;
         data.isFadingOut = true;
      } else {
        data.opacity = 1.0;
        data.isFadingOut = false;
      }

      // 画面外に出たらリセット
      if (data.position.y < RESET_Y) {
        data.position.set(rand(-8, 8), rand(10, 15), rand(-3, 3));
        data.rotation.set(rand(0, Math.PI * 2), rand(0, Math.PI * 2), rand(0, Math.PI * 2));
        const speedFactor = isMobile ? 0.7 : 1.0;
        data.velocity = rand(0.05, 0.12) * speedFactor;
        data.rotationSpeed.set(
          rand(0.005, 0.02),
          rand(0.005, 0.02),
          rand(0.005, 0.02)
        ).multiplyScalar(speedFactor);
        // data.textureIndex = Math.floor(rand(0, 5)); // 未使用
        data.opacity = 1.0;
        data.isFadingOut = false;
      }

      // ダミーオブジェクトに位置と回転を設定
      dummy.position.copy(data.position);
      dummy.rotation.copy(data.rotation);
      dummy.updateMatrix();

      // InstancedMeshにマトリックスを設定
      frontMeshRef.current.setMatrixAt(i, dummy.matrix);
      backMeshRef.current.setMatrixAt(i, dummy.matrix); // 裏面も同じ位置・回転

      // マテリアルの透明度更新フラグ (インスタンスごとに設定はできないため、全体で更新)
      if (data.opacity !== previousOpacity) {
        needsMaterialUpdate = true;
      }

      // InstancedBufferAttributeを使ってインスタンスごとに透明度を設定するのが本来は効率的
      // ここでは簡略化のため、useFrameの最後にマテリアル全体のopacityを更新する
      // (ただし、全インスタンスが同じ透明度になってしまう。フェードアウトには不向き)
      // → 妥協案: マテリアルのalphaTestを使うか、透明度をInstancedBufferAttributeで渡す
      // → alphaTestは段階的なフェードアウトが難しい
      // → InstancedBufferAttributeを試す

    });

    // InstancedBufferAttributeで透明度を渡す (推奨される方法)
    // useEffect内でAttributeを初期化し、useFrame内で更新する
    // ここでは実装を簡略化するため、マテリアル全体の透明度を無理やり更新する（非推奨）
    // ただし、これだと全インスタンスが同時にフェードアウトしてしまう。
    // やはりInstancedBufferAttributeを使うべき。

    // InstancedBufferAttribute 'aOpacity' を追加・更新する処理をuseEffectとuseFrameに追加する必要がある
    // ShaderMaterialを使ってそのAttributeを読む必要もある
    // → MeshBasicMaterialの拡張やShaderMaterialは複雑化するため、
    //   ここではフェードアウトを「Y座標が一定以下になったら非表示にする」ことで代替する

    // 代替フェードアウト: Y座標に基づいてインスタンスのスケールを0にする
    instancesData.forEach((data, i) => {
        dummy.position.copy(data.position);
        dummy.rotation.copy(data.rotation);

        if (data.position.y <= FADE_OUT_END_Y) {
            dummy.scale.set(0, 0, 0); // 見えなくする
        } else {
            dummy.scale.set(1, 1, 1);
        }
        dummy.updateMatrix();
        frontMeshRef.current.setMatrixAt(i, dummy.matrix);
        backMeshRef.current.setMatrixAt(i, dummy.matrix);
    });


    frontMeshRef.current.instanceMatrix.needsUpdate = true;
    backMeshRef.current.instanceMatrix.needsUpdate = true;

    // マテリアルの透明度更新は不要 (スケールで制御するため)
    // if (needsMaterialUpdate) {
    //   frontMaterial.needsUpdate = true;
    //   backMaterial.needsUpdate = true;
    // }
  });

  // InstancedBufferAttribute 'aOpacity' の設定 (useEffect内)
  // useEffect(() => {
  //   if (!frontMeshRef.current || !backMeshRef.current) return;
  //   const opacities = new Float32Array(count);
  //   for (let i = 0; i < count; i++) opacities[i] = 1.0;
  //
  //   const attribute = new THREE.InstancedBufferAttribute(opacities, 1);
  //   frontMeshRef.current.geometry.setAttribute('aOpacity', attribute);
  //   backMeshRef.current.geometry.setAttribute('aOpacity', attribute); // 同じものを参照
  //
  //   // マテリアル側でAttributeを読む設定 (onBeforeCompile or ShaderMaterial)
  //   const modifyMaterial = (material: THREE.Material) => {
  //     material.onBeforeCompile = (shader) => {
  //       shader.vertexShader = `
  //         attribute float aOpacity;
  //         varying float vOpacity;
  //         ${shader.vertexShader}
  //       `.replace(
  //         `#include <begin_vertex>`,
  //         `#include <begin_vertex>
  //          vOpacity = aOpacity;`
  //       );
  //       shader.fragmentShader = `
  //         varying float vOpacity;
  //         ${shader.fragmentShader}
  //       `.replace(
  //         `vec4 diffuseColor = vec4( diffuse, opacity );`,
  //         `vec4 diffuseColor = vec4( diffuse, opacity * vOpacity );`
  //       );
  //     };
  //     material.needsUpdate = true;
  //   };
  //   modifyMaterial(frontMaterial);
  //   modifyMaterial(backMaterial);
  //
  // }, [count, frontMaterial, backMaterial]);

  // useFrame内での aOpacity の更新
  // useFrame(() => {
  //   ...
  //   const opacityAttribute = frontMeshRef.current.geometry.getAttribute('aOpacity') as THREE.InstancedBufferAttribute;
  //   instancesData.forEach((data, i) => {
  //     ... (opacity計算) ...
  //     opacityAttribute.setX(i, data.opacity);
  //   });
  //   opacityAttribute.needsUpdate = true;
  //   ...
  // });
  // → 上記 onBeforeCompile アプローチは複雑なので、スケール変更による表示/非表示を採用

  return (
    <>
      {/* 表面用 InstancedMesh (テクスチャは front_01.webp のみ) */}
      <instancedMesh
        ref={frontMeshRef}
        args={[geometry, frontMaterial, count]}
        frustumCulled={false} // パフォーマンスのため、視錐台カリングを無効化も検討
      />
      {/* 裏面用 InstancedMesh */}
      <instancedMesh
        ref={backMeshRef}
        args={[geometry, backMaterial, count]}
        frustumCulled={false}
      />
    </>
  );
}
