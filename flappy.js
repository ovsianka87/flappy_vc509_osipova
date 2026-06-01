(() => {
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    const overlay = document.getElementById('overlay');
    const titleEl = document.getElementById('title');
    const subtitleEl = document.getElementById('subtitle');
    const finalScoreEl = document.getElementById('finalScore');
    const bestScoreEl = document.getElementById('bestScore');

    const STATE = { READY: 0, PLAY: 1, OVER: 2 };
    let state = STATE.READY;

    const GROUND_H = 100;
    const GRAVITY = 0.28;
    const JUMP = -6.2;
    const PIPE_W = 60;
    const PIPE_GAP = 170;
    const PIPE_SPEED = 2.1;
    const PIPE_INTERVAL = 110;

    let bird, pipes, score, best, frame;

    best = parseInt(localStorage.getItem('flappyBest') || '0', 10);

    function reset() {
        bird = { x: 90, y: H / 2, vy: 0, r: 14, rot: 0 };
        pipes = [];
        score = 0;
        frame = 0;
    }
    reset();

    let audioCtx = null;
    function ensureAudio() {
        if (!audioCtx) {
            try {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) { audioCtx = null; }
        }
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    }
    function beep(freq, dur, type = 'square', vol = 0.15) {
        if (!audioCtx) return;
        const t = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(t);
        osc.stop(t + dur);
    }
    function sndFlap()  { beep(520, 0.08, 'square', 0.12); }
    function sndScore() { beep(880, 0.10, 'triangle', 0.18); setTimeout(() => beep(1175, 0.12, 'triangle', 0.18), 80); }
    function sndHit()   { beep(180, 0.20, 'sawtooth', 0.25); setTimeout(() => beep(90, 0.30, 'sawtooth', 0.22), 120); }

    function flap() {
        ensureAudio();
        if (state === STATE.READY) {
            state = STATE.PLAY;
            overlay.classList.add('hidden');
        }
        if (state === STATE.PLAY) {
            bird.vy = JUMP;
            sndFlap();
        } else if (state === STATE.OVER) {
            if (frame > 30) {
                reset();
                state = STATE.READY;
                showReady();
            }
        }
    }

    function showReady() {
        overlay.classList.remove('hidden');
        titleEl.textContent = 'Flappy Bird';
        subtitleEl.textContent = 'Нажмите ПРОБЕЛ или ЛКМ, чтобы начать';
        subtitleEl.classList.remove('hidden');
        finalScoreEl.classList.add('hidden');
        bestScoreEl.classList.add('hidden');
    }

    function showOver() {
        overlay.classList.remove('hidden');
        titleEl.textContent = 'Игра окончена';
        subtitleEl.textContent = 'ПРОБЕЛ / ЛКМ — играть снова';
        finalScoreEl.textContent = 'Счёт: ' + score;
        bestScoreEl.textContent = 'Рекорд: ' + best;
        finalScoreEl.classList.remove('hidden');
        bestScoreEl.classList.remove('hidden');
    }

    function spawnPipe() {
        const minTop = 50;
        const maxTop = H - GROUND_H - PIPE_GAP - 50;
        const top = Math.random() * (maxTop - minTop) + minTop;
        pipes.push({ x: W, top, passed: false });
    }

    function update() {
        frame++;
        if (state === STATE.PLAY) {
            bird.vy += GRAVITY;
            bird.y += bird.vy;
            bird.rot = Math.max(-0.4, Math.min(1.3, bird.vy / 10));

            if (frame % PIPE_INTERVAL === 0) spawnPipe();

            for (const p of pipes) {
                p.x -= PIPE_SPEED;
                if (!p.passed && p.x + PIPE_W < bird.x) {
                    p.passed = true;
                    score++;
                    sndScore();
                }
            }
            pipes = pipes.filter(p => p.x + PIPE_W > -10);

            if (bird.y + bird.r >= H - GROUND_H) {
                bird.y = H - GROUND_H - bird.r;
                die();
            }
            if (bird.y - bird.r <= 0) {
                bird.y = bird.r;
                bird.vy = 0;
            }

            for (const p of pipes) {
                if (bird.x + bird.r > p.x && bird.x - bird.r < p.x + PIPE_W) {
                    if (bird.y - bird.r < p.top || bird.y + bird.r > p.top + PIPE_GAP) {
                        die();
                        break;
                    }
                }
            }
        } else if (state === STATE.OVER) {
            if (bird.y + bird.r < H - GROUND_H) {
                bird.vy += GRAVITY;
                bird.y += bird.vy;
                bird.rot = Math.min(1.5, bird.rot + 0.05);
                if (bird.y + bird.r > H - GROUND_H) bird.y = H - GROUND_H - bird.r;
            }
        } else if (state === STATE.READY) {
            bird.y = H / 2 + Math.sin(frame / 10) * 6;
        }
    }

    function die() {
        if (state !== STATE.PLAY) return;
        state = STATE.OVER;
        sndHit();
        if (score > best) {
            best = score;
            localStorage.setItem('flappyBest', String(best));
        }
        frame = 0;
        setTimeout(showOver, 400);
    }

    function drawBird() {
        ctx.save();
        ctx.translate(bird.x, bird.y);
        ctx.rotate(bird.rot);
        ctx.fillStyle = '#f7d51d';
        ctx.beginPath();
        ctx.arc(0, 0, bird.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#5a3e1b';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#ff8c00';
        ctx.beginPath();
        ctx.moveTo(bird.r - 2, 2);
        ctx.lineTo(bird.r + 8, 0);
        ctx.lineTo(bird.r - 2, 6);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(4, -4, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(6, -4, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e0a800';
        ctx.beginPath();
        ctx.ellipse(-4, 2, 6, 4, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    function drawPipe(p) {
        const grad = ctx.createLinearGradient(p.x, 0, p.x + PIPE_W, 0);
        grad.addColorStop(0, '#5cb02c');
        grad.addColorStop(0.5, '#a4e057');
        grad.addColorStop(1, '#3f8b1a');
        ctx.fillStyle = grad;
        ctx.fillRect(p.x, 0, PIPE_W, p.top);
        ctx.fillRect(p.x, p.top + PIPE_GAP, PIPE_W, H - GROUND_H - p.top - PIPE_GAP);
        ctx.fillStyle = '#3f8b1a';
        ctx.fillRect(p.x - 4, p.top - 20, PIPE_W + 8, 20);
        ctx.fillRect(p.x - 4, p.top + PIPE_GAP, PIPE_W + 8, 20);
        ctx.strokeStyle = '#1c4d0a';
        ctx.lineWidth = 2;
        ctx.strokeRect(p.x, 0, PIPE_W, p.top);
        ctx.strokeRect(p.x, p.top + PIPE_GAP, PIPE_W, H - GROUND_H - p.top - PIPE_GAP);
        ctx.strokeRect(p.x - 4, p.top - 20, PIPE_W + 8, 20);
        ctx.strokeRect(p.x - 4, p.top + PIPE_GAP, PIPE_W + 8, 20);
    }

    let groundOffset = 0;
    function drawGround() {
        ctx.fillStyle = '#ded895';
        ctx.fillRect(0, H - GROUND_H, W, GROUND_H);
        ctx.fillStyle = '#c0b35a';
        ctx.fillRect(0, H - GROUND_H, W, 6);
        if (state === STATE.PLAY) groundOffset = (groundOffset + PIPE_SPEED) % 24;
        ctx.fillStyle = '#a89b4a';
        for (let x = -groundOffset; x < W; x += 24) {
            ctx.fillRect(x, H - GROUND_H + 12, 12, 6);
        }
    }

    function drawClouds() {
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        const offs = (frame * 0.3) % (W + 100);
        for (let i = 0; i < 3; i++) {
            const cx = ((i * 180) - offs + W + 100) % (W + 100) - 50;
            const cy = 80 + i * 40;
            ctx.beginPath();
            ctx.arc(cx, cy, 20, 0, Math.PI * 2);
            ctx.arc(cx + 18, cy + 4, 16, 0, Math.PI * 2);
            ctx.arc(cx - 18, cy + 4, 14, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawScore() {
        if (state === STATE.READY) return;
        ctx.font = 'bold 48px Segoe UI, Tahoma, sans-serif';
        ctx.textAlign = 'center';
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#000';
        ctx.fillStyle = '#fff';
        ctx.strokeText(String(score), W / 2, 70);
        ctx.fillText(String(score), W / 2, 70);
    }

    function render() {
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#70c5ce';
        ctx.fillRect(0, 0, W, H - GROUND_H);
        drawClouds();
        for (const p of pipes) drawPipe(p);
        drawGround();
        drawBird();
        drawScore();
    }

    function loop() {
        update();
        render();
        requestAnimationFrame(loop);
    }

    window.addEventListener('keydown', e => {
        if (e.code === 'Space') {
            e.preventDefault();
            flap();
        }
    });
    canvas.addEventListener('mousedown', e => {
        if (e.button === 0) flap();
    });
    canvas.addEventListener('touchstart', e => {
        e.preventDefault();
        flap();
    }, { passive: false });

    showReady();
    loop();
})();
