// ボールとか用のキャンバス
const canvas = document.getElementById("breakoutCanvas");
let ctx = canvas.getContext("2d");

const baseImgPath = "img/base.png";
const brickImgPath = "img/cover.png";

const toolColor = "#e0476a";
const ballRadius = 10;
const paddleHeight = 10;
const paddleWidth = 74;
const brickWidth = 20;
const brickHeight = 20;
const brickPadding = 0;
const brickOffsetTop = 0;
const brickOffsetLeft = 0;

let x;
let y;
let dx = 2;
let dy = -2;
let paddleX;

let rightPressed = false;
let leftPressed = false;

let score = 0;
let lives = 10;

// 仮想的にブロックを作る
let bricks = [];


// ページロード
window.onload =function(){

    // ロード中CSSを非表示にする
    document.getElementById("loading").style.display='none';
    // ロード中に先に出てたら変なので隠してたものを表示する
    document.getElementById("topShade").style.width = baseCanvas.width +'px';
    document.getElementById("header").style.display='';

    x = canvas.width/2;
    y = canvas.height-30;
    paddleX = (canvas.width-paddleWidth)/2;

    // オーバレイを開閉する関数
    const overlay = document.getElementById('overlay');
    function overlayToggle() {
        overlay.classList.toggle('overlay-on');
    }

    overlayToggle();

    const clickArea = document.getElementsByClassName('overlay-event');
    for(let i = 0; i < clickArea.length; i++) {
        clickArea[i].addEventListener('click', stopEvent, false);
    }

    function stopEvent() {
        overlay.classList.toggle('overlay-off');

        // ゲームを始める！
        draw();
    }

    // スマホ用にスワイプも対応
    catchSwipe();
    
}

function initCanvas(imagePath, c){
    const image = new Image();

    image.addEventListener("load",function (){
      let afterWidth = canvas.width;
      let afterHeight = Math.floor(canvas.width * 1.6);

        c.drawImage(image, brickOffsetLeft, brickOffsetLeft, 750, 1200
          , brickOffsetLeft, brickOffsetLeft,afterWidth,afterHeight);

        // 一回読画像を読み込んでからじゃないと当たり判定用マスクは作れないからここで…
        if(imagePath == brickImgPath)
        {
            const bricksMask = convertPngToMask(brickCtx);
            
            for(let c=0; c<brickColumnCount; c++) {
                bricks[c] = [];
                for(let r=0; r<brickRowCount; r++) {
                    // マスクの数が足りない可能性も一応考えておく
                    let s = bricksMask.length <= c || bricksMask[0].length <= r ? 0: bricksMask[c][r];

                    bricks[c][r] = { x: 0, y: 0, status: s };
                }
            }
        }

    });
    image.src = imagePath;
}

function convertPngToMask(bctx){

    let imgData = bctx.getImageData(brickOffsetLeft, brickOffsetTop, brickCanvas.width, brickCanvas.height);

    console.log("B"+brickCanvas.width);
    console.log("I"+imgData.width);

    let columns = []
    for(let by = 0; by < brickColumnCount; by++)
    {
        let lows = []
        for(let bx = 0; bx < brickRowCount; bx++)
        {

            let alpha_block = []
            for(let py = 0; py < brickHeight; py++)
            {
                for(let px = 0; px < brickWidth; px++)
                {
                    // ブロックサイズごとにブロック内のピクセルが全部透過か調べる
                    let i = (by * imgData.width * brickHeight) + (bx * brickWidth) + (py*imgData.width) + px;
                    // 左上からRGBARGPA...の1次元配列
                    if( imgData.data[(i*4) + 3] == 0 ){
                        alpha_block.push(0);
                    }else{
                        alpha_block.push(1);
                    }
                }
            }

            if(alpha_block.every(n => !n)){
                lows.push(0);
            }else{
                lows.push(1);
            }
        }

        columns.push(lows);

    }

    return columns;

}

// モニタサイズにあわせてキャンバスサイズを調整する
let w = window.innerWidth;
let h = Math.floor(window.innerWidth * 1.6);
if(window.innerHeight < h)
{
  w = Math.floor(window.innerHeight / 1.6);
  h = window.innerHeight;
}

canvas.width = w;
canvas.height = h;

// 背景用画像を書く
const baseCanvas = document.getElementById("baseCanvas");
let baseCtx = baseCanvas.getContext("2d");
baseCanvas.width = w;
baseCanvas.height = h;
initCanvas(baseImgPath, baseCtx);

console.log("CANVAS");

// ブロック用画像を書く
const brickCanvas = document.getElementById("bricksCanvas");
let brickCtx = brickCanvas.getContext("2d");
brickCanvas.width = w;
brickCanvas.height = h;

const brickRowCount = Math.ceil(brickCanvas.width/brickWidth);
const brickColumnCount = Math.ceil(brickCanvas.height/brickHeight);
console.log('行：'+ brickRowCount);
console.log('列' + brickColumnCount);

initCanvas(brickImgPath, brickCtx);

// キー関連
document.addEventListener("keydown", keyDownHandler, false);
document.addEventListener("keyup", keyUpHandler, false);
document.addEventListener("mousemove", mouseMoveHandler, false);

function keyDownHandler(e) {
    if(e.code  == "ArrowRight") {
        rightPressed = true;
    }
    else if(e.code == 'ArrowLeft') {
        leftPressed = true;
    }
}
function keyUpHandler(e) {
    if(e.code == 'ArrowRight') {
        rightPressed = false;
    }
    else if(e.code == 'ArrowLeft') {
        leftPressed = false;
    }
}
function mouseMoveHandler(e) {
    let relativeX = e.clientX - canvas.offsetLeft;
    if(relativeX > 0 && relativeX < canvas.width) {
        paddleX = relativeX - paddleWidth/2;
    }
}

function catchSwipe() {
	let moveX;	// スワイプ中のx座標

	// スワイプ中： xy座標を取得
	document.addEventListener("touchmove", function(e) {
		e.preventDefault();
		moveX = e.changedTouches[0].pageX;
        paddleX = moveX-(paddleWidth/2);
	},{passive: false});
}

// ゲーム内容
function collisionDetection() {
    for(let c=0; c<brickColumnCount; c++) {
        for(let r=0; r<brickRowCount; r++) {
            let b = bricks[c][r];
            if(b.status == 1) {
                if(x > b.x && x < b.x+brickWidth && y > b.y && y < b.y+brickHeight) {
                    dy = -dy;
                    b.status = 0;
                    score++;
                    if(score == brickRowCount*brickColumnCount) {
                        alert("YOU WIN, CONGRATS!");
                        document.location.reload();
                    }
                }
            }
        }
    }
}

function drawBall() {
    ctx.beginPath();
    ctx.arc(x, y, ballRadius, 0, Math.PI*2);
    ctx.fillStyle = toolColor;
    ctx.fill();
    ctx.closePath();
}
function drawPaddle() {
    ctx.beginPath();
    ctx.rect(paddleX, canvas.height-paddleHeight, paddleWidth, paddleHeight);
    ctx.fillStyle = toolColor;
    ctx.fill();
    ctx.closePath();
}
function drawBricks() {

    for(let c=0; c<brickColumnCount; c++) {
        for(let r=0; r<brickRowCount; r++) {

            let brickX = (r*(brickWidth+brickPadding))+brickOffsetLeft;
            let brickY = (c*(brickHeight+brickPadding))+brickOffsetTop;
            bricks[c][r].x = brickX;
            bricks[c][r].y = brickY;

            if(bricks[c][r].status == 0 ) {
                // 当たったら画像を透過する

                let imgData2 = brickCtx.getImageData(brickX, brickY, brickWidth, brickHeight);

                for(let i = 0, len = brickWidth * brickHeight; i < len; i++){
                    //ピクセル
                    const p = i * 4;
                    //alpha値を0に
                    imgData2.data[p + 3] = 0;
                }

                brickCtx.putImageData(imgData2, brickX, brickY);

            }
        }
    }
}


function updateLives() {
    document.getElementById("lifeCount").innerText = lives.toString();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBricks();
    drawBall();
    drawPaddle();

    updateLives();
    collisionDetection();

    if(x + dx > canvas.width-ballRadius || x + dx < ballRadius) {
        dx = -dx;
    }
    if(y + dy < ballRadius) {
        dy = -dy;
    }
    else if(y + dy > canvas.height-ballRadius) {
        if(x > paddleX && x < paddleX + paddleWidth) {
            dy = -dy;
        }
        else {
            lives--;
            if(!lives) {
                alert("GAME OVER");
                document.location.reload();
            }
            else {
                x = canvas.width/2;
                y = canvas.height-30;
                dx = 2;
                dy = -2;
                paddleX = (canvas.width-paddleWidth)/2;
            }
        }
    }

    if(rightPressed && paddleX < canvas.width-paddleWidth) {
        paddleX += 7;
    }
    else if(leftPressed && paddleX > 0) {
        paddleX -= 7;
    }

    x += dx;
    y += dy;
    requestAnimationFrame(draw);
}
