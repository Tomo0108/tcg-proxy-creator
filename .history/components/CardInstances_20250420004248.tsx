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
    frontTextures.map(tex => new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, alphaTest: 0.1 }))
  , [frontTextures]);
  const backMaterial = useMemo(() =>
    new THREE.MeshBasicMaterial({ map: backTexture, side: THREE.BackSide, transparent: true, depthWrite: false, alphaTest: 0.1 })
  , [backTexture]);

  // ジオメトリ作成
  const geometry = useMemo(() => new THREE.PlaneGeometry(CARD_WIDTH, CARD_HEIGHT), []);

  // フレーム更新処理
  useFrame(() => {
    if (!backMeshRef.current || frontMeshRefs.current.some(ref => !ref)) return; // 全てのrefが揃うまで待つ

    // インスタンスデータをテクスチャごとにグループ化（毎フレーム行うのは非効率だが、リセット処理のため）
    const groupedInstances: CardInstanceData[][] = Array.from({ length: NUM_FRONT_TEXTURES }, () => []);
    instancesData.current.forEach(data => {
      // 位置・回転・リセット処理 (全インスタンス共通)
      data.position.y -= data.velocity;
      data.rotation.x += data.rotationSpeed.x;
      data.rotation.y += data.rotationSpeed.y;
      data.rotation.z += data.rotationSpeed.z;

      if (data.position.y < RESET_Y) {
        data.position.set(rand(-8, 8), rand(10, 15), rand(-3, 3));
        data.rotation.set(rand(0, Math.PI * 2), rand(0, Math.PI * 2), rand(0, Math.PI * 2));
        const speedFactor = isMobile ? 0.7 : 1.0;
        data.velocity = rand(0.05, 0.12) * speedFactor;
        data.rotationSpeed.set(rand(0.005, 0.02), rand(0.005, 0.02), rand(0.005, 0.02)).multiplyScalar(speedFactor);
        data.textureIndex = Math.floor(rand(0, NUM_FRONT_TEXTURES)); // リセット時にテクスチャも変更
        data.opacity = 1.0;
        data.isFadingOut = false;
      }

      // グループに追加
      groupedInstances[data.textureIndex].push(data);

      // 裏面メッシュのマトリックス更新 (全インスタンス)
      dummy.position.copy(data.position);
      dummy.rotation.copy(data.rotation);
      dummy.scale.set(data.position.y <= FADE_OUT_END_Y ? 0 : 1, data.position.y <= FADE_OUT_END_Y ? 0 : 1, data.position.y <= FADE_OUT_END_Y ? 0 : 1);
      dummy.updateMatrix();
      backMeshRef.current.setMatrixAt(data.id, dummy.matrix);
    });

    // 表面メッシュのマトリックス更新 (グループごと)
    groupedInstances.forEach((group, textureIndex) => {
      const mesh = frontMeshRefs.current[textureIndex];
      if (!mesh) return; //念のためチェック

      // このメッシュが担当するインスタンスのマトリックスのみ更新
      group.forEach(data => {
        dummy.position.copy(data.position);
        dummy.rotation.copy(data.rotation);
        dummy.scale.set(data.position.y <= FADE_OUT_END_Y ? 0 : 1, data.position.y <= FADE_OUT_END_Y ? 0 : 1, data.position.y <= FADE_OUT_END_Y ? 0 : 1);
        dummy.updateMatrix();
        // setMatrixAtの第一引数は、InstancedMesh内でのインスタンスインデックス (0 to count-1)
        // data.idがそのまま使える
        mesh.setMatrixAt(data.id, dummy.matrix);
      });

      // このグループに属さないインスタンスのマトリックスはどうなる？
      // -> setMatrixAtを呼ばれなかったインスタンスは前のフレームのマトリックスを保持する。
      // -> リセット時にテクスチャが変わると、古いメッシュでのマトリックスが残ってしまう。
      // 対策: 全てのメッシュに対して、担当しないインスタンスのマトリックスをスケール0に設定する？ -> 非効率
      // 対策2: リセット時に、古いテクスチャのメッシュでスケール0を設定し、新しいテクスチャのメッシュで通常スケールを設定する？ -> 複雑
      // 対策3: 毎フレーム、全メッシュの全インスタンスに対して、担当するかどうかでスケールを切り替えてsetMatrixAtを呼ぶ。
      //        これが一番確実かもしれない。

    });

    // 対策3の実装:
    instancesData.current.forEach(data => {
        dummy.position.copy(data.position);
        dummy.rotation.copy(data.rotation);
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
