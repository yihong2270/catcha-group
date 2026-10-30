(function(){
  var root = document.documentElement;
  root.classList.add('js');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  requestAnimationFrame(function(){ requestAnimationFrame(function(){ root.classList.add('ready'); }); });

  /* entrances */
  var io = new IntersectionObserver(function(es){
    es.forEach(function(e){ if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  }, {rootMargin:'0px 0px -6% 0px', threshold:0.1});
  document.querySelectorAll('[data-in]').forEach(function(el){ io.observe(el); });

  /* pointer */
  var mx = -1e4, my = -1e4, rx = -1e4, ry = -1e4;
  var pt = document.getElementById('pt'), ring = document.getElementById('ring');
  if (fine && !reduce){
    root.classList.add('has-pt', 'pt-off');
    addEventListener('pointermove', function(e){
      mx = e.clientX; my = e.clientY;
      if (rx < -9e3){ rx = mx; ry = my; }
      root.classList.remove('pt-off');
    }, {passive:true});
    document.addEventListener('pointerleave', function(){ root.classList.add('pt-off'); });
    addEventListener('pointerdown', function(){ root.classList.add('pressed'); });
    addEventListener('pointerup', function(){ root.classList.remove('pressed'); });
    document.querySelectorAll('a, button').forEach(function(el){
      el.addEventListener('pointerenter', function(){ root.classList.add('on-link'); });
      el.addEventListener('pointerleave', function(){ root.classList.remove('on-link'); });
    });
    document.querySelectorAll('input, textarea').forEach(function(el){
      el.addEventListener('pointerenter', function(){ root.classList.add('pt-off'); });
      el.addEventListener('pointerleave', function(){ root.classList.remove('pt-off'); });
    });
  }

  /* form: opens a ready-to-send email */
  var form = document.getElementById('form'), box = document.getElementById('formbox');
  form.addEventListener('submit', function(e){
    e.preventDefault();
    if (!form.reportValidity()) return;
    var f = form.elements, name = (f.first.value + ' ' + f.last.value).trim();
    location.href = 'mailto:enquiries@catchagroup.com?subject=' + encodeURIComponent('Hello from ' + name) +
      '&body=' + encodeURIComponent(f.message.value + '\n\n' + name + '\n' + f.email.value);
    box.classList.add('sent');
  });
  document.getElementById('again').addEventListener('click', function(){ form.reset(); box.classList.remove('sent'); });

  /* ---------- the hands ----------
     At rest the fingertips hang a hair apart. Point near the gap and they close it and touch;
     move away and they part again. The meeting point sits on the page's centre line. */
  var stage = document.getElementById('stage'), cv = document.getElementById('hands'), ctx = cv.getContext('2d');
  var SRC_H = 482, Y0 = 110, SPLIT = 800, TIP_X = 801, TIP_Y = 300 - 110;
  var REST = 11, TOUCH = -13;            // half-gap change, in source pixels: apart at rest, tips meeting at touch
  var mL = null, mR = null, wL = 800, wR = 600;
  var VERT = false, XOFF = 0, W = 0, H = 0, scale = 1, X0 = 0, HW = 599, cell = 5, chh = 7, cols = 0, rows = 0, seeds = null;
  var RAMP = " .'`,:;-~=+*x#%&@";
  var k = 0, vel = 0, glow = 0, burst = 0, was = false, held = false, inView = false;
  var p = {x: -1e4, y: -1e4, on: false};

  function load(src, cb){
    var im = new Image();
    im.onload = function(){
      var c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
      var x = c.getContext('2d'); x.drawImage(im, 0, 0);
      var d = x.getImageData(0, 0, c.width, c.height).data, a = new Uint8Array(c.width * c.height);
      for (var i = 0; i < a.length; i++) a[i] = d[i * 4 + 3];
      cb(a, c.width);
    };
    im.src = src;
  }
  function at(a, w, x, y){
    x = x | 0; y = y | 0;
    return (x < 0 || y < 0 || x >= w || y >= SRC_H) ? 0 : a[y * w + x] / 255;
  }
  function layout(){
    var dpr = Math.min(2, devicePixelRatio || 1);
    W = stage.getBoundingClientRect().width;
    VERT = innerWidth < 761;              // phone: the scene stands upright, one hand from above, one from below
    X0 = TIP_X - (HW = VERT ? 300 : 599); // the meeting point lands on the centre line
    if (VERT){ scale = W / 372; XOFF = (W - 372 * scale) / 2; H = Math.round(2 * HW * scale); }
    else { scale = W / (2 * HW); H = Math.round(372 * scale); }
    stage.style.height = H + 'px';
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cell = VERT ? 4 : (W < 900 ? 4 : 4.6);
    chh = cell * 1.42;
    cols = Math.ceil(W / cell); rows = Math.ceil(H / chh);
    seeds = new Float32Array(cols * rows);
    for (var i = 0; i < seeds.length; i++) seeds[i] = Math.random();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  }
  function smooth(a, b, x){ var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

  function step(t){
    var tx = VERT ? XOFF + (372 - TIP_Y) * scale : W / 2, ty = VERT ? H / 2 : TIP_Y * scale, target = 0;
    var span = VERT ? 600 : W;
    if (p.on){
      var dx = p.x - tx, dy = p.y - ty, d = Math.sqrt(dx * dx * (VERT ? 1.2 : 1) + dy * dy * (VERT ? 1 : 1.44));
      if (held && d > span * 0.1) held = false;      // once touching, they stay put until the pointer clearly moves away
      target = held ? 1 : 1 - smooth(span * 0.025, span * 0.2, d);
    } else if (VERT){
      // on a phone they also meet as the meeting point crosses the middle of the screen
      var meet = stage.getBoundingClientRect().top + ty;          // meeting point, in viewport px
      target = smooth(innerHeight * 0.95, innerHeight * 0.5, meet); // 0 as it enters at the bottom, 1 by mid-screen
    }
    if (!p.on) held = false;
    if (reduce) k = target;
    else { vel += (target - k) * 0.12; vel *= 0.72; k += vel; }
    if (k > 0.96 && (held || target > 0.96)){ k = 1; vel = 0; held = p.on; }   // contact: lock both fingertips, no wobble
    var touching = k > 0.96;
    if (touching && !was) burst = 1;
    was = touching;
    burst *= 0.93;
    glow += ((touching ? 1 : 0) - glow) * 0.14;
    draw(t, tx, ty);
  }

  function draw(t, tx, ty){
    ctx.clearRect(0, 0, W, H);
    var idle = reduce ? 0 : Math.sin(t / 1100) * 2.5 * (1 - Math.min(1, Math.max(0, k)));
    var off = REST + (TOUCH - REST) * Math.min(1, Math.max(0, k)) + idle;   // source pixels
    var L = RAMP.length - 1, q = cell * 0.3 / scale, R = W * 0.09, R2 = R * R, edge = (VERT ? H : W) * 0.1;
    var flick = reduce ? 0 : 0.03;
    ctx.font = '500 ' + (cell * 1.4).toFixed(1) + 'px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
    for (var r = 0; r < rows; r++){
      var y = r * chh + chh / 2;
      for (var c = 0; c < cols; c++){
        var x = c * cell + cell / 2, sx, sy, fade;
        if (VERT){ sx = y / scale + X0; sy = Y0 + 372 - (x - XOFF) / scale; if (sy < Y0) continue; var e2 = Math.min(y, H - y) / (H * 0.16); e2 = Math.max(0, Math.min(1, e2)); fade = e2 * e2 * (3 - 2 * e2); }
        else { sx = x / scale + X0; sy = y / scale + Y0; fade = Math.min(1, x / edge, (W - x) / edge); }
        var lx = sx + off, rx2 = sx - SPLIT - off;
        var v = fade * Math.max(
          (at(mL, wL, lx - q, sy) + at(mL, wL, lx + q, sy)) * 0.5,
          (at(mR, wR, rx2 - q, sy) + at(mR, wR, rx2 + q, sy)) * 0.5
        );
        if (v < 0.04) continue;
        var i = r * cols + c;
        if (Math.random() < flick && !(glow > 0.3 && (x - tx) * (x - tx) + (y - ty) * (y - ty) < R2 * 0.5)) seeds[i] = Math.random();   // the contact itself holds still
        var a = 0.22 + 0.78 * v;
        if (p.on){
          var ddx = x - p.x, ddy = y - p.y, d2 = ddx * ddx + ddy * ddy;
          if (d2 < R2) a = Math.min(1, a + (1 - Math.sqrt(d2) / R) * 0.3);
        }
        var idx = Math.max(1, Math.min(L, Math.round(v * L * (0.9 + 0.2 * seeds[i]))));
        ctx.fillStyle = 'rgba(237,235,230,' + a.toFixed(3) + ')';
        ctx.fillText(RAMP.charAt(idx), x, y);
      }
    }
    if (glow > 0.02 || burst > 0.02){
      var pulse = 0.75 + 0.25 * Math.sin(t / 240);
      ctx.font = '600 ' + (cell * 1.8).toFixed(1) + 'px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
      var n = 14, spread = scale * (12 + burst * 50);
      for (var j = 0; j < n; j++){
        var ang = j / n * Math.PI * 2 + t / 1600, rad = spread * (0.35 + ((j * 37) % 10) / 10);
        ctx.fillStyle = 'rgba(255,255,255,' + Math.min(1, (glow * 0.7 + burst) * pulse * (0.45 + 0.55 * Math.random())).toFixed(3) + ')';
        ctx.fillText(j % 3 ? '·' : '+', tx + Math.cos(ang) * rad, ty + Math.sin(ang) * rad * 0.75);
      }
    }
  }

  function setP(e){ var r = cv.getBoundingClientRect(); p.x = e.clientX - r.left; p.y = e.clientY - r.top; p.on = true; }
  function leave(){ p.on = false; root.classList.remove('on-stage'); }
  cv.addEventListener('pointermove', setP, {passive:true});
  cv.addEventListener('pointerdown', setP, {passive:true});
  cv.addEventListener('pointerenter', function(){ root.classList.add('on-stage'); });
  cv.addEventListener('pointerleave', leave);
  cv.addEventListener('pointerup', function(e){ if (e.pointerType !== 'mouse') leave(); });
  cv.addEventListener('pointercancel', leave);
  new IntersectionObserver(function(es){ inView = es[0].isIntersecting; }, {rootMargin:'120px'}).observe(stage);

  var n = 0;
  load('/images/hand-left.png', function(a, w){ mL = a; wL = w; if (++n === 2) begin(); });
  load('/images/hand-right.png', function(a, w){ mR = a; wR = w; if (++n === 2) begin(); });
  function begin(){
    layout(); step(performance.now());
    var to; addEventListener('resize', function(){ clearTimeout(to); to = setTimeout(function(){ layout(); step(performance.now()); }, 150); });
    if (reduce) ['pointermove', 'pointerleave', 'pointerdown', 'pointerup'].forEach(function(ev){ cv.addEventListener(ev, function(){ step(performance.now()); }); });
  }

  function frame(t){
    if (fine && mx > -9e3){
      rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16;
      pt.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
      ring.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)';
    }
    if (mL && mR && inView) step(t);
    requestAnimationFrame(frame);
  }
  if (!reduce) requestAnimationFrame(frame);
})();
