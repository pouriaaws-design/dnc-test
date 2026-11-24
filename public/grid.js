// Pelak — Copyright (c) 2026 PDNC. See LICENSE.md and LICENSE-PERMISSIONS.md
(function(){
  var canvas = document.getElementById('kinetic-grid');
  var ctx = canvas.getContext('2d');
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var CELL_SIZE = 52;
  var INFLUENCE_RADIUS = 230;
  var MAX_WARP = 20;
  var LERP_SPEED = 0.08;
  var LINE_BASE = { r:255, g:255, b:255, a:0.07 };
  var NODE_BASE_RADIUS = 1.5;
  var NODE_ACTIVE_RADIUS = 3;
  var theme = {
    lineActive: { r:100, g:150, b:255, a:0.85 },
    nodeActive: { r:150, g:125, b:255, a:1 },
    glow: '140,120,255',
    ripple: '130,150,255'
  };

  var mouse = { x:-9999, y:-9999 };
  var target = { x:-9999, y:-9999 };
  var ripples = [];
  var w = 0, h = 0, raf = null;

  // packets: dots that run along the grid lines from the logo to the hovered card
  var pkt = { el: null, rgb: '139,92,246', on: false, list: [], spawnT: 0, idle: false, idleT: 0 };
  var IDLE_COLORS = ['47,139,255', '139,92,246', '90,209,201', '250,190,88', '236,72,153', '41,182,246'];
  var G = { cols: 2, rows: 2, cw: 52, ch: 52 };
  var lastNow = 0;
  function nodeAt(cx, cy){
    return { c: Math.max(0, Math.min(G.cols - 1, Math.round(cx / G.cw))), r: Math.max(0, Math.min(G.rows - 1, Math.round(cy / G.ch))) };
  }
  function buildPath(a, b, horizFirst){
    var path = [{ c: a.c, r: a.r }], c = a.c, r = a.r;
    function stepH(){ while (c !== b.c){ c += b.c > c ? 1 : -1; path.push({ c: c, r: r }); } }
    function stepV(){ while (r !== b.r){ r += b.r > r ? 1 : -1; path.push({ c: c, r: r }); } }
    if (horizFirst){ stepH(); stepV(); } else { stepV(); stepH(); }
    return path;
  }

  function lerpN(a,b,t){ return a + (b-a)*t; }
  function lerpColor(base, active, t){
    var r = Math.round(lerpN(base.r, active.r, t));
    var g = Math.round(lerpN(base.g, active.g, t));
    var b = Math.round(lerpN(base.b, active.b, t));
    var a = lerpN(base.a, active.a, t);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a.toFixed(3) + ')';
  }

  function setSize(){
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  setSize();
  window.addEventListener('resize', setSize);

  window.addEventListener('mousemove', function(e){
    target.x = e.clientX; target.y = e.clientY;
  });
  window.addEventListener('touchmove', function(e){
    if (e.touches && e.touches[0]) { target.x = e.touches[0].clientX; target.y = e.touches[0].clientY; }
  }, { passive: true });
  window.addEventListener('click', function(e){
    ripples.push({ x: e.clientX, y: e.clientY, radius: 0, opacity: 1, born: performance.now() });
  });

  function getWarpedPoint(gx, gy, col, row, cols, rows){
    var edgeMargin = 1.5;
    var colPin = Math.min(col/edgeMargin, (cols-1-col)/edgeMargin, 1);
    var rowPin = Math.min(row/edgeMargin, (rows-1-row)/edgeMargin, 1);
    var pinFactor = colPin*colPin*rowPin*rowPin;

    var dx = gx - mouse.x, dy = gy - mouse.y;
    var dist = Math.sqrt(dx*dx + dy*dy);
    var proximity = Math.max(0, 1 - dist/INFLUENCE_RADIUS) * pinFactor;

    var rx = 0, ry = 0;
    for (var i = 0; i < ripples.length; i++){
      var r = ripples[i];
      var rdx = gx - r.x, rdy = gy - r.y;
      var rdist = Math.sqrt(rdx*rdx + rdy*rdy);
      var waveWidth = 55;
      var diff = rdist - r.radius;
      if (Math.abs(diff) < waveWidth){
        var strength = (1 - Math.abs(diff)/waveWidth) * r.opacity * 16 * pinFactor;
        var angle2 = Math.atan2(rdy, rdx);
        var sign = diff < 0 ? -1 : 1;
        rx += Math.cos(angle2) * strength * sign * -1;
        ry += Math.sin(angle2) * strength * sign * -1;
      }
    }

    if (dist < INFLUENCE_RADIUS && dist > 0 && pinFactor > 0){
      var t = dist / INFLUENCE_RADIUS;
      var eased = t < 0.01 ? 0 : (1-t)*(1-t)*Math.min(1, dist/60);
      var warpAmt = eased * MAX_WARP * pinFactor;
      var angle = Math.atan2(dy, dx);
      return { pt: { x: gx - Math.cos(angle)*warpAmt + rx, y: gy - Math.sin(angle)*warpAmt + ry }, proximity: proximity };
    }
    return { pt: { x: gx + rx, y: gy + ry }, proximity: proximity };
  }

  function draw(now){
    ctx.clearRect(0, 0, w, h);
    var dt = Math.min(0.05, Math.max(0, (now - lastNow) / 1000));
    lastNow = now;

    for (var i = ripples.length - 1; i >= 0; i--){
      var r = ripples[i];
      var age = (now - r.born) / 1000;
      r.radius = Math.max(0, age * 380);
      r.opacity = Math.max(0, 1 - age * 1.2);
      if (r.opacity <= 0) ripples.splice(i, 1);
    }

    var cols = Math.max(2, Math.ceil(w / CELL_SIZE)) + 1;
    var rows = Math.max(2, Math.ceil(h / CELL_SIZE)) + 1;
    var cellW = w / (cols - 1), cellH = h / (rows - 1);
    G.cols = cols; G.rows = rows; G.cw = cellW; G.ch = cellH;

    var pts = [], prox = [];
    for (var row = 0; row < rows; row++){
      pts[row] = []; prox[row] = [];
      for (var col = 0; col < cols; col++){
        var res = getWarpedPoint(col*cellW, row*cellH, col, row, cols, rows);
        pts[row][col] = res.pt; prox[row][col] = res.proximity;
      }
    }

    function drawSeg(p1, p2, pr1, pr2){
      var avg = (pr1 + pr2) / 2;
      var t = avg*avg*(3 - 2*avg);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = lerpColor(LINE_BASE, theme.lineActive, t);
      ctx.lineWidth = lerpN(0.6, 1.3, t);
      ctx.stroke();
    }

    for (var row2 = 0; row2 < rows; row2++)
      for (var col2 = 0; col2 < cols - 1; col2++)
        drawSeg(pts[row2][col2], pts[row2][col2+1], prox[row2][col2], prox[row2][col2+1]);
    for (var col3 = 0; col3 < cols; col3++)
      for (var row3 = 0; row3 < rows - 1; row3++)
        drawSeg(pts[row3][col3], pts[row3+1][col3], prox[row3][col3], prox[row3+1][col3]);

    for (var row4 = 0; row4 < rows; row4++){
      for (var col4 = 0; col4 < cols; col4++){
        var p = pts[row4][col4], pr = prox[row4][col4];
        var t2 = pr*pr*(3 - 2*pr);
        var rad = lerpN(NODE_BASE_RADIUS, NODE_ACTIVE_RADIUS, t2);
        if (t2 > 0.3){
          var glowR = rad + lerpN(0, 6, (t2 - 0.3) / 0.7);
          var grd = ctx.createRadialGradient(p.x, p.y, rad*0.5, p.x, p.y, glowR);
          grd.addColorStop(0, 'rgba(' + theme.glow + ',' + (t2*0.25).toFixed(3) + ')');
          grd.addColorStop(1, 'rgba(' + theme.glow + ',0)');
          ctx.beginPath();
          ctx.arc(p.x, p.y, glowR, 0, Math.PI*2);
          ctx.fillStyle = grd;
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad, 0, Math.PI*2);
        ctx.fillStyle = lerpColor({ r:255, g:255, b:255, a:0.12 }, theme.nodeActive, t2);
        ctx.fill();
      }
    }

    if (!reduced){
      if (pkt.idle){
        pkt.idleT -= dt;
        if (pkt.idleT <= 0 && pkt.list.length < 18){
          pkt.idleT = 0.14;
          var ia = { c: Math.floor(Math.random() * G.cols), r: Math.floor(Math.random() * G.rows) };
          var ib = {
            c: Math.max(0, Math.min(G.cols - 1, ia.c + Math.floor((Math.random() - 0.5) * 50))),
            r: Math.max(0, Math.min(G.rows - 1, ia.r + Math.floor((Math.random() - 0.5) * 26)))
          };
          var ipath = buildPath(ia, ib, Math.random() < 0.5);
          if (ipath.length > 6) pkt.list.push({ path: ipath, u: 0, v: 20 + Math.random() * 14, rgb: IDLE_COLORS[Math.floor(Math.random() * IDLE_COLORS.length)] });
        }
      }
      for (var pi = pkt.list.length - 1; pi >= 0; pi--){
        var pk = pkt.list[pi];
        pk.u += pk.v * dt;
        var lastIdx = pk.path.length - 1;
        if (pk.u >= lastIdx){
          var ln = pk.path[lastIdx];
          var ep = getWarpedPoint(ln.c * cellW, ln.r * cellH, ln.c, ln.r, cols, rows).pt;
          ripples.push({ x: ep.x, y: ep.y, radius: 0, opacity: 1, born: now });
          pkt.list.splice(pi, 1);
          continue;
        }
        for (var tk = 6; tk >= 0; tk--){
          var uu = pk.u - tk * 0.6;
          if (uu < 0) continue;
          var i0 = Math.floor(uu), i1 = Math.min(lastIdx, i0 + 1), fr = uu - i0;
          var n0 = pk.path[i0], n1 = pk.path[i1];
          var q0 = getWarpedPoint(n0.c * cellW, n0.r * cellH, n0.c, n0.r, cols, rows).pt;
          var q1 = getWarpedPoint(n1.c * cellW, n1.r * cellH, n1.c, n1.r, cols, rows).pt;
          var px = q0.x + (q1.x - q0.x) * fr, py = q0.y + (q1.y - q0.y) * fr;
          if (tk === 0){
            var pg = ctx.createRadialGradient(px, py, 0, px, py, 18);
            pg.addColorStop(0, 'rgba(' + pk.rgb + ',0.55)');
            pg.addColorStop(1, 'rgba(' + pk.rgb + ',0)');
            ctx.beginPath(); ctx.arc(px, py, 18, 0, Math.PI*2); ctx.fillStyle = pg; ctx.fill();
          }
          ctx.beginPath();
          ctx.arc(px, py, Math.max(1, tk === 0 ? 4.2 : 3.2 - tk * 0.35), 0, Math.PI*2);
          ctx.fillStyle = tk === 0 ? 'rgba(255,255,255,0.95)' : 'rgba(' + pk.rgb + ',' + ((1 - tk / 7) * 0.8).toFixed(3) + ')';
          ctx.fill();
        }
      }
    }

    for (var i2 = 0; i2 < ripples.length; i2++){
      var rp = ripples[i2];
      var safeR = Math.max(0, rp.radius);
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, safeR, 0, Math.PI*2);
      ctx.strokeStyle = 'rgba(' + theme.ripple + ',' + (rp.opacity*0.22).toFixed(3) + ')';
      ctx.lineWidth = 1.3;
      ctx.stroke();
    }
  }

  var gridLastF = 0, GRID_MS = window.matchMedia && window.matchMedia('(pointer: coarse)').matches ? 32 : 15;
  function animate(now){
    raf = requestAnimationFrame(animate);
    if (document.hidden || now - gridLastF < GRID_MS) return;
    gridLastF = now;
    mouse.x = lerpN(mouse.x, target.x, LERP_SPEED);
    mouse.y = lerpN(mouse.y, target.y, LERP_SPEED);
    draw(now);
  }

  window.LZ_GRID = {
    setIdle: function(){},
    setTheme: function(a1, a2){
      theme.lineActive = { r:a1[0], g:a1[1], b:a1[2], a:0.85 };
      theme.nodeActive = { r:a2[0], g:a2[1], b:a2[2], a:1 };
      theme.glow = a2.join(',');
      theme.ripple = a1.join(',');
    }
  };

  if (reduced){
    draw(performance.now());
  } else {
    raf = requestAnimationFrame(animate);
  }
})();
