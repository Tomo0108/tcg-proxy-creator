あなたは熟練のフロントエンドエンジニアです。  

three.js（React Three Fiber でも可）を用い、**「多数のカードが上部からランダムに降下しながら回転し、一定距離でフェードアウトして消える」** アニメーションを実装してください。
### 技術スタック

- React 18 ＋ Next.js 14（app router）

- three.js 最新安定版（または @react-three/fiber ＆ @react-three/drei）

- TypeScript 必須

- Vite ではなく Next.js のビルド機構を使用

- パフォーマンス最適化のため InstancedMesh または Instances を使う
### アセット

- カード表面テクスチャ：`/public/card/front_01.png`〜`front_05.png`（5 種）

- カード裏面テクスチャ：`/public/card/back.png`（1 種）

- テクスチャのサイズは 512 × 512 px、webp（透過なし）
### 要件

1. **Card コンポーネント**  

   - `PlaneGeometry(1, 1.4)` 程度の縦長比率。  

   - マテリアルは `MeshBasicMaterial`　(ライト不要)。  

   - 表面と裏面に別々の `map` を割り当てる（ダブルサイド禁止、代わりに 2 枚の面を back‑to‑back で配置）。  

2. **カード生成**  

   - 同時に 150 枚（スマホは 80 枚）をシーンに配置。  

   - `InstancedMesh` を使い、各インスタンスごとに  

     - 初期位置：`x ∈ [-8, 8]`, `y = 10 〜 15`, `z ∈ [-3, 3]` ランダム  

     - 初期回転：`x, y, z` すべてランダム  

     - 表面テクスチャ：上記 5 種のうちランダムに選択  

   - Y 位置が `-6` に到達したら  

     - 透明度アニメーション（1 秒で 0 → 消滅）  

     - その後インスタンスを再利用して再度上部へリセット（無限ループ）  

  

3. **アニメーションループ**  

   - `useFrame` or `requestAnimationFrame` で毎フレーム更新  

   - 落下速度：`0.05 〜 0.12 units/frame` ランダム  

   - 回転速度：各軸 `0.005 〜 0.02 rad/frame` ランダム  

   - GSAP などの依存は不要（自前で線形補間）  

  

4. **背景とフェードアウト**  

   - Canvas 背景を透過にし、Next.js 側で `position: fixed; pointer-events: none;` としてページ上部全面に配置。  

   - カードが画面中央 y < 0 の位置から徐々に透明度を下げることで自然にフェードアウト。  

  

5. **レスポンシブ＆最適化**  

   - `resize` イベントでカメラのアスペクトを更新。  

   - スマホ判定時（`window.innerWidth < 768`）は枚数と落下速度を 70 % に抑える。  

   - `dpr` を `Math.min(window.devicePixelRatio, 1.5)` に制限し、GPU 負荷を軽減。  

  

6. **ファイル構成（例）**

/app

└─ /components

├─ FallingCardsCanvas.tsx   ← ← 全体の Canvas ラッパ

└─ CardInstances.tsx        ← ← InstancedMesh ロジック

/public/card/front_01.webp … front_05.webp

/public/card/back.webp
7. **型安全**  

- `THREE.InstancedMesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>` に型引数を明示。  

- 乱数ユーティリティ関数 `rand(min, max): number` を作り、Math.random の使用を一点に集約。  

  

8. **ビルド & 動作確認**  

- `pnpm install three @react-three/fiber @react-three/drei`  

- `pnpm dev` で `http://localhost:3000` を確認。背面が見えるようにカメラを少し下向き（`radToDeg(-25°)`）に設定。  
---  

以上を満たす実装をお願いします。コードは必要箇所だけで良いので全文を提示してください。コメントは日本語でお願いします。
