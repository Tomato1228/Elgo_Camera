// DOM要素の取得
const video = document.getElementById('input');
const canvas = document.getElementById('output');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('start');
const stopButton = document.getElementById('stop');
const handsModeCheckbox = document.getElementById('handsMode');
const holisticModeCheckbox = document.getElementById('holisticMode');

// Mediapipeインスタンスの作成
const hands = createHandsInstance();
const holistic = createHolisticInstance();

// Camera クラスと `camera` のグローバル変数の宣言と初期化
let camera;

function initializeCamera() {
    // 初期化前に既存のストリームを停止
    if (camera && camera.stop) {
        camera.stop();
    }

    // カメラの初期化
    camera = new Camera(video, {
        onFrame: processFrame,
        facingMode: 'environment' // フロントカメラを使用
    });
}

// Mediapipe Hands インスタンスの作成
function createHandsInstance() {
    const instance = new Hands({
        locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });
    instance.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });
    instance.onResults(processHandsResults);
    return instance;
}

// Mediapipe Holistic インスタンスの作成
function createHolisticInstance() {
    const instance = new Holistic({
        locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`
    });
    instance.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: true,
        smoothSegmentation: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });
    instance.onResults(processHolisticResults);
    return instance;
}

// フレームの処理
async function processFrame() {
    if (handsModeCheckbox.checked) {
        await hands.send({ image: video });
    } else if (holisticModeCheckbox.checked) {
        await holistic.send({ image: video });
    }
}

// Handsの結果処理
function processHandsResults(results) {
    drawOnCanvas(results, HAND_CONNECTIONS, ctx, canvas);
}

// Holisticの結果処理
function processHolisticResults(results) {
    // キャンバスに描画
    drawOnCanvas(results, HAND_CONNECTIONS, ctx, canvas, true);

    // 姿勢のランドマークが存在するか確認
    if (results.poseLandmarks) {
        // ランドマークを取得
        const landmarks = results.poseLandmarks;

        // ランドマークがすべて存在するか確認
        if (
            landmarks[11] && //左肩
            landmarks[13] && //左肘
            landmarks[15] && //左手首
            landmarks[12] && //右肩
            landmarks[14] && //右肘
            landmarks[16] && //右手首
            landmarks[23] && //左腰
            landmarks[24] && //右腰
            landmarks[25] && //左膝
            landmarks[26] && //右膝
            landmarks[27] && //左足首
            landmarks[28]    //右足首
        ) {
            // 各関節の角度を計算

            //左肘の角度
            const leftElbowAngle = calculateAngleBetweenPoints(
                landmarks[11], landmarks[13], landmarks[15]
            );
            //右肘の角度
            const rightElbowAngle = calculateAngleBetweenPoints(
                landmarks[12], landmarks[14], landmarks[16]
            );
            //左肩の角度
            const leftShoulderAngle = 180 - calculateAngleBetweenPoints(
                landmarks[23], landmarks[11], landmarks[13]
            );
            //右肩の角度
            const rightShoulderAngle = 180 - calculateAngleBetweenPoints(
                landmarks[24], landmarks[12], landmarks[14]
            );
            //左膝の角度
            const leftKneeAngle = calculateAngleBetweenPoints(
                landmarks[23], landmarks[25], landmarks[27]
            );
            //右膝の角度
            const rightKneeAngle = calculateAngleBetweenPoints(
                landmarks[24], landmarks[26], landmarks[28]
            );
            //左腰の角度
            const leftWaistAngle = calculateAngleBetweenPoints(
                landmarks[11], landmarks[23], landmarks[25]
            );
            //右腰の角度
            const rightWaistAngle = calculateAngleBetweenPoints(
                landmarks[12], landmarks[24], landmarks[26]
            );

            // 各角度をキャンバス上に描画
            drawAngleOnCanvas(leftElbowAngle, landmarks[13].x, landmarks[13].y);
            drawAngleOnCanvas(rightElbowAngle, landmarks[14].x, landmarks[14].y);
            drawAngleOnCanvas(leftShoulderAngle, landmarks[11].x, landmarks[11].y);
            drawAngleOnCanvas(rightShoulderAngle, landmarks[12].x, landmarks[12].y);
            drawAngleOnCanvas(leftKneeAngle, landmarks[25].x, landmarks[25].y);
            drawAngleOnCanvas(rightKneeAngle, landmarks[26].x, landmarks[26].y);
            drawAngleOnCanvas(leftWaistAngle, landmarks[23].x, landmarks[23].y);
            drawAngleOnCanvas(rightWaistAngle, landmarks[24].x, landmarks[24].y);
        }
    }
}

// 角度をキャンバス上に描画する関数
function drawAngleOnCanvas(angle, x, y) {
    // 角度がNaNであるかチェック
    // if (isNaN(angle)) {
    //     return; // NaNの場合は何も表示しない
    // }

    // 角度を整数に丸める
    const roundedAngle = Math.round(angle);

    // 角度が90を超える場合は赤色、それ以外の場合は緑色で描画
    if (roundedAngle > 90) {
        ctx.fillStyle = '#FF0000'; // 赤色
    } else {
        ctx.fillStyle = '#00FF00'; // 緑色
    }

    // キャンバスに角度を描画
    ctx.font = '10px Arial'; // フォントとサイズを指定
    ctx.fillText(`${roundedAngle}°`, x * canvas.width, y * canvas.height);
}

// 三点で角度を計算する関数
function calculateAngleBetweenPoints(pointA, pointB, pointC) {
    // ベクトルABを計算
    const vectorAB = {
        x: pointB.x - pointA.x,
        y: pointB.y - pointA.y,
        z: pointB.z - pointA.z
    };
    
    // ベクトルBCを計算
    const vectorBC = {
        x: pointC.x - pointB.x,
        y: pointC.y - pointB.y,
        z: pointC.z - pointB.z
    };
    
    // 内積を計算
    const dotProduct = vectorAB.x * vectorBC.x + vectorAB.y * vectorBC.y + vectorAB.z * vectorBC.z;
    
    // ベクトルの大きさを計算
    const magnitudeAB = Math.sqrt(vectorAB.x ** 2 + vectorAB.y ** 2 + vectorAB.z ** 2);
    const magnitudeBC = Math.sqrt(vectorBC.x ** 2 + vectorBC.y ** 2 + vectorBC.z ** 2);
    
    // 角度のコサインを計算
    const cosineAngle = dotProduct / (magnitudeAB * magnitudeBC);
    
    // ラジアン単位での角度を三角関数のアークコサインで計算
    const angleRadians = Math.acos(cosineAngle);
    
    // ラジアン単位の角度を度数法に変換
    const angleDegrees = angleRadians * (180 / Math.PI);
    
    return angleDegrees;
}

// キャンバスに描画する関数
function drawOnCanvas(results, handConnections, ctx, canvas, holistic = false) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    // Handsランドマークの描画
    if (results.multiHandLandmarks) {
        results.multiHandLandmarks.forEach(handMarks => {
            drawConnectors(ctx, handMarks, handConnections, { color: '#00f' });
            drawLandmarks(ctx, handMarks, { color: '#00FF00', radius: 1 });
        });
    }

    // Holisticランドマークの描画
    if (holistic) {
        if (results.multiFaceLandmarks) {
            results.multiFaceLandmarks.forEach(faceMarks => {
                drawLandmarks(ctx, faceMarks, { color: '#0f0', radius: 0.5 });
            });
        }

        if (results.poseLandmarks) {
            drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#0f0' });
            drawLandmarks(ctx, results.poseLandmarks, { color: '#00FF00', radius: 0.5 });
        }
    }
}

// イベントリスナーの設定
function setEventListeners() {
    startButton.addEventListener('click', () => {
        initializeCamera();
        camera.start();
    });

    stopButton.addEventListener('click', () => {
        if (camera && camera.stop) {
            camera.stop();
        }
    });

    handsModeCheckbox.addEventListener('change', () => {
        if (handsModeCheckbox.checked) {
            holisticModeCheckbox.checked = false;
        }
    });

    holisticModeCheckbox.addEventListener('change', () => {
        if (holisticModeCheckbox.checked) {
            handsModeCheckbox.checked = false;
        }
    });
}

// 初期設定
setEventListeners();
initializeCamera();
