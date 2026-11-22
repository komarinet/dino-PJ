# REX RESCUE — ティラノと約束の島

縦持ちスマートフォンを中心にした、全6面の3D恐竜アクション。横持ち・キーボードにも対応。

## 遊び
- 6面：巨木の密林／赤岩の大峡谷／霧の大湿原／嵐の放棄施設／火山の地下洞窟／嵐の海岸。旧版の約4〜5倍のルート長。3区画・2チェックポイントで構成。
- 各面オトモは1体。ラプトル、トリケラトプス、バリオニクス、アンキロサウルス、プテラノドン、若いティラノ。各面2か所の障害を専用能力で開く。
- ボスはディロフォサウルス、カルノタウルス、スピノサウルス、アロサウルス、ギガノトサウルス、インドミナス。毒液、水しぶき、突進、衝撃波、擬態など、異なる予告攻撃。
- 攻撃は1ボタンで距離・向き・相手に合わせて噛みつき／噛み押し／体当たり／尻尾／踏みつけ。独立した突進ボタンは廃止。
- 攻撃と化石で必殺技ゲージ蓄積。敵の近くで発動し、実際のモデルを使う3.4秒の接近カメラ演出（噛みつき／突き飛ばし）。対象なしではゲージを消費しない。
- 頭・胴体・尻尾の立体化石、各面3つ、計18。初回2pt、再探索1pt。広場でHP／攻撃／オトモの再使用時間を成長させる。
- 骨格3部位完成で広場に展示。化石サーチ／突進追撃／水辺回復／被弾防御／空中援護／連携必殺技を解放。展示には集めた部位だけを表示し、翼や角など種別も反映。
- カメラパッドで周回・仰角、＋−でズーム、リセット。探索中は手動角度を保持。遮蔽物を半透明化。親子のエンディングも自由視点、広場から再鑑賞可能。
- ブラウザに化石・強化・解放面・チェックポイントを保存。死亡で化石を失わない。旧v1セーブの解放面を新構成に移行し、旧化石総数は成長ptに引き継ぐ。旧セーブは削除しない。

## 素材・構成
Three.js r170 (MIT、同梱) / 独自の関節付きプロシージャルメッシュ。外部GLBの読み込みは用いず、メッシュ・UV・顎・歩行・翼・尾をプログラムで生成。テクスチャを加えているが、映画品質のスキャンモデルやモーションキャプチャではない。

画像生成の組み込みツールで3×3マテリアルアトラスを作成し、9材質に分割・ミラータイル化。色と凹凸は512px WebP、合計約1.4MB。皮膚／樹皮／森林土／赤砂岩／泥／錆びた鋼材／玄武岩／海岸岩／化石骨。`dist/assets/textures/` に同梱。効果音は独自合成のOgg Vorbis、`dist/assets/*.ogg`。

生成プロンプト：
> Production 3D game material texture atlas, exactly 3 columns by 3 rows equal cells, no gutters, no borders, no text. Flat orthographic macro material photographs, even neutral diffuse light, no perspective or baked shadows. Top: dark olive Tyrannosaurus pebbled scales and folds; brown ridged tree bark; mossy damp forest soil. Middle: stratified red sandstone; wet dark mud with pebbles; weathered rusty blue steel. Bottom: black volcanic basalt; gray wet coastal stone; ivory fossil bone. Edge-to-edge physically convincing surfaces, no objects, dinosaurs, scenery or labels.

同じ材質のメッシュを関節単位でまとめ、遠方の地形小物・敵を非表示にする。影1024px、描画解像度は最大1.5倍。

## 検証
`node checks/game-regression.mjs`

レンダラーとDOMをモックし、それ以外の実際のThree.jsシーンとゲーム更新処理を実行。6面のオトモ能力による12障害突破、18化石の取得・保存、成長購入、通常攻撃、6面の必殺技、ボス状態遷移・撃破・解放、チェックポイント、骨格展示、エンディングのカメラ移動、再探索リワードを検証。JavaScript構文と素材ファイルも確認。

検証環境のクラウドブラウザはWebGLコンテキストを生成できなかったため、3D描画の目視、縦持ち実機の操作感、GPU負荷、実プレイ時間は未検証。現状のルートは旧版より延長しているが、1面6〜10分の実測はしていない。
