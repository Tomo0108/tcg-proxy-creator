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
    // ただし、古いインスタンスデータが残らないように初期化は重要。
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

  // スケール0の固定マトリックスを事前に計算
  const zeroScaleMatrix = useMemo(() => {
    const obj = new THREE.Object3D();
    obj.scale.set(0, 0, 0);
    obj.updateMatrix();
    return obj.matrix.clone(); // 不変性を保つためにクローン
  }, []);

  // フレーム更新処理
  useFrame(() => {
    // 全てのメッシュ参照が利用可能になるまで待機
    if (!backMeshRef.current || frontMeshRefs.current.some(ref => !ref)) return;
    // インスタンスデータがまだ生成されていない場合も待機
    if (instancesData.current.length !== count) return;

    instancesData.current.forEach(data => {
      // 1. インスタンスの位置・回転・リセット処理
      data.position.y -= data.velocity;
      data.rotation.x += data.rotationSpeed.x;
      data.rotation.y += data.rotationSpeed.y;
      data.rotation.z += data.rotationSpeed.z;

      let needsReset = data.position.y < RESET_Y;
      if (needsReset) {
        data.position.set(rand(-8, 8), rand(10, 15), rand(-3, 3));
        data.rotation.set(rand(0, Math.PI * 2), rand(0, Math.PI * 2), rand(0, Math.PI * 2));
        const speedFactor = isMobile ? 0.7 : 1.0;
        data.velocity = rand(0.05, 0.12) * speedFactor;
        data.rotationSpeed.set(rand(0.005, 0.02), rand(0.005, 0.02), rand(0.005, 0.02)).multiplyScalar(speedFactor);
        data.textureIndex = Math.floor(rand(0, NUM_FRONT_TEXTURES)); // リセット時にテクスチャも変更
        data.opacity = 1.0;
        data.isFadingOut = false;
      }

      // 2. このインスタンス用のマトリックスを計算 (dummyを使用)
      dummy.position.copy(data.position);
      dummy.rotation.copy(data.rotation);
      // フェードアウト（スケール変更）: リセット直後はスケール1、そうでなければY座標で判断
      const scale = needsReset ? 1 : (data.position.y <= FADE_OUT_END_Y ? 0 : 1);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      // dummy.matrix はこのインスタンスの正しいマトリックス (スケール含む)

      // 3. 全ての表面メッシュに対して処理
      frontMeshRefs.current.forEach((mesh, meshTextureIndex) => {
        if (mesh) {
          if (meshTextureIndex === data.textureIndex) {
            // 担当メッシュなら、計算したマトリックスを設定
            mesh.setMatrixAt(data.id, dummy.matrix);
          } else {
            // 担当しないメッシュなら、スケール0のマトリックスを設定
            // (リセット時にテクスチャが変わった場合、古いメッシュから消すため)
            mesh.setMatrixAt(data.id, zeroScaleMatrix);
          }
        }
      });

      // 4. 裏面メッシュにも計算したマトリックスを設定
      backMeshRef.current.setMatrixAt(data.id, dummy.matrix);
    });

    // 5. 全てのInstancedMeshのマトリックス更新を通知
    frontMeshRefs.current.forEach(meshRef => {
      if (meshRef) meshRef.instanceMatrix.needsUpdate = true;
    });
    if (backMeshRef.current) backMeshRef.current.instanceMatrix.needsUpdate = true;

  });

  return (
    <>
      {/* 表面用 InstancedMesh (テクスチャごとに1つずつ) */}
      {frontMaterials.map((material, index) => (
        <instancedMesh
          key={`front-${index}`}
          // refの更新は初回レンダリング時に行われる
          ref={el => { frontMeshRefs.current[index] = el; }}
          args={[geometry, material, count]} // countは常に最新のprops.count
          frustumCulled={false}
        />
      ))}
      {/* 裏面用 InstancedMesh */}
      <instancedMesh
        ref={backMeshRef}
        args={[geometry, backMaterial, count]} // countは常に最新のprops.count
        frustumCulled={false}
      />
    </>
  );
}
