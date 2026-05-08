const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// ===== 定数 =====
const WIDTH = 480, HEIGHT = 640;

// ===== 入力 =====
let keys = {};
document.addEventListener("keydown", e => {
  keys[e.key] = true;

  // ESCでIndexへ戻る
  if (e.key === "Escape") {
    window.location.href = "index.html";
  }
});

document.addEventListener("keyup", e => {
  keys[e.key] = false;
});

// ===== 状態 =====
let idx = 1; // 1=game,2=over,3=clear
let phase = 1;

let player = { x: WIDTH/2-15, y: HEIGHT-80, w:40, h:40, hp:7 };
let playerSpeed = 5;
let shootSpeed = 350;
let lastShot = 0;
let canDiag = 1;

let bullets = [];
let enemyBullets = [];

let bossShootTimer = 0;
let bossBigTimer = 0;

function spawnBoss(hp){
  return { x: WIDTH/2-50, y:-100, w:100, h:100, targetY:60, vx:2, hp:hp, maxHp:hp };
}
let boss = spawnBoss(30);

// ===== 当たり判定（Rect同士）=====
function hitRect(a,b){
  return a.x < b.x+b.w &&
         a.x+a.w > b.x &&
         a.y < b.y+b.h &&
         a.y+a.h > b.y;
}

// ===== プレイヤー弾発射（Pygameそのまま）=====
function shoot(cx,cy){
  if(canDiag===1){
    bullets.push({x:cx-5,y:cy,w:10,h:20,dx:0,dy:-10});
  }
  else if(canDiag===3){
    [-3,0,3].forEach(dx=>{
      bullets.push({x:cx-5,y:cy,w:10,h:20,dx:dx,dy:-10});
    });
  }
  else if(canDiag===4){
    [[-3,-10],[-1,-10],[1,-10],[3,-10]].forEach(p=>{
      bullets.push({x:cx-5,y:cy,w:10,h:20,dx:p[0],dy:p[1]});
    });
  }
}

// ===== ボス攻撃（数値そのまま）=====
function bossAttack(dt){
  bossShootTimer += dt;

  let interval = phase===1?1200:phase===2?800:500;

  if(bossShootTimer>=interval){
    bossShootTimer=0;

    if(phase===1){
      [-25,0,25].forEach(dx=>{
        enemyBullets.push({x:boss.x+50+dx-5,y:boss.y+100,w:10,h:10,vx:0,vy:6,big:false});
      });
    }
    else if(phase===2){
      [-30,0,30].forEach(dx=>{
        enemyBullets.push({x:boss.x+50+dx-5,y:boss.y+100,w:10,h:10,vx:dx*0.05,vy:7,big:false});
      });
    }
    else{
      [-30,0,30].forEach(dx=>{
        enemyBullets.push({x:boss.x+50+dx-5,y:boss.y+100,w:10,h:10,vx:dx*0.07,vy:8,big:false});
      });

      bossBigTimer+=dt;
      if(bossBigTimer>=4000){
        bossBigTimer=0;
        let dx = (player.x+20)-(boss.x+50);
        let dy = (player.y)-(boss.y+100);
        let d = Math.hypot(dx,dy);
        enemyBullets.push({
          x:boss.x+50-15,y:boss.y+100,
          w:30,h:30,
          vx:dx/d*4,vy:dy/d*4,big:true
        });
      }
    }
  }
}

// ===== 更新 =====
function update(dt){
  if(idx!==1) return;

  // 移動
  if(keys["a"]&&player.x>0) player.x-=playerSpeed;
  if(keys["d"]&&player.x+40<WIDTH) player.x+=playerSpeed;
  if(keys["w"]&&player.y>HEIGHT/2) player.y-=playerSpeed;
  if(keys["s"]&&player.y+40<HEIGHT) player.y+=playerSpeed;

  // 発射
  if(keys["Enter"] && Date.now()-lastShot>shootSpeed){
    lastShot=Date.now();
    shoot(player.x+20,player.y);
  }

  // プレイヤー弾移動
  bullets.forEach(b=>{b.x+=b.dx;b.y+=b.dy});
  bullets = bullets.filter(b=>b.y+b.h>0);

  // 敵弾移動＋被弾
  enemyBullets.forEach(b=>{
    b.x+=b.vx;b.y+=b.vy;
    if(hitRect(player,b)){
      player.hp -= b.big?2:1;
      b.y=HEIGHT+10;
    }
  });
  enemyBullets = enemyBullets.filter(b=>b.y<HEIGHT);

  // ボス移動
  if(boss.y<boss.targetY) boss.y+=2;
  boss.x+=boss.vx;
  if(boss.x<10||boss.x+100>WIDTH-10) boss.vx*=-1;

  // ボス被弾
  bullets.forEach(b=>{
    if(hitRect(b,boss)){
      boss.hp--;
      b.y=-100;
    }
  });

  bossAttack(dt);

  // フェーズ
  if(boss.hp<=0){
    phase++;
    if(phase===2){
      boss=spawnBoss(60);
      shootSpeed=Math.max(100,shootSpeed-100);
      canDiag=3;
    }
    else if(phase===3){
      boss=spawnBoss(120);
      shootSpeed=Math.max(100,shootSpeed-100);
      canDiag=4;
    }
    else{
      idx=3;
    }
  }

  if(player.hp<=0) idx=2;
}

// ===== 描画 =====
function draw(){
  ctx.clearRect(0,0,WIDTH,HEIGHT);

  if(idx===2){
    ctx.fillStyle="red";
    ctx.font="60px sans-serif";
    ctx.fillText("GAME OVER",80,320);
    return;
  }

  if(idx===3){
    ctx.fillStyle="yellow";
    ctx.font="60px sans-serif";
    ctx.fillText("COMPLETE!",90,320);
    return;
  }

  // ゲーム描画
  ctx.fillStyle="blue";
  ctx.fillRect(player.x,player.y,40,40);

  ctx.fillStyle="green";
  ctx.fillRect(boss.x,boss.y,100,100);

  ctx.fillStyle="cyan";
  bullets.forEach(b=>ctx.fillRect(b.x,b.y,b.w,b.h));

  ctx.fillStyle="red";
  enemyBullets.forEach(b=>ctx.fillRect(b.x,b.y,b.w,b.h));

  // HPバー
  ctx.fillStyle="gray";
  ctx.fillRect(40,20,400,10);
  ctx.fillStyle="red";
  ctx.fillRect(40,20,400*(boss.hp/boss.maxHp),10);

  // HP表示（常時・左上固定）
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.textAlign = "left";
    ctx.fillText("HP: " + player.hp, 10, 24);
}

// ===== ループ =====
let last=Date.now();
setInterval(()=>{
  let now=Date.now();
  let dt=now-last;
  last=now;
  update(dt);
  draw();
},1000/60);