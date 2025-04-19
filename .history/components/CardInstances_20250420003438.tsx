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
        data.rotation.set(rand(0, Math.PI * 2), rand(0, Math.PI * 2), rand(0, Math.PI * 2));
        const speedFactor = isMobile ? 0.7 : 1.0;
        data.velocity = rand(0.05, 0.12) * speedFactor;
        data.rotationSpeed.set(
          rand(0.005, 0.02),
          rand(0.005, 0.02),
          rand(0.005, 0.02)
        ).multiplyScalar(speedFactor);
        data.textureIndex = Math.floor(rand(0, frontTextures.length));
        data.opacity = 1.0;
        data.isFadingOut = false;
      }

      // ダミーオブジェクトに位置と回転を設定
      dummy.position.copy(data.position);
      dummy.rotation.copy(data.rotation);
      dummy.updateMatrix();

      // InstancedMeshにマトリックスを設定
      meshRef.current.setMatrixAt(i, dummy.matrix);

      // マテリアルの透明度を設定 (表面と裏面両方)
      // 表面マテリアル
      const frontMaterialIndex = data.textureIndex;
      if (materials[frontMaterialIndex]) {
        materials[frontMaterialIndex].opacity = data.opacity;
      }
      // 裏面マテリアル (配列の最後)
      const backMaterialIndex = materials.length - 1;
      if (materials[backMaterialIndex]) {
        materials[backMaterialIndex].opacity = data.opacity;
      }

      // ジオメトリグループ（マテリアルインデックス）を設定
      // 表面: 0, 裏面: 1 (PlaneGeometryはデフォルトで1つのグループを持つ)
      // InstancedBufferGeometryにグループを追加する必要があるかもしれない
      // ここでは、InstancedMeshのマテリアル配列インデックスを直接指定するアプローチを試みる
      // PlaneGeometryはデフォルトでmaterialIndex 0 を使うため、
      // 表面と裏面を別々に描画するには工夫が必要。
      // ここでは簡略化のため、両面同じテクスチャ（表面）を使うか、
      // またはInstancedMeshを2つ使う（表面用と裏面用）のが現実的。
      // 指示では「ダブルサイド禁止、代わりに2枚の面をback-to-backで配置」とあるが、
      // InstancedMeshでこれを効率的に行うのは複雑。
      // ここでは一旦、表面のみを描画する実装とする。裏面描画は別途検討。
      // → 指示を再解釈: InstancedMeshのマテリアル配列を使う。
      // PlaneGeometryはデフォルトで1グループ(materialIndex=0)だが、
      // InstancedMesh側でインスタンスごとにマテリアルインデックスを指定できるはず。
      // しかし、setMatrixAtのようにsetMaterialIndexAtのようなメソッドはない。
      // 代替案: geometry.addGroup を使って表面と裏面でグループを分ける。
      // PlaneGeometryは1グループなので、カスタムジオメトリか、
      // 2つのInstancedMeshを使うのが最も素直。
      // ここでは、InstancedMeshのマテリアル配列を使い、
      // geometry group index をインスタンスごとに設定する方法を探る。
      // → InstancedMeshのドキュメントによると、materialは配列を受け付けるが、
      //   インスタンスごとにmaterialIndexを指定する標準的な方法はない。
      //   ShaderMaterialで自前実装するか、InstancedMeshを2つ使うのが一般的。
      //
      // **妥協案:** ここでは表面のみ表示する。裏面表示は省略。
      //             または、MeshBasicMaterialの配列を渡し、
      //             geometry.groups を利用する（ただしPlaneGeometryは1グループ）。
      //             最も簡単なのは、InstancedMeshを2つ（表面用、裏面用）使うこと。
      //
      // **採用案:** InstancedMeshを2つ使う。1つは表面、もう1つは裏面用。
      //           ただし、コードが複雑になるため、まずは表面のみで実装を進める。
      //           裏面は後で追加する。→ いや、指示通り back-to-back を目指す。
      //
      // **再考:** PlaneGeometryを2つマージして1つのBufferGeometryを作る。
      // group 0: 表面, group 1: 裏面
      // これならInstancedMeshは1つで済む。

      // meshRef.current.geometry.groups.find(group => group.materialIndex === data.textureIndex); // これはできない

    });

    // マトリックスとマテリアルの更新を通知
    meshRef.current.instanceMatrix.needsUpdate = true;
    materials.forEach(mat => mat.needsUpdate = true); // 透明度変更を反映

  }, []);

  // ジオメトリグループの設定 (表面と裏面)
  useEffect(() => {
    if (!meshRef.current) return;
    const geo = meshRef.current.geometry;
    // PlaneGeometryはデフォルトで1グループ (0-5の頂点インデックス、materialIndex 0)
    // 表面用グループ (materialIndexはテクスチャインデックスに合わせる)
    // 裏面用グループ (materialIndexは配列の最後に固定)
    // PlaneGeometryは1グループしかないので、このアプローチは不可。

    // **結論:** InstancedMeshを2つ使うのが最も現実的。
    // このコンポーネントでは表面のみを扱うことにする。
    // 裏面用は別途 <CardBackInstances> のようなコンポーネントを作るか、
    // このコンポーネント内で両方扱う。後者を選択。

  }, []);


  // InstancedMeshを2つ用意 (表面用と裏面用)
  const frontMeshRef = useRef<THREE.InstancedMesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>>(null!);
  const backMeshRef = useRef<THREE.InstancedMesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>>(null!);

  const frontMaterials = useMemo(() =>
    frontTextures.map(tex => new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }))
  , [frontTextures]);

  const backMaterial = useMemo(() =>
    new THREE.MeshBasicMaterial({ map: backTexture, side: THREE.BackSide, transparent: true, depthWrite: false })
  , [backTexture]);

  // フレーム更新処理を修正して両方のMeshを更新
  useFrame(() => {
    if (!frontMeshRef.current || !backMeshRef.current) return;

    instancesData.forEach((data, i) => {
      // ... (位置、回転、フェードアウトの計算は共通) ...
      data.position.y -= data.velocity;
      data.rotation.x += data.rotationSpeed.x;
      data.rotation.y += data.rotationSpeed.y;
      data.rotation.z += data.rotationSpeed.z;

      if (data.position.y <= FADE_OUT_START_Y && data.position.y > FADE_OUT_END_Y) {
        data.isFadingOut = true;
        data.opacity = 1.0 - (FADE_OUT_START_Y - data.position.y) / (FADE_OUT_START_Y - FADE_OUT_END_Y);
