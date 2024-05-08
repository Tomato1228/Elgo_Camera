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
        // width: 600,
        // height: 400,
        facingMode: 'environment' // 背面カメラを使用
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

// Hands の結果処理
function processHandsResults(results) {
    drawOnCanvas(results, HAND_CONNECTIONS, ctx, canvas);
}

// Holistic の結果処理
function processHolisticResults(results) {
    drawOnCanvas(results, HAND_CONNECTIONS, ctx, canvas, true);
}

// キャンバスに描画
function drawOnCanvas(results, handConnections, ctx, canvas, holistic = false) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    // Hands
    if (results.multiHandLandmarks) {
        results.multiHandLandmarks.forEach(handMarks => {
            drawConnectors(ctx, handMarks, handConnections, { color: '#00f' });
            drawLandmarks(ctx, handMarks, { color: '#f00',radius: 1 });
        });
    }

    // Holistic
    if (holistic) {
        if (results.multiFaceLandmarks) {
            results.multiFaceLandmarks.forEach(faceMarks => {
                drawLandmarks(ctx, faceMarks, { color: '#0f0', radius: 1 });
            });
        }

        if (results.poseLandmarks) {
            drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#0f0' });
            drawLandmarks(ctx, results.poseLandmarks, { color: '#f00',radius: 1 });
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
