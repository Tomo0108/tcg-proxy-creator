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
  velocity: number; // 落下速度
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
const CARD_DEPTH = 0.02; // カードの厚みを追加
const FADE_OUT_END_Y = -6;
const RESET_Y = -7;
const NUM_FRONT_TEXTURES = 14;

// 落下速度の範囲を調整 (より遅く)
const VELOCITY_MIN = 0.03;
const VELOCITY_MAX = 0.08;
const ROTATION_SPEED_MIN = 0.003; // 回転も少し遅く
const ROTATION_SPEED_MAX = 0.015;

export function CardInstances({ count, isMobile }: CardInstancesProps) {
  // 表面テクスチャごとにInstancedMeshの参照を管理 (裏面用は不要に)
  const frontMeshRefs = useRef<(THREE.InstancedMesh | null)[]>(new Array(NUM_FRONT_TEXTURES).fill(null));
  // const backMeshRef = useRef<THREE.InstancedMesh>(null!); // 削除
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
    instancesData.current = [];
    const speedFactor = isMobile ? 0.7 : 1.0;
    for (let i = 0; i < count; i++) {
      instancesData.current.push({
        id: i,
        position: new THREE.Vector3(rand(-8, 8), rand(10, 15), rand(-3, 3)),
        rotation: new THREE.Euler(rand(0, Math.PI * 2), rand(0, Math.PI * 2), rand(0, Math.PI * 2)),
        // 落下速度と回転速度の範囲を適用
        velocity: rand(VELOCITY_MIN, VELOCITY_MAX) * speedFactor,
        rotationSpeed: new THREE.Vector3(
            rand(ROTATION_SPEED_MIN, ROTATION_SPEED_MAX),
            rand(ROTATION_SPEED_MIN, ROTATION_SPEED_MAX),
            rand(ROTATION_SPEED_MIN, ROTATION_SPEED_MAX)
        ).multiplyScalar(speedFactor),
        textureIndex: Math.floor(rand(0, NUM_FRONT_TEXTURES)),
        opacity: 1.0,
        isFadingOut: false,
      });
    }
  }, [count, isMobile]);

  // マテリアル作成
  // 側面用のシンプルなマテリアル
  const sideMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, alphaTest: 0.1 }), []);
  // 表面マテリアル (配列)
  const frontMaterials = useMemo(() =>
    frontTextures.map(tex => new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, alphaTest: 0.1 }))
  , [frontTextures]);
  // 裏面マテリアル
  const backMaterial = useMemo(() =>
    // BoxGeometryの場合、裏面は自動的に反転されるため BackSide は不要かもしれないが、念のため付けておく
    new THREE.MeshBasicMaterial({ map: backTexture, side: THREE.FrontSide, transparent: true, depthWrite: false, alphaTest: 0.1 })
  , [backTexture]);

  // BoxGeometry用のマテリアル配列を作成する関数
  const createBoxMaterials = (frontMat: THREE.MeshBasicMaterial) => {
    // BoxGeometryのマテリアル順序: [px, nx, py, ny, pz, nz] (右、左、上、下、前、後)
    // カードの向きに合わせて調整: 前面(pz)に表面、後面(nz)に裏面
    return [
      sideMaterial, // 右 (px)
      sideMaterial, // 左 (nx)
      sideMaterial, // 上 (py)
      sideMaterial, // 下 (ny)
      frontMat,     // 前 (pz) - 表面
      backMaterial, // 後 (nz) - 裏面
    ];
  };

  // 各表面テクスチャに対応するBoxGeometry用マテリアル配列
  const boxMaterialsArray = useMemo(() =>
    frontMaterials.map(frontMat => createBoxMaterials(frontMat))
  , [frontMaterials, backMaterial, sideMaterial]); // 依存関係を追加

  // ジオメトリ作成 (BoxGeometryに変更)
  const geometry = useMemo(() => new THREE.BoxGeometry(CARD_WIDTH, CARD_HEIGHT, CARD_DEPTH), []);

  // スケール0の固定マトリックス
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
