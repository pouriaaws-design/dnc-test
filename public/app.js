// Pelak — Copyright (c) 2026 PDNC. See LICENSE.md and LICENSE-PERMISSIONS.md
(function(){
  // Settings come from site.config.js (the server puts them in window.SITE)
  var SITE = window.SITE;
  function off(part){ return SITE.off.indexOf(part) !== -1; }
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // One request for everything the page needs on load; later refreshes use the single endpoints.
  var bootP = fetch('/api/boot', { cache: 'no-store' }).then(function(r){ return r.json(); }).catch(function(){ return null; });
  var bootUsed = {};
  function viaBoot(key, url){
    if (!bootUsed[key]){
      bootUsed[key] = true;
      return bootP.then(function(b){
        if (b && b[key] !== undefined && b[key] !== null) return b[key];
        return fetch(url).then(function(r){ return r.json(); });
      });
    }
    return fetch(url).then(function(r){ return r.json(); });
  }
  function pollOk(){ return !document.hidden && (!window.LZ_ACTIVE || window.LZ_ACTIVE()); }

  // ── Web Audio API Sounds ──
  var audioCtx = null;
  function playSound(type) {
    if (reduce) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      var now = audioCtx.currentTime;
      
      if (type === 'type') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.02);
        gain.gain.setValueAtTime(0.02, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
        osc.start(now);
        osc.stop(now + 0.02);
      } else if (type === 'enter') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.03);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        osc.start(now);
        osc.stop(now + 0.03);
      } else if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.03);
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        osc.start(now);
        osc.stop(now + 0.03);
      }
    } catch (e) {}
  }
  
  document.addEventListener('mousedown', function(e) {
    if (e.target.closest('button, a, .chip, .tile, .vdots')) playSound('click');
  });

  // ── Translations ──
  var I18N = {
    fa: {
      telegram: 'تلگرام', youtube: 'یوتوب', instagram: 'اینستاگرام', github: 'گیتهاب',
      latest: 'آخرین ویدیو', latestMany: 'آخرین ویدیوها',
      fromChannel: 'از کانال', featured: 'پروژه‌ی منتخب', updated: 'آپدیت', starsU: 'ستاره', forksU: 'فورک',
      qr: 'کد QR', terminal: 'ترمینال', copyLink: 'کپی لینک', save: 'ذخیره', close: 'بستن', copied: 'کپی شد',
      views: 'بازدید', likes: 'لایک', comments: 'کامنت',
      members: 'عضو', subscribers: 'سابسکرایبر', stars: 'ستاره ★',
      guestbook: 'یادگاری', guestbookTitle: 'پیام‌های یادگاری', gbSubmit: 'ثبت پیام',
      goalLabel: 'هدف:',
      lastSupport: 'آخرین حمایت', newSupport: 'حمایت جدید رسید! 💚', beFirst: 'اولین حامی باش 💎', topDonor: 'حامی طلایی 👑',
      myCard: 'کارت من', achTitle: 'دستاوردها', achNew: 'دستاورد جدید', download: 'دانلود', share: 'اشتراک', cardMaking: 'در حال ساخت کارت…', cardErr: 'ساخت کارت ناموفق بود',
      mapTitle: 'بازدیدکننده‌ها از سراسر دنیا', mapCountries: 'کشور', mapVisits: 'بازدید', mapWeek: 'این هفته', mapYou: 'تو اینجایی',
      tipTitle: 'نکتهٔ روز لینوکس', tipCopy: 'کپی', tipNext: 'نکتهٔ بعدی',
      snakeSubmit: 'ثبت رکورد', snakeAgain: 'دوباره', snakeReady: 'یکی از کلیدهای جهت رو بزن یا روی صفحه بکش', snakeOver: 'بازی تموم شد', snakeName: 'اسمت', snakeBoard: 'رکوردداران', snakeChamp: 'قهرمان', snakePlay: 'بازی کن و اسمت رو بالا ببر', snakeSaved: 'ثبت شد! رتبهٔ تو', snakeFail: 'ثبت نشد', idleHint: 'برای بیدار شدن تکون بده'
    },
    en: {
      telegram: 'Telegram', youtube: 'YouTube', instagram: 'Instagram', github: 'GitHub',
      latest: 'Latest video', latestMany: 'Latest videos',
      fromChannel: 'From the channel', featured: 'Featured project', updated: 'Updated', starsU: 'stars', forksU: 'forks',
      qr: 'QR code', terminal: 'Terminal', copyLink: 'Copy link', save: 'Save', close: 'Close', copied: 'Copied',
      views: 'views', likes: 'likes', comments: 'comments',
      members: 'members', subscribers: 'subscribers', stars: 'stars ★',
      guestbook: 'Guestbook', guestbookTitle: 'Messages', gbSubmit: 'Send Message',
      goalLabel: 'Goal:',
      lastSupport: 'Latest support', newSupport: 'New support just landed! 💚', beFirst: 'Be the first supporter 💎', topDonor: 'Top Supporter 👑',
      myCard: 'My card', achTitle: 'Achievements', achNew: 'New achievement', download: 'Download', share: 'Share', cardMaking: 'Making your card…', cardErr: 'Could not make the card',
      mapTitle: 'Visitors around the world', mapCountries: 'countries', mapVisits: 'visits', mapWeek: 'this week', mapYou: 'you are here',
      tipTitle: 'Linux tip of the day', tipCopy: 'Copy', tipNext: 'Next tip',
      snakeSubmit: 'Submit score', snakeAgain: 'Play again', snakeReady: 'Press an arrow key or swipe to start', snakeOver: 'Game over', snakeName: 'Your name', snakeBoard: 'Top players', snakeChamp: 'Champion', snakePlay: 'Play and climb the board', snakeSaved: 'Saved! Your rank', snakeFail: 'Could not save', idleHint: 'move to wake up'
    }
  };

  ['fa', 'en'].forEach(function(l){ for (var k in SITE.text[l]) I18N[l][k] = SITE.text[l][k]; });

  var lang = document.documentElement.getAttribute('data-lang') || SITE.defaultLang;
  var videos = [];
  var posts = [], repo = null, statsData = null;
  var EYE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  var LANG_COLORS = { Python:'#3572A5', Go:'#00ADD8', JavaScript:'#f1e05a', TypeScript:'#3178c6', Shell:'#89e051', HTML:'#e34c26', CSS:'#563d7c', Svelte:'#ff3e00', Rust:'#dea584', C:'#555555', 'C++':'#f34b7d', Java:'#b07219', PHP:'#4F5D95', Lua:'#000080' };
  var vi = 0;
  var SLIDE_MS = 6500;
  var vTimer = null, vElapsed = 0, vPaused = false;

  function relTime(iso){
    var diff = (new Date(iso).getTime() - Date.now()) / 1000;
    if (isNaN(diff)) return '';
    try {
      var rtf = new Intl.RelativeTimeFormat(lang === 'fa' ? 'fa-u-nu-latn' : lang, { numeric: 'auto' });
      var steps = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
      for (var i = 0; i < steps.length; i++){
        if (Math.abs(diff) >= steps[i][1]) return rtf.format(Math.round(diff / steps[i][1]), steps[i][0]);
      }
      return rtf.format(0, 'second');
    } catch (e) {
      return new Date(iso).toLocaleDateString(lang === 'fa' ? 'fa-IR-u-nu-latn' : 'en-US');
    }
  }

  function renderTagline(){
    var el = document.getElementById('tagline');
    var words = I18N[lang].tagline.split(' ');
    var html = '';
    for (var i = 0; i < words.length; i++){
      html += '<span class="w" style="--i:' + i + '">' + words[i] + '</span>' + (i < words.length - 1 ? ' ' : '');
    }
    var cursorDelay = (0.5 + words.length * 0.055 + 0.45).toFixed(2);
    el.innerHTML = html + '<span class="cursor" style="--cd:' + cursorDelay + 's"></span>';
    el.classList.remove('pending');
  }

  function fmtBig(n){
    return n >= 1000000
      ? new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
      : n.toLocaleString('en-US');
  }
  function fmtDur(s){
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return (h ? h + ':' + (m < 10 ? '0' : '') + m : m) + ':' + (sec < 10 ? '0' : '') + sec;
  }
  function runNumber(node, to, delay){
    if (reduce || to === 0){ node.textContent = fmtBig(to); return; }
    node.textContent = '0';
    var dur = 1500 + Math.min(1200, Math.log(to + 1) * 110);
    var start = null;
    function step(ts){
      if (start === null) start = ts;
      var p = Math.min(1, (ts - start) / dur);
      node.textContent = fmtBig(Math.round(to * (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p))));
      if (p < 1) requestAnimationFrame(step);
    }
    setTimeout(function(){ requestAnimationFrame(step); }, delay);
  }

  function paintVideo(animateStats){
    var el = document.getElementById('video');
    var link = document.getElementById('vlink');
    var video = videos[vi];
    if (!video) return;

    var img = link.querySelector('img');
    if (img.getAttribute('data-vid') !== video.id){
      img.setAttribute('data-vid', video.id);
      img.onerror = function(){
        img.onerror = null;
        img.setAttribute('src', 'https://i.ytimg.com/vi/' + video.id + '/hqdefault.jpg');
      };
      img.setAttribute('src', '/thumb/' + video.id);
    }
    link.setAttribute('href', '/go/video?v=' + video.id);
    link.querySelector('.vtitle').textContent = video.title;
    link.querySelector('.vdur').textContent = video.duration > 0 ? fmtDur(video.duration) : '';
    el.querySelector('.vdate').textContent = video.published ? relTime(video.published) : '';

    var keys = ['views', 'likes', 'comments'];
    for (var i = 0; i < keys.length; i++){
      var stat = link.querySelector('.vstat[data-k="' + keys[i] + '"]');
      var v = video[keys[i]];
      if (typeof v !== 'number'){ stat.hidden = true; continue; }
      stat.hidden = false;
      var numEl = stat.querySelector('.num');
      if (animateStats) runNumber(numEl, v, 150 + i * 120);
      else numEl.textContent = fmtBig(v);
    }

    var label = el.querySelector('.vlabel span[data-i18n]');
    var labelKey = videos.length > 1 ? 'latestMany' : 'latest';
    label.setAttribute('data-i18n', labelKey);
    label.textContent = I18N[lang][labelKey];

    var dots = el.querySelectorAll('.dots button');
    for (var d = 0; d < dots.length; d++){
      dots[d].classList.toggle('active', d === vi);
      dots[d].setAttribute('aria-current', d === vi ? 'true' : 'false');
    }
    el.classList.remove('loading');
  }

  function renderVideo(){ if (videos.length) paintVideo(false); }

  function goVideo(n){
    if (videos.length < 2) return;
    n = (n + videos.length) % videos.length;
    if (n === vi) return;
    var link = document.getElementById('vlink');
    vElapsed = 0;
    vi = n;
    link.classList.add('swap');
    setTimeout(function(){ paintVideo(true); link.classList.remove('swap'); }, reduce ? 0 : 200);
  }

  function buildDots(){
    var box = document.getElementById('vdots');
    box.innerHTML = '';
    if (videos.length < 2) return;
    for (var i = 0; i < videos.length; i++){
      (function(n){
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', 'Video ' + (n + 1));
        b.appendChild(document.createElement('i'));
        b.addEventListener('click', function(){ goVideo(n); });
        box.appendChild(b);
      })(i);
    }
  }

  function startSlideshow(){
    if (vTimer) clearInterval(vTimer);
    if (videos.length < 2 || reduce) return;
    vTimer = setInterval(function(){
      if (vPaused || document.hidden) return;
      vElapsed += 100;
      if (vElapsed >= SLIDE_MS) goVideo(vi + 1);
    }, 100);
  }

  // Pause on hover / focus / touch, swipe to change
  var vcard = document.getElementById('video');
  vcard.style.setProperty('--slide-ms', SLIDE_MS + 'ms');
  function setPaused(p){ vPaused = p; vcard.classList.toggle('paused', p); }
  vcard.addEventListener('pointerenter', function(e){ if (e.pointerType === 'mouse') setPaused(true); });
  vcard.addEventListener('pointerleave', function(e){ if (e.pointerType === 'mouse') setPaused(false); });
  vcard.addEventListener('focusin', function(){ setPaused(true); });
  vcard.addEventListener('focusout', function(){ setPaused(false); });
  var swipeX = null;
  vcard.addEventListener('touchstart', function(e){ swipeX = e.touches[0].clientX; setPaused(true); }, { passive: true });
  vcard.addEventListener('touchend', function(e){
    if (swipeX !== null){
      var dx = e.changedTouches[0].clientX - swipeX;
      if (Math.abs(dx) > 45){
        var rtl = document.documentElement.dir === 'rtl';
        goVideo(vi + ((rtl ? dx > 0 : dx < 0) ? 1 : -1));
      }
    }
    swipeX = null; setPaused(false);
  }, { passive: true });
  vcard.addEventListener('touchcancel', function(){ swipeX = null; setPaused(false); }, { passive: true });

  function renderPosts(){
    var box = document.getElementById('posts');
    var list = document.getElementById('plist');
    if (!posts.length){ box.hidden = true; return; }
    list.innerHTML = '';
    for (var i = 0; i < posts.length; i++){
      var p = posts[i];
      var a = document.createElement('a');
      a.className = 'post';
      a.href = '/go/post?p=' + p.n;
      a.target = '_blank';
      a.rel = 'noopener';
      a.style.setProperty('--i', i);
      var text = document.createElement('span');
      text.className = 'ptext';
      text.setAttribute('dir', 'auto');
      text.textContent = p.text;
      var info = document.createElement('span');
      info.className = 'pinfo';
      var when = document.createElement('span');
      when.textContent = p.date ? relTime(p.date) : '';
      info.appendChild(when);
      if (p.views){
        var v = document.createElement('span');
        v.className = 'pviews';
        v.innerHTML = EYE_SVG;
        v.appendChild(document.createTextNode(' ' + p.views));
        info.appendChild(v);
      }
      a.appendChild(text);
      a.appendChild(info);
      list.appendChild(a);
    }
    box.hidden = false;
  }

  function renderProject(animate){
    var el = document.getElementById('project');
    var gridEl = document.querySelector('.grid');
    if (!repo){ el.hidden = true; gridEl.classList.remove('has-project'); return; }
    el.querySelector('.pname b').textContent = repo.name;
    var desc = el.querySelector('.pdesc');
    desc.textContent = repo.description || '';
    desc.hidden = !repo.description;
    var langChip = el.querySelector('.pchip.plang');
    if (repo.language){
      langChip.hidden = false;
      langChip.querySelector('span').textContent = repo.language;
      var color = repo.color || LANG_COLORS[repo.language] || '';
      langChip.querySelector('.ldot').style.background = /^#[0-9a-fA-F]{3,8}$/.test(color) ? color : '';
    } else {
      langChip.hidden = true;
    }
    el.querySelector('.pupd').textContent = repo.pushed ? I18N[lang].updated + ' ' + relTime(repo.pushed) : '';
    var pairs = [['stars', repo.stars], ['forks', repo.forks]];
    for (var i = 0; i < pairs.length; i++){
      var node = el.querySelector('.pchip[data-k="' + pairs[i][0] + '"] .num');
      var n = typeof pairs[i][1] === 'number' ? pairs[i][1] : 0;
      if (animate) runNumber(node, n, 200 + i * 140);
      else node.textContent = fmtBig(n);
    }
    el.hidden = false;
    gridEl.classList.add('has-project');
  }

  // ── Copy helpers, toast, QR dialog ──
  var toastEl = document.getElementById('toast');
  var toastTimer = null;
  function toast(msg, ms){
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toastEl.classList.remove('show'); }, ms || 1800);
  }
  function copyText(text){
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function(resolve, reject){
      try {
        var ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (ok) resolve(); else reject();
      } catch (e) { reject(e); }
    });
  }

  var copyChips = document.querySelectorAll('.chip.copy');
  for (var cc = 0; cc < copyChips.length; cc++){
    (function(chip){
      chip.addEventListener('click', function(e){
        e.preventDefault(); e.stopPropagation(); // copy instead of opening the tile link
        var text = chip.getAttribute('data-copy');
        copyText(text).then(function(){
          var num = chip.querySelector('.num');
          chip.classList.add('copied');
          num.textContent = I18N[lang].copied;
          toast(I18N[lang].copied + ': ' + text);
          setTimeout(function(){ chip.classList.remove('copied'); num.textContent = text; }, 1400);
        }).catch(function(){});
      });
    })(copyChips[cc]);
  }

  document.getElementById('copyLink').addEventListener('click', function(){
    var link = location.origin + '/';
    copyText(link).then(function(){ toast(I18N[lang].copied + ': ' + link); }).catch(function(){});
  });

  var gbDialog = document.getElementById('gbDialog');
  var btnGuestbook = document.getElementById('btnGuestbook');
  var gbList = document.getElementById('gbList');
  var gbForm = document.getElementById('gbForm');
  
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  
  function loadGb() {
    gbList.innerHTML = '<div style="text-align:center;color:gray">Loading...</div>';
    fetch('/api/guestbook').then(function(r){return r.json()}).then(function(msgs){
      gbList.innerHTML = msgs.length ? msgs.map(function(m){ return '<div class="gb-msg"><div class="gb-msg-name">' + esc(m.name) + '</div><div class="gb-msg-text">' + esc(m.text) + '</div></div>'}).join('') : '<div style="text-align:center;color:gray">No messages yet. Be the first!</div>';
    }).catch(function(){ gbList.innerHTML = 'Error loading messages.'; });
  }
  
  if (btnGuestbook && gbDialog) {
    btnGuestbook.addEventListener('click', function(e){
      e.preventDefault();
      loadGb();
      if (gbDialog.showModal) gbDialog.showModal(); else gbDialog.setAttribute('open', '');
    });
    document.getElementById('gbClose').addEventListener('click', function(){
      if (gbDialog.close) gbDialog.close(); else gbDialog.removeAttribute('open');
    });
    gbDialog.addEventListener('click', function(e){
      if (e.target === gbDialog) { if (gbDialog.close) gbDialog.close(); else gbDialog.removeAttribute('open'); }
    });
    
    gbForm.addEventListener('submit', function(e) {
      e.preventDefault();
      var btn = gbForm.querySelector('button');
      var name = document.getElementById('gbName').value;
      var text = document.getElementById('gbText').value;
      btn.disabled = true;
      fetch('/api/guestbook', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name: name, text: text})
      }).then(function(r){return r.json()}).then(function(res){
        if (res.error) { toast(res.error); btn.disabled = false; }
        else { unlock('guest'); document.getElementById('gbText').value = ''; loadGb(); btn.disabled = false; toast(lang === 'fa' ? 'پیام ثبت شد!' : 'Message added!'); }
      }).catch(function(){ toast('Failed to send.'); btn.disabled = false; });
    });
  }

  var donate = window.DONATE;
  function fmtT(n){ return Number(n || 0).toLocaleString('en-US'); }
  function countTo(node, to){
    if (reduce){ node.textContent = fmtT(to); return; }
    var from = parseInt((node.textContent || '0').replace(/,/g, ''), 10) || 0, start = null;
    function step(ts){
      if (start === null) start = ts;
      var p = Math.min(1, (ts - start) / 1200);
      node.textContent = fmtT(Math.round(from + (to - from) * easeOutExpo(p)));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  // support card: "X left to the goal" line
  function donateExtras(goal, cur){
    var el = document.getElementById('dremain');
    if (!el) return;
    if (!(goal > 0)) { el.hidden = true; return; }
    var left = goal - cur;
    el.hidden = false;
    if (left <= 0) el.textContent = lang === 'fa' ? 'هدف کامل شد 🎉' : 'Goal reached 🎉';
    else el.textContent = lang === 'fa' ? fmtT(left) + ' ' + I18N.fa.toman + ' تا هدف باقی مانده' : fmtT(left) + ' ' + I18N.en.toman + ' to go';
  }
  function renderDonate(){
    var goal = (donate && donate.goal) ? donate.goal : 0;
    var cur = (donate && donate.current) ? donate.current : 0;
    var name = (donate && (donate.title || donate.goal_name)) ? (donate.title || donate.goal_name) : null;
    
    if (name === SITE.text.fa.goalDefault || name === SITE.text.en.goalDefault) name = I18N[lang].goalDefault;
    var goalNameEl = document.getElementById('dgoalName');
    if (goalNameEl && name) {
      goalNameEl.textContent = name;
    }
    
    var tank = document.getElementById('tank');
    if (tank) tank.hidden = false;
    var dnums = document.getElementById('dnums');
    if (dnums) dnums.hidden = false;

    var pct = (donate && typeof donate.percent === 'number' && donate.percent > 0) ? donate.percent : (goal > 0 ? ((cur / goal) * 100) : 0);
    setTimeout(function(){
      var fill = document.getElementById('dfill');
      if (fill) fill.style.width = Math.min(100, Math.max(cur > 0 ? 1.5 : 0, pct)) + '%';
    }, 150);

    var dpct = document.getElementById('dpct');
    if (dpct) dpct.textContent = (pct > 0 && pct < 1 ? pct.toFixed(1) : Math.floor(pct)) + '%';
    if (tank) tank.setAttribute('aria-valuenow', Math.floor(pct));

    var dcur = document.getElementById('dcur');
    if (dcur) countTo(dcur, cur);
    var dgoal = document.getElementById('dgoal');
    if (dgoal) dgoal.textContent = fmtT(goal);

    var pod = document.getElementById('podium');
    var top = (donate && donate.top) ? donate.top.slice(0, 3) : [];
    var medals = ['👑', '🥈', '🥉'];
    if (pod) {
      pod.innerHTML = '';
      top.forEach(function(d, i){
        if (!d) return;
        var box = document.createElement('div');
        box.className = 'pod p' + (i + 1);
        var topRow = document.createElement('div');
        topRow.className = 'pod-top';
        var m = document.createElement('span');
        m.className = 'medal';
        m.textContent = medals[i] || '🎖️';
        topRow.appendChild(m);
        if (i === 0) {
          var badge = document.createElement('span');
          badge.className = 'crown-badge';
          badge.textContent = (I18N[lang] && I18N[lang].topDonor) ? I18N[lang].topDonor : (lang === 'fa' ? 'حامی طلایی 👑' : 'Top Supporter 👑');
          topRow.appendChild(badge);
        }
        var n = document.createElement('span');
        n.className = 'pn';
        n.textContent = (d.crypto ? '⚡ ' : '') + d.name;
        n.setAttribute('dir', 'auto');
        var a = document.createElement('span');
        a.className = 'pa';
        a.innerHTML = fmtT(d.amount) + ' <em class="tunit">' + I18N[lang].toman + '</em>';
        if (i === 0) {
          var sp = [['12%','18%','0s','.8rem'], ['86%','24%','.9s','1rem'], ['22%','78%','1.7s','.7rem'], ['78%','74%','.4s','.9rem'], ['50%','8%','1.3s','.75rem']];
          sp.forEach(function(q){
            var s1 = document.createElement('i');
            s1.className = 'spark';
            s1.textContent = '✦';
            s1.style.setProperty('--x', q[0]); s1.style.setProperty('--y', q[1]);
            s1.style.setProperty('--d', q[2]); s1.style.setProperty('--sz', q[3]);
            box.appendChild(s1);
          });
        }
        box.appendChild(topRow);
        box.appendChild(n);
        box.appendChild(a);
        pod.appendChild(box);
      });
      pod.hidden = !top.length;
    }

    var last = document.getElementById('dlast');
    if (last) {
      if (donate && donate.last && donate.last.name){
        last.hidden = false;
        var whoEl = last.querySelector('.who');
        if (whoEl) whoEl.textContent = (donate.last.crypto ? '⚡ ' : '') + donate.last.name;
        var amtEl = last.querySelector('.amt');
        if (amtEl) amtEl.innerHTML = fmtT(donate.last.amount) + ' <em class="tunit">' + I18N[lang].toman + '</em>';
      } else {
        last.hidden = true;
      }
    }

    var waiting = document.getElementById('dwaiting');
    var hasSupporters = (top.length > 0) || (donate && donate.last && donate.last.name);
    donateExtras(goal, cur);
    if (waiting) {
      waiting.hidden = Boolean(hasSupporters);
    }
  }
  function loadDonate(){
    viaBoot('donate', '/api/donate-stats').then(function(d){
      var prev = donate; donate = d; renderDonate();
      if (prev && d.current > prev.current) celebrate(prev, d);
    }).catch(function(){});
  }
  if (!off('donate')){
    renderDonate();
    loadDonate();
    setInterval(function(){ if (pollOk()) loadDonate(); }, 45000);
  }

  var qrDialog = document.getElementById('qrDialog');
  var qrOpen = document.getElementById('qrOpen');
  if (!qrDialog.querySelector('svg')) qrOpen.hidden = true;
  function closeQr(){ if (qrDialog.close) qrDialog.close(); else qrDialog.removeAttribute('open'); }
  qrOpen.addEventListener('click', function(){
    if (qrDialog.showModal) qrDialog.showModal(); else qrDialog.setAttribute('open', '');
  });
  document.getElementById('qrClose').addEventListener('click', closeQr);
  qrDialog.addEventListener('click', function(e){ if (e.target === qrDialog) closeQr(); });
  document.getElementById('qrSave').addEventListener('click', function(){
    var svg = qrDialog.querySelector('svg');
    if (!svg) return;
    var xml = new XMLSerializer().serializeToString(svg);
    var url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }));
    var a = document.createElement('a');
    a.href = url; a.download = 'qr-code.svg';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
  });

  // ── Terminal (press / or use the button) ──
  var termDialog = document.getElementById('termDialog');
  var termOut = document.getElementById('termOut');
  var termInput = document.getElementById('termInput');
  var termHistory = [], termHistIdx = 0, termBooted = false;
  var termStart = Date.now();

  function termLine(parts, cls){
    var div = document.createElement('div');
    div.className = 'tl' + (cls ? ' ' + cls : '');
    var arr = [].concat(parts);
    for (var i = 0; i < arr.length; i++){
      var p = arr[i];
      if (typeof p === 'string'){ div.appendChild(document.createTextNode(p)); continue; }
      var el = document.createElement(p.href ? 'a' : 'span');
      el.textContent = p.t;
      if (p.href){ el.href = p.href; el.target = '_blank'; el.rel = 'noopener'; }
      if (p.c) el.className = p.c;
      div.appendChild(el);
    }
    termOut.appendChild(div);
    termOut.scrollTop = termOut.scrollHeight;
    return div;
  }
  function pad(s, n){ s = String(s); while (s.length < n) s += ' '; return s; }
  function cut(s, n){ s = String(s); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  function num(n){ return typeof n === 'number' ? n.toLocaleString('en-US') : '—'; }

  var TERM_LINKS = SITE.links.map(function(l){ return [l.id, l.handle]; });
  var OPEN_TARGETS = SITE.links.map(function(l){ return l.id; }).concat(off('project') ? [] : ['project']);
  var TERM_ALIAS = { tg: 'telegram', yt: 'youtube', ig: 'instagram', gh: 'github' };
  var TERM_HELP = [
    ['help', 'show this list'], ['whoami', 'who is behind this page'], ['links', 'all my links'],
    ['stats', 'live numbers: members, subscribers, stars'], ['latest', 'latest YouTube videos'],
    ['posts', 'latest Telegram posts'], ['project', 'featured project'],
    ['open <name>', 'open a link: ' + OPEN_TARGETS.join(', ')],
    ['lang <fa|en>', 'switch language'], ['qr', 'show the QR code'], ['copy', 'copy the page link'],
    ['ipinfo [ip]', 'lookup IP info'], ['checkhost <url>', 'check if a host is up'],
    ['neofetch', 'system info'], ['clear', 'clear the screen'], ['exit', 'close the terminal']
  ];

  var TERM = {
    help: function(){
      termLine('Available commands', 'hl');
      for (var i = 0; i < TERM_HELP.length; i++) termLine(['  ', { t: pad(TERM_HELP[i][0], 17), c: 'ok' }, TERM_HELP[i][1]]);
      termLine('Tab completes, up/down browse history, Ctrl+L clears.', 'dim');
    },
    whoami: function(){
      termLine(SITE.name, 'ok');
      termLine(I18N[lang].desc);
    },
    links: function(){
      for (var i = 0; i < TERM_LINKS.length; i++) termLine(['  ', { t: pad(TERM_LINKS[i][0], 13), c: 'ok' }, { t: TERM_LINKS[i][1], href: '/go/' + TERM_LINKS[i][0] }]);
    },
    stats: function(){
      if (!statsData){ termLine('Still loading, try again in a second.', 'dim'); return; }
      termLine(['  ', { t: pad('telegram', 11), c: 'ok' }, num(statsData.telegram) + ' members']);
      termLine(['  ', { t: pad('youtube', 11), c: 'ok' }, num(statsData.youtube) + ' subscribers']);
      termLine(['  ', { t: pad('github', 11), c: 'ok' }, num(statsData.github) + ' stars']);
    },
    latest: function(){
      if (!videos.length){ termLine('No videos available right now.', 'dim'); return; }
      for (var i = 0; i < videos.length; i++){
        var v = videos[i];
        termLine([(i + 1) + '. ', { t: v.title, href: '/go/video?v=' + v.id }, v.duration > 0 ? '  [' + fmtDur(v.duration) + ']' : '']);
        var meta = [];
        if (typeof v.views === 'number') meta.push(num(v.views) + ' views');
        if (typeof v.likes === 'number') meta.push(num(v.likes) + ' likes');
        if (v.published) meta.push(relTime(v.published));
        termLine('   ' + meta.join(' · '), 'dim');
      }
    },
    posts: function(){
      if (!posts.length){ termLine('No posts available right now.', 'dim'); return; }
      for (var i = 0; i < posts.length; i++){
        termLine(['#' + posts[i].n + '  ', { t: cut(posts[i].text, 90), href: '/go/post?p=' + posts[i].n }]);
        termLine('     ' + [posts[i].date ? relTime(posts[i].date) : '', posts[i].views ? posts[i].views + ' views' : ''].filter(Boolean).join(' · '), 'dim');
      }
    },
    project: function(){
      if (!repo){ termLine('No project data available right now.', 'dim'); return; }
      termLine([{ t: repo.name, href: '/go/project', c: 'hl' }]);
      if (repo.description) termLine(repo.description);
      termLine([repo.language ? repo.language + ' · ' : '', num(repo.stars) + ' stars · ' + num(repo.forks) + ' forks' + (repo.pushed ? ' · updated ' + relTime(repo.pushed) : '')], 'dim');
    },
    open: function(args){
      var name = (args[0] || '').toLowerCase();
      name = TERM_ALIAS[name] || name;
      if (OPEN_TARGETS.indexOf(name) === -1){ termLine('usage: open <' + OPEN_TARGETS.join('|') + '>', 'err'); return; }
      termLine(['Opening ', { t: name, href: '/go/' + name }, ' …'], 'dim');
      try { window.open('/go/' + name, '_blank', 'noopener'); } catch (e) {}
    },
    lang: function(args){
      var l = (args[0] || '').toLowerCase();
      if (SITE.langs.indexOf(l) === -1){ termLine('usage: lang <' + SITE.langs.join('|') + '>', 'err'); return; }
      applyLang(l, true);
      termLine('language → ' + l, 'ok');
    },
    qr: function(){
      closeTerm();
      if (!document.getElementById('qrOpen').hidden) document.getElementById('qrOpen').click();
    },
    copy: function(){
      var link = location.origin + '/';
      copyText(link).then(function(){ termLine('copied: ' + link, 'ok'); }).catch(function(){ termLine('copy failed: your browser blocked clipboard access', 'err'); });
    },
    ipinfo: function(args) {
      var ip = args[0] || '';
      termLine(['Fetching IP info for ', {t: ip || 'your connection', c:'hl'}, '...'], 'dim');
      fetch('/api/network/ipinfo' + (ip ? '?ip=' + encodeURIComponent(ip) : ''))
        .then(function(r) { return r.json(); })
        .then(function(d) {
          if (d.error) return termLine('Error: ' + d.error, 'err');
          termLine(['IP     ', {t: d.ip, c:'ok'}]);
          termLine(['Loc    ', {t: d.country + (d.city !== 'Unknown' ? ' - ' + d.city : ''), c:'ok'}]);
          termLine(['ASN    ', {t: 'AS' + d.asn + ' (' + d.asOrganization + ')', c:'dim'}]);
        })
        .catch(function() { termLine('Failed to reach API.', 'err'); });
    },
    checkhost: function(args) {
      var host = args[0] || '';
      if (!host) return termLine('usage: checkhost <domain or url>', 'err');
      termLine(['Checking ', {t: host, c:'hl'}, ' from Cloudflare edge...'], 'dim');
      fetch('/api/network/checkhost?host=' + encodeURIComponent(host))
        .then(function(r) { return r.json(); })
        .then(function(d) {
          if (d.error) {
            termLine(['Failed ', {t: d.error, c:'err'}]);
            termLine('Time   ' + d.timeMs + 'ms', 'dim');
            return;
          }
          var ok = d.status >= 200 && d.status < 400;
          termLine(['Status ', {t: d.status + ' ' + d.statusText, c: ok ? 'ok' : 'err'}]);
          termLine(['Time   ', {t: d.timeMs + 'ms', c:'dim'}, ' · Server: ', {t: d.server, c:'dim'}]);
        })
        .catch(function() { termLine('Failed to reach API.', 'err'); });
    },
    neofetch: function(){
      var secs = Math.floor((Date.now() - termStart) / 1000);
      var rows = [
        ['OS', SITE.name + ' on Cloudflare Workers'], ['Host', location.host], ['Shell', 'zsh 1.0'],
        ['Telegram', statsData ? num(statsData.telegram) + ' members' : '…'],
        ['YouTube', statsData ? num(statsData.youtube) + ' subscribers' : '…'],
        ['GitHub', statsData ? num(statsData.github) + ' stars' : '…'],
        ['Language', lang], ['Uptime', secs + 's (this session)']
      ];
      termLine(SITE.user + '@pelak', 'hl');
      termLine('---------', 'dim');
      for (var i = 0; i < rows.length; i++) termLine([{ t: pad(rows[i][0], 10), c: 'ok' }, rows[i][1]]);
    },
    date: function(){ termLine(new Date().toString()); },
    echo: function(args){ termLine(args.join(' ')); },
    ls: function(){ termLine(OPEN_TARGETS.join('  ')); },
    cd: function(){ termLine('cd: nowhere to go, everything lives on one page.', 'dim'); },
    sudo: function(){ termLine(SITE.user + ' is not in the sudoers file. This incident will be reported (to nobody).', 'err'); },
    rm: function(){ termLine('rm: this is a link page, there is nothing here to delete. Nice try.', 'err'); },
    clear: function(){ termOut.innerHTML = ''; },
    exit: function(){ closeTerm(); }
  };

  function runTerm(raw){
    var line = raw.trim();
    termLine([{ t: '$ ', c: 'ok' }, { t: line, c: 'cmd' }]);
    if (!line) return;
    termHistory.push(line);
    termHistIdx = termHistory.length;
    var parts = line.split(/ +/);
    var name = parts[0].toLowerCase();
    if (Object.prototype.hasOwnProperty.call(TERM, name)){
      try { TERM[name](parts.slice(1)); } catch (e) { termLine('error: ' + e.message, 'err'); }
    } else {
      termLine(name + ': command not found. Type help.', 'err');
    }
  }

  function openTerm(){
    if (off('terminal')) return;
    unlock('terminal');
    if (termDialog.showModal){ if (!termDialog.hasAttribute('open')) termDialog.showModal(); }
    else termDialog.setAttribute('open', '');
    if (!termBooted){
      termBooted = true;
      termLine(SITE.name + ' shell 1.0', 'hl');
      termLine(['Type ', { t: 'help', c: 'ok' }, ' to see what I can do.'], 'dim');
    }
    setTimeout(function(){ termInput.focus(); }, 30);
  }
  function closeTerm(){
    if (termDialog.close) termDialog.close(); else termDialog.removeAttribute('open');
  }

  document.getElementById('termOpen').addEventListener('click', openTerm);
  document.getElementById('termClose').addEventListener('click', closeTerm);
  termDialog.addEventListener('click', function(e){ if (e.target === termDialog) closeTerm(); });
  document.getElementById('termForm').addEventListener('submit', function(e){
    e.preventDefault();
    playSound('enter');
    var v = termInput.value;
    termInput.value = '';
    runTerm(v);
  });
  termInput.addEventListener('keydown', function(e){
    if (e.key.length === 1 || e.key === 'Backspace') playSound('type');
    if (e.key === 'ArrowUp'){
      e.preventDefault();
      if (termHistIdx > 0) termHistIdx--;
      termInput.value = termHistory[termHistIdx] || '';
    } else if (e.key === 'ArrowDown'){
      e.preventDefault();
      if (termHistIdx < termHistory.length) termHistIdx++;
      termInput.value = termHistory[termHistIdx] || '';
    } else if (e.key === 'Tab'){
      e.preventDefault();
      var val = termInput.value;
      var sp = val.indexOf(' ');
      var pool, prefix, head;
      if (sp === -1){ pool = Object.keys(TERM); prefix = val.toLowerCase(); head = ''; }
      else {
        var cmd = val.slice(0, sp).toLowerCase();
        head = val.slice(0, sp + 1);
        prefix = val.slice(sp + 1).toLowerCase();
        pool = cmd === 'open' ? OPEN_TARGETS : cmd === 'lang' ? SITE.langs : [];
      }
      var hits = pool.filter(function(n){ return n.indexOf(prefix) === 0; });
      if (hits.length === 1) termInput.value = head + hits[0] + (sp === -1 ? ' ' : '');
      else if (hits.length > 1) termLine(hits.join('  '), 'dim');
    } else if (e.ctrlKey && (e.key === 'l' || e.key === 'L')){
      e.preventDefault();
      TERM.clear();
    } else if (e.ctrlKey && (e.key === 'c' || e.key === 'C')){
      e.preventDefault();
      termLine([{ t: '$ ', c: 'ok' }, termInput.value + '^C'], 'dim');
      termInput.value = '';
    }
  });
  document.addEventListener('keydown', function(e){
    if (off('terminal') || e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    var el = e.target, tag = el && el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (el && el.isContentEditable)) return;
    if (document.querySelector('dialog[open]')) return;
    e.preventDefault();
    openTerm();
  });

  function applyLang(next, animate){
    lang = next;
    var d = document.documentElement;
    d.lang = lang; d.dir = lang === 'fa' ? 'rtl' : 'ltr'; d.setAttribute('data-lang', lang);
    var dict = I18N[lang];

    var els = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < els.length; i++){
      var key = els[i].getAttribute('data-i18n');
      if (dict[key]) els[i].textContent = dict[key];
    }
    var meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', dict.desc);

    var liveChips = document.querySelectorAll('.chip.live');
    for (var j = 0; j < liveChips.length; j++){
      liveChips[j].querySelector('.unit').textContent = dict[liveChips[j].getAttribute('data-unit-key')];
    }

    var btns = document.querySelectorAll('[data-set-lang]');
    for (var k = 0; k < btns.length; k++){
      btns[k].setAttribute('aria-pressed', btns[k].getAttribute('data-set-lang') === lang ? 'true' : 'false');
    }

    renderTagline();
    renderVideo();
    renderPosts();
    renderProject(false);
    renderDonate();
    if (window.LZ_FEAT && window.LZ_FEAT.lang) window.LZ_FEAT.lang();
    if (animate){ try { localStorage.setItem('lang', lang); } catch (e) {} }
  }

  var langBtns = document.querySelectorAll('[data-set-lang]');
  for (var b = 0; b < langBtns.length; b++){
    langBtns[b].addEventListener('click', function(){
      var next = this.getAttribute('data-set-lang');
      if (next !== lang) applyLang(next, true);
    });
  }
  applyLang(lang, false);

  // ── Spotlight that follows the pointer inside each card ──
  var cards = document.querySelectorAll('.tile, .video, .posts, .project');
  for (var t = 0; t < cards.length; t++){
    (function(card){
      card.addEventListener('pointermove', function(e){
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    })(cards[t]);
  }

  // ── Logo 3D tilt: pointer on desktop, gyroscope on phones ──
  var mark = document.querySelector('.mark-wrap');
  if (mark && !reduce){
    var tilt = { x: 0, y: 0 }, cur = { x: 0, y: 0 }, gyroOn = false, gyroBase = null;
    var clamp = function(v, m){ return Math.max(-m, Math.min(m, v)); };
    window.addEventListener('pointermove', function(e){
      if (gyroOn) return;
      var r = mark.getBoundingClientRect();
      var dx = (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2);
      var dy = (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2);
      tilt.y = clamp(dx, 1) * 20;
      tilt.x = clamp(-dy, 1) * 20;
    });
    document.addEventListener('mouseleave', function(){ if (!gyroOn){ tilt.x = 0; tilt.y = 0; } });
    var onOrient = function(e){
      if (e.gamma === null || e.beta === null || e.gamma === undefined) return;
      if (!gyroBase) gyroBase = { b: e.beta, g: e.gamma }; // the pose you first hold the phone in = neutral
      gyroOn = true;
      tilt.y = clamp((e.gamma - gyroBase.g) * 0.7, 22);
      tilt.x = clamp(-(e.beta - gyroBase.b) * 0.7, 22);
    };
    var DOE = window.DeviceOrientationEvent;
    if (DOE && 'ontouchstart' in window){
      if (typeof DOE.requestPermission === 'function'){
        // iOS only allows the gyroscope after a tap: tap the logo once
        mark.addEventListener('click', function(){
          DOE.requestPermission().then(function(s){
            if (s === 'granted') window.addEventListener('deviceorientation', onOrient);
          }).catch(function(){});
        });
      } else {
        window.addEventListener('deviceorientation', onOrient);
      }
    }
    var lastX = 0, lastY = 0;
    var tiltLoop = function(){
      cur.x += (tilt.x - cur.x) * 0.12;
      cur.y += (tilt.y - cur.y) * 0.12;
      if (Math.abs(cur.x - lastX) > 0.005 || Math.abs(cur.y - lastY) > 0.005){
        lastX = cur.x; lastY = cur.y;
        mark.style.transform = 'perspective(520px) rotateX(' + cur.x.toFixed(2) + 'deg) rotateY(' + cur.y.toFixed(2) + 'deg)';
      }
      requestAnimationFrame(tiltLoop);
    };
    requestAnimationFrame(tiltLoop);
  }

  // ── Count-up ──
  function easeOutExpo(p){ return p >= 1 ? 1 : 1 - Math.pow(2, -10 * p); }
  function fmt(n){ return n.toLocaleString('en-US'); }

  function countUp(chip, to, delay){
    var num = chip.querySelector('.num');
    chip.querySelector('.unit').textContent = I18N[lang][chip.getAttribute('data-unit-key')];
    chip.classList.remove('loading');
    chip.classList.add('live');
    if (reduce || to === 0){ num.textContent = fmt(to); return; }
    chip.classList.add('counting');
    num.textContent = '0';
    var dur = 1800 + Math.min(1400, Math.log(to + 1) * 140);
    var start = null;
    function step(ts){
      if (start === null) start = ts;
      var p = Math.min(1, (ts - start) / dur);
      num.textContent = fmt(Math.round(to * easeOutExpo(p)));
      if (p < 1){ requestAnimationFrame(step); }
      else {
        chip.classList.remove('counting');
        chip.classList.add('done');
      }
    }
    setTimeout(function(){ requestAnimationFrame(step); }, delay);
  }

  var chips = document.querySelectorAll('.chip[data-stat]');
  function giveUp(){
    for (var i = 0; i < chips.length; i++) chips[i].classList.remove('loading');
    document.getElementById('video').classList.remove('loading');
  }

  viaBoot('stats', '/api/stats')
    .then(function(d){
      statsData = d;
      for (var i = 0; i < chips.length; i++){
        var chip = chips[i];
        var v = d[chip.getAttribute('data-stat')];
        if (typeof v === 'number' && v >= 0) countUp(chip, v, 200 + i * 140);
        else chip.classList.remove('loading');
      }
      if (d.videos && d.videos.length){
        videos = d.videos;
        vi = 0;
        buildDots();
        paintVideo(true);
        startSlideshow();
      } else {
        document.getElementById('video').hidden = true;
      }
      if (d.posts && d.posts.length){ posts = d.posts; renderPosts(); }
      if (d.repo && d.repo.name){ repo = d.repo; renderProject(true); }
    })
    .catch(function(){
      giveUp();
      document.getElementById('video').hidden = true;
    });

  // ═════════ Extra features: boot, greeting, time-of-day theme, achievements, connect effect,
  // ═════════ grid packets, magnetic cards, visitor card, matrix mode
  var isTouch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  function lsGet(k, d){ try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v){ try { localStorage.setItem(k, v); } catch (e) {} }
  function byId(id){ return document.getElementById(id); }

  // ── visits (counted once per browser session) ──
  var visits = parseInt(lsGet('lz_visits', '0'), 10) || 0;
  try {
    if (!sessionStorage.getItem('lz_s')) {
      visits++;
      lsSet('lz_visits', String(visits));
      sessionStorage.setItem('lz_s', '1');
      if (!lsGet('lz_first', '')) lsSet('lz_first', new Date().toISOString().slice(0, 10));
    }
  } catch (e) {}

  // ── who is visiting (country / time zone / edge), no IP ──
  var ME = null;
  function flagOf(cc){
    return /^[A-Z]{2}$/.test(cc || '') ? String.fromCodePoint(0x1f1e6 + cc.charCodeAt(0) - 65, 0x1f1e6 + cc.charCodeAt(1) - 65) : '🌍';
  }
  function countryName(cc){
    try { return new Intl.DisplayNames([lang], { type: 'region' }).of(cc) || cc; } catch (e) { return cc; }
  }
  function localTime(){
    try {
      var opt = { hour: '2-digit', minute: '2-digit', hour12: false };
      if (ME && ME.tz) opt.timeZone = ME.tz;
      return new Intl.DateTimeFormat(lang === 'fa' ? 'fa-IR-u-nu-latn' : 'en-GB', opt).format(new Date());
    } catch (e) { return ''; }
  }
  function renderGreet(){
    var g = byId('greet');
    if (!g) return;
    if (!ME || !ME.country){ g.hidden = true; return; }
    var t = localTime(), name = countryName(ME.country), flag = flagOf(ME.country), txt;
    if (lang === 'fa'){
      txt = ['سلام از ' + flag + ' ' + name + ' 👋', (t ? 'ساعت اونجا ' + t : ''), (visits >= 2 ? 'بار ' + visits + 'ام که میای 🔥' : 'خوش اومدی 🎉')];
    } else {
      txt = ['Hello from ' + flag + ' ' + name + ' 👋', (t ? 'it is ' + t + ' there' : ''), (visits >= 2 ? 'visit #' + visits + ' 🔥' : 'welcome 🎉')];
    }
    g.textContent = '';
    var dot = document.createElement('span'), gt = document.createElement('span');
    dot.className = 'gdot'; gt.className = 'gt';
    gt.textContent = txt[0] + (txt[1] ? ' · ' + txt[1] : '');
    g.title = txt[2];
    g.appendChild(dot); g.appendChild(gt);
    g.hidden = false;
  }
  viaBoot('me', '/api/me').then(function(j){
    ME = j;
    if (!lsGet('lz_no', '') && j.views > 0) lsSet('lz_no', String(j.views));
    renderGreet();
  }).catch(function(){});
  setInterval(renderGreet, 30000);

  // ── time-of-day accent colours (visitor's own clock) ──
  var TOD = {
    dawn:  { a1: [56, 189, 248], a2: [167, 139, 250] },
    day:   { a1: [47, 139, 255], a2: [34, 211, 238] },
    dusk:  { a1: [251, 146, 60],  a2: [236, 72, 153] },
    night: { a1: [47, 139, 255], a2: [139, 92, 246] }
  };
  function applyTod(){
    var h = new Date().getHours();
    var k = (h >= 5 && h < 10) ? 'dawn' : (h >= 10 && h < 17) ? 'day' : (h >= 17 && h < 21) ? 'dusk' : 'night';
    var p = SITE.accent || TOD[k], root = document.documentElement;
    root.style.setProperty('--accent-1', 'rgb(' + p.a1.join(',') + ')');
    root.style.setProperty('--accent-2', 'rgb(' + p.a2.join(',') + ')');
    root.setAttribute('data-tod', k);
    if (window.LZ_GRID) window.LZ_GRID.setTheme(p.a1, p.a2);
  }
  applyTod();
  setInterval(applyTod, 600000);

  // ── achievements ──
  var ACH = [
    { id: 'terminal', ic: '⌨️', fa: ['ترمینال‌باز', 'ترمینال رو باز کردی'], en: ['Terminal Jockey', 'You opened the terminal'] },
    { id: 'egg', ic: '🥚', fa: ['ایستراگ‌یاب', 'یه راز مخفی پیدا کردی'], en: ['Egg Hunter', 'You found a hidden secret'] },
    { id: 'guest', ic: '✍️', fa: ['یادگاری‌نویس', 'توی دفتر یادگاری پیام گذاشتی'], en: ['Guest Star', 'You signed the guestbook'] },
    { id: 'thrice', ic: '🔥', fa: ['همیشگی', 'سه بار سر زدی'], en: ['Regular', 'You visited three times'] },
    { id: 'explorer', ic: '🧭', fa: ['کاوشگر', 'سه تا لینک مختلف رو باز کردی'], en: ['Explorer', 'You opened three different links'] },
    { id: 'card', ic: '🪪', fa: ['کارت‌دار', 'کارت بازدیدکننده‌ات رو ساختی'], en: ['Card Holder', 'You made your visitor card'] },
    { id: 'supporter', ic: '💛', fa: ['حامی', 'روی حمایت کلیک کردی'], en: ['Supporter', 'You clicked support'] },
    { id: 'snake', ic: '🐍', fa: ['مارباز', 'توی اسنیک 5 امتیاز گرفتی'], en: ['Snake Charmer', 'You scored 5 in Snake'] },
    { id: 'tipper', ic: '💡', fa: ['نکته‌چین', 'یه دستور از نکتهٔ روز کپی کردی'], en: ['Tipster', 'You copied a tip command'] },
    { id: 'night', ic: '🦉', fa: ['جغد شب', 'نصفه‌شب سر زدی'], en: ['Night Owl', 'You visited in the middle of the night'] }
  ];
  var got = {};
  try { (JSON.parse(lsGet('lz_ach', '[]')) || []).forEach(function(id){ got[id] = 1; }); } catch (e) {}
  function achCount(){ return Object.keys(got).length; }
  function renderAch(){
    var prg = byId('achPrg');
    if (!prg) return;
    var C = 2 * Math.PI * 20;
    prg.style.strokeDasharray = String(C);
    prg.style.strokeDashoffset = String(C * (1 - achCount() / ACH.length));
    byId('achBtn').title = achCount() + '/' + ACH.length;
    byId('achCount').textContent = achCount() + '/' + ACH.length;
    var grid = byId('achGrid'), html = '';
    for (var i = 0; i < ACH.length; i++){
      var a = ACH[i], on = !!got[a.id];
      html += '<div class="ach-item' + (on ? ' on' : '') + '"><span class="ic">' + a.ic + '</span><span><b>' + a[lang][0] + '</b><small>' + a[lang][1] + '</small></span></div>';
    }
    grid.innerHTML = html;
  }
  function unlock(id){
    if (off('achievements')) return;
    if (got[id]) return;
    var a = null;
    for (var i = 0; i < ACH.length; i++) if (ACH[i].id === id) a = ACH[i];
    if (!a) return;
    got[id] = 1;
    lsSet('lz_ach', JSON.stringify(Object.keys(got)));
    renderAch();
    var btn = byId('achBtn');
    btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop');
    toast('🏆 ' + I18N[lang].achNew + ': ' + a[lang][0], 3200);
  }
  var clicked = {};
  try { (JSON.parse(lsGet('lz_clicked', '[]')) || []).forEach(function(n){ clicked[n] = 1; }); } catch (e) {}
  function noteClick(name){
    if (!name || clicked[name]) return;
    clicked[name] = 1;
    lsSet('lz_clicked', JSON.stringify(Object.keys(clicked)));
    if (Object.keys(clicked).length >= 3) unlock('explorer');
  }
  renderAch();
  setTimeout(function(){
    if (visits >= 3) unlock('thrice');
    var hr = new Date().getHours();
    if (hr >= 0 && hr < 5) unlock('night');
  }, 3200);

  var achDialog = byId('achDialog');
  function openDlg(d){ if (d.showModal){ if (!d.hasAttribute('open')) d.showModal(); } else d.setAttribute('open', ''); }
  function closeDlg(d){ if (d.close) d.close(); else d.removeAttribute('open'); }
  byId('achBtn').addEventListener('click', function(){ renderAch(); openDlg(achDialog); });
  byId('achClose').addEventListener('click', function(){ closeDlg(achDialog); });
  achDialog.addEventListener('click', function(e){ if (e.target === achDialog) closeDlg(achDialog); });
  var dbtns = document.querySelectorAll('.dbtn');
  for (var db = 0; db < dbtns.length; db++) dbtns[db].addEventListener('click', function(){ unlock('supporter'); });

  // ── boot sequence + decrypting title ──
  function decryptTitle(){
    var h = document.querySelector('h1');
    if (!h || reduce) return;
    var target = h.textContent, chars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789#%@', t0 = performance.now();
    h.setAttribute('aria-label', target);
    var tm = setInterval(function(){
      var t = performance.now() - t0, out = '';
      for (var i = 0; i < target.length; i++){
        var c = target.charAt(i);
        out += (c === ' ' || t > 350 + i * 85) ? c : chars.charAt(Math.floor(Math.random() * chars.length));
      }
      h.textContent = out;
      if (t > 350 + target.length * 85){ clearInterval(tm); h.textContent = target; }
    }, 45);
  }
  function safeTag(v){ return /^[A-Z0-9]{2,4}$/.test(v || '') ? v : ''; }
  function runBoot(){
    try { sessionStorage.setItem('lz_boot', '1'); } catch (e) {}
    var box = document.createElement('div');
    box.id = 'boot';
    box.innerHTML = '<div class="boot-box"><div class="boot-log" id="bootLog"></div><div class="boot-bar"><i id="bootBar"></i></div><button type="button" class="boot-skip" id="bootSkip">SKIP ›</button></div>';
    document.body.appendChild(box);
    var log = byId('bootLog'), bar = byId('bootBar');
    var OK = '[ <span class="ok">OK</span> ] ';
    var steps = [
      function(){ return '<span class="hl">' + esc(SITE.name) + '</span> bootloader v1.0'; },
      function(){ return OK + 'loaded kernel modules'; },
      function(){ return OK + 'mounted /dev/pelak'; },
      function(){ return OK + 'started network: tunnel0 up' + (ME && safeTag(ME.colo) ? ' via ' + safeTag(ME.colo) : ''); },
      function(){ return OK + 'resolving ' + esc(location.host) + (ME && safeTag(ME.country) ? ' for ' + safeTag(ME.country) : '') + ' ...'; },
      function(){ return OK + 'reached target: <span class="hl">welcome</span>'; }
    ];
    var i = 0, done = false, tm = null;
    function finish(){
      if (done) return;
      done = true;
      clearInterval(tm);
      bar.style.width = '100%';
      box.classList.add('out');
      document.documentElement.classList.remove('booting');
      decryptTitle();
      setTimeout(function(){ if (box.parentNode) box.parentNode.removeChild(box); }, 900);
    }
    tm = setInterval(function(){
      if (i < steps.length){
        var d = document.createElement('div');
        d.innerHTML = steps[i]();
        log.appendChild(d);
        i++;
        bar.style.width = Math.round(i / steps.length * 92) + '%';
      } else {
        finish();
      }
    }, 170);
    box.addEventListener('click', finish);
    document.addEventListener('keydown', function onKey(){ document.removeEventListener('keydown', onKey); finish(); });
  }
  if (document.documentElement.classList.contains('booting')) runBoot(); else decryptTitle();

  // ── "connecting…" effect when a link is clicked (desktop only) ──
  function nameOfHref(href){ return (String(href || '').slice(4).split('?')[0] || '').toLowerCase(); }
  var CONNECT_HOST = { project: 'github.com', video: 'youtube.com', post: 't.me', donate: 'donate', crypto: 'donate' };
  SITE.links.forEach(function(l){ CONNECT_HOST[l.id] = l.host; });
  var cfxEl = null, cfxBusy = false;
  function typeInto(box, text, speed, cls){
    var line = document.createElement('div');
    if (cls) line.className = cls;
    box.appendChild(line);
    var n = 0;
    var tm = setInterval(function(){
      n++;
      line.textContent = text.slice(0, n);
      if (n >= text.length) clearInterval(tm);
    }, speed);
  }
  function cssRgb(el){
    var v = '';
    try { v = getComputedStyle(el).getPropertyValue('--c').trim(); } catch (e) {}
    return /^[0-9, ]+$/.test(v) ? v.replace(/ /g, '') : '139,92,246';
  }
  function connectFX(card, url, name){
    if (cfxBusy) return;
    cfxBusy = true;
    if (!cfxEl){
      cfxEl = document.createElement('div');
      cfxEl.id = 'cfx';
      cfxEl.innerHTML = '<div class="cfx-box"><div class="cfx-bar"><i></i><i></i><i></i></div><div class="cfx-log"></div></div>';
      document.body.appendChild(cfxEl);
    }
    var cbox = cfxEl.querySelector('.cfx-box'), log = cfxEl.querySelector('.cfx-log');
    cbox.style.setProperty('--c', cssRgb(card));
    log.innerHTML = '';
    var host = CONNECT_HOST[name] || name;
    cfxEl.classList.add('show');
    card.classList.add('connecting');
    typeInto(log, '$ ssh ' + SITE.user + '@' + host, 12, 'c');
    setTimeout(function(){ typeInto(log, 'negotiating tunnel ........ ok', 8); }, 260);
    setTimeout(function(){ typeInto(log, 'connected > opening ' + name, 10, 'ok'); }, 520);
    setTimeout(function(){
      var win = null;
      try { win = window.open(url, '_blank'); if (win) win.opener = null; } catch (e) {}
      if (!win) location.href = url;
      setTimeout(function(){
        cfxEl.classList.remove('show');
        card.classList.remove('connecting');
        cfxBusy = false;
      }, 420);
    }, 800);
  }
  document.addEventListener('click', function(e){
    var a = e.target && e.target.closest ? e.target.closest('a[href^="/go/"]') : null;
    if (!a || a.closest('dialog')) return;
    var href = a.getAttribute('href'), name = nameOfHref(href);
    noteClick(name === 'video' || name === 'post' ? '' : name);
    if (reduce || isTouch || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    connectFX(a, new URL(href, location.href).href, name);
  });

  // ── magnetic cards ──
  var magTiles = document.querySelectorAll('.tile');
  for (var mg = 0; mg < magTiles.length; mg++){
    (function(card){
      card.addEventListener('pointermove', function(e){
        if (e.pointerType !== 'mouse' || reduce) return;
        var r = card.getBoundingClientRect();
        var nx = (e.clientX - r.left) / r.width * 2 - 1, ny = (e.clientY - r.top) / r.height * 2 - 1;
        card.style.setProperty('--tx', (nx * 6).toFixed(1) + 'px');
        card.style.setProperty('--ty', (ny * 5).toFixed(1) + 'px');
        card.style.setProperty('--rx', (-ny * 6).toFixed(1) + 'deg');
        card.style.setProperty('--ry', (nx * 7).toFixed(1) + 'deg');
        card.style.setProperty('--dx', nx.toFixed(2));
        card.style.setProperty('--dy', ny.toFixed(2));
      });
      card.addEventListener('pointerleave', function(){
        var keys = ['--tx', '--ty', '--rx', '--ry', '--dx', '--dy'];
        for (var k = 0; k < keys.length; k++) card.style.removeProperty(keys[k]);
      });
    })(magTiles[mg]);
  }

  // ── visitor card (image for stories) ──
  var cardDialog = byId('cardDialog'), cardCanvas = null;
  function svgToImage(svgEl){
    return new Promise(function(res){
      try {
        var x = new XMLSerializer().serializeToString(svgEl);
        if (x.indexOf('xmlns=') === -1) x = x.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
        var img = new Image();
        img.onload = function(){ res(img); };
        img.onerror = function(){ res(null); };
        setTimeout(function(){ res(null); }, 2500); // never hang the card if an image does not load
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(x);
      } catch (e) { res(null); }
    });
  }
  function roundRect(c, x, y, w, h, r){
    c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function drawCard(logo, qr){
    var W = 1080, H = 1920, cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var c = cv.getContext('2d'), fa = lang === 'fa';
    var no = lsGet('lz_no', '');
    c.fillStyle = '#07090d'; c.fillRect(0, 0, W, H);
    var g1 = c.createRadialGradient(200, 300, 0, 200, 300, 900);
    g1.addColorStop(0, 'rgba(47,139,255,0.38)'); g1.addColorStop(1, 'rgba(47,139,255,0)');
    c.fillStyle = g1; c.fillRect(0, 0, W, H);
    var g2 = c.createRadialGradient(900, 1500, 0, 900, 1500, 1000);
    g2.addColorStop(0, 'rgba(139,92,246,0.38)'); g2.addColorStop(1, 'rgba(139,92,246,0)');
    c.fillStyle = g2; c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(255,255,255,0.05)'; c.lineWidth = 1;
    for (var x = 0; x <= W; x += 60){ c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
    for (var y = 0; y <= H; y += 60){ c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }

    c.textAlign = 'center'; c.direction = 'ltr';
    if (logo){
      c.save(); c.shadowColor = 'rgba(47,139,255,0.7)'; c.shadowBlur = 60;
      c.drawImage(logo, (W - 230) / 2, 140, 230, 230); c.restore();
    }
    var tg = c.createLinearGradient(300, 0, 780, 0);
    tg.addColorStop(0, '#2f8bff'); tg.addColorStop(1, '#8b5cf6');
    c.fillStyle = tg; c.font = '700 124px Rajdhani, Vazirmatn, sans-serif';
    try { c.letterSpacing = '8px'; } catch (e) {}
    c.fillText(SITE.name, W / 2, 540, W - 140);
    c.fillStyle = '#8d97a3'; c.font = '500 30px "JetBrains Mono", monospace';
    try { c.letterSpacing = '6px'; } catch (e) {}
    c.fillText(SITE.cardSubtitle, W / 2, 604);
    try { c.letterSpacing = '0px'; } catch (e) {}

    roundRect(c, 90, 670, 900, 770, 48);
    c.fillStyle = 'rgba(255,255,255,0.05)'; c.fill();
    var bg = c.createLinearGradient(90, 670, 990, 1440);
    bg.addColorStop(0, 'rgba(47,139,255,0.9)'); bg.addColorStop(1, 'rgba(139,92,246,0.9)');
    c.strokeStyle = bg; c.lineWidth = 3; c.stroke();

    c.direction = fa ? 'rtl' : 'ltr';
    c.fillStyle = '#c9d1db'; c.font = '700 46px Vazirmatn, Inter, sans-serif';
    c.fillText(fa ? 'بازدیدکننده' : 'VISITOR', W / 2, 770);
    var ng = c.createLinearGradient(300, 800, 780, 960);
    ng.addColorStop(0, '#fde68a'); ng.addColorStop(1, '#f59e0b');
    c.direction = 'ltr'; c.fillStyle = ng; c.font = '800 190px "JetBrains Mono", monospace';
    c.fillText(no ? '#' + no : '#?', W / 2, 960);
    c.direction = fa ? 'rtl' : 'ltr';
    if (ME && ME.country){
      c.fillStyle = '#ffffff'; c.font = '600 48px Vazirmatn, Inter, sans-serif';
      c.fillText('🌍 ' + countryName(ME.country) + ' · ' + ME.country, W / 2, 1050);
    }
    c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(220, 1105); c.lineTo(860, 1105); c.stroke();
    c.fillStyle = '#c9d1db'; c.font = '500 40px Vazirmatn, Inter, sans-serif';
    var first = lsGet('lz_first', new Date().toISOString().slice(0, 10));
    c.fillText((fa ? 'اولین حضور: ' : 'First visit: ') + first, W / 2, 1180);
    c.fillText((fa ? 'تعداد دفعه‌های حضور: ' : 'Visits: ') + visits, W / 2, 1250);
    c.direction = 'ltr'; c.font = '56px sans-serif';
    var startX = W / 2 - (ACH.length - 1) * 45;
    for (var i = 0; i < ACH.length; i++){
      c.globalAlpha = got[ACH[i].id] ? 1 : 0.22;
      c.fillText(ACH[i].ic, startX + i * 90, 1350);
    }
    c.globalAlpha = 1;
    c.fillStyle = '#fabe58'; c.font = '700 34px "JetBrains Mono", monospace';
    c.fillText(achCount() + ' / ' + ACH.length + (fa ? '  🏆' : '  BADGES'), W / 2, 1412);

    if (qr){
      roundRect(c, (W - 300) / 2, 1490, 300, 300, 28); c.fillStyle = '#ffffff'; c.fill();
      c.drawImage(qr, (W - 300) / 2 + 20, 1510, 260, 260);
    }
    c.fillStyle = '#ffffff'; c.font = '700 40px "JetBrains Mono", monospace';
    c.fillText(location.host, W / 2, 1850);
    c.fillStyle = '#8d97a3'; c.font = '500 26px "JetBrains Mono", monospace';
    c.fillText(SITE.signature, W / 2, 1895, W - 120);
    return cv;
  }
  function buildCard(){
    var fontsReady = (document.fonts && document.fonts.load)
      ? Promise.all([document.fonts.load('700 100px Rajdhani', 'ABC'), document.fonts.load('700 60px Vazirmatn', 'ا'), document.fonts.load('800 120px "JetBrains Mono"', '0')]).catch(function(){})
      : Promise.resolve();
    var logoEl = document.querySelector('.mark-wrap img') || document.querySelector('.mark-wrap svg');
    var logoP = !logoEl ? Promise.resolve(null) : (logoEl.tagName.toLowerCase() === 'img' ? Promise.resolve(logoEl) : svgToImage(logoEl));
    var qrEl = document.querySelector('#qrDialog svg');
    var qrP = qrEl ? svgToImage(qrEl) : Promise.resolve(null);
    return Promise.all([fontsReady, logoP, qrP]).then(function(r){ return drawCard(r[1], r[2]); });
  }
  function openCard(){
    var body = byId('cardBody');
    body.innerHTML = '<div class="card-msg">' + I18N[lang].cardMaking + '</div>';
    openDlg(cardDialog);
    buildCard().then(function(cv){
      cardCanvas = cv;
      var img = new Image();
      img.alt = SITE.name + ' visitor card';
      img.src = cv.toDataURL('image/png');
      body.innerHTML = '';
      body.appendChild(img);
      unlock('card');
    }).catch(function(){ body.innerHTML = '<div class="card-msg">' + I18N[lang].cardErr + '</div>'; });
  }
  function cardBlob(cb){ if (cardCanvas) cardCanvas.toBlob(cb, 'image/png'); }
  byId('cardOpen').addEventListener('click', openCard);
  byId('cardClose').addEventListener('click', function(){ closeDlg(cardDialog); });
  cardDialog.addEventListener('click', function(e){ if (e.target === cardDialog) closeDlg(cardDialog); });
  byId('cardDl').addEventListener('click', function(){
    cardBlob(function(blob){
      if (!blob) return;
      var url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = 'visitor-card.png';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function(){ URL.revokeObjectURL(url); }, 1500);
    });
  });
  if (navigator.share){
    byId('cardShare').hidden = false;
    byId('cardShare').addEventListener('click', function(){
      cardBlob(function(blob){
        if (!blob) return;
        var file = new File([blob], 'visitor-card.png', { type: 'image/png' });
        var data = { files: [file], title: SITE.name, url: location.origin + '/' };
        if (navigator.canShare && !navigator.canShare(data)) data = { title: SITE.name, url: location.origin + '/' };
        navigator.share(data).catch(function(){});
      });
    });
  }

  // ── matrix mode (terminal: matrix, or the Konami code) ──
  var mxEl = null, mxRaf = 0, mxBuf = '';
  var MX_WORDS = ['sudo', 'ping', 'ssh', 'grep', 'chmod', 'iptables', 'dig', 'curl', 'systemctl', 'ip a', 'nmap', 'tcpdump', 'awk', 'kill -9', 'apt update', 'wireguard', 'tunnel', 'dns', 'root', 'ls -la'];
  function stopMatrix(){
    if (!mxEl) return;
    cancelAnimationFrame(mxRaf);
    var el0 = mxEl;
    mxEl = null; mxBuf = '';
    el0.classList.remove('show');
    setTimeout(function(){ if (el0.parentNode) el0.parentNode.removeChild(el0); }, 600);
  }
  function startMatrix(){
    if (mxEl) return;
    unlock('egg');
    if (termDialog.hasAttribute('open')) closeTerm();
    mxEl = document.createElement('div');
    mxEl.id = 'matrix';
    mxEl.innerHTML = '<canvas></canvas><div class="mx-top"><span id="mxMsg"></span><button type="button" id="mxExit">exit ✕</button></div>';
    document.body.appendChild(mxEl);
    requestAnimationFrame(function(){ if (mxEl) mxEl.classList.add('show'); });
    byId('mxExit').addEventListener('click', stopMatrix);
    var msg = 'Wake up, user... type exit or press Esc', mi = 0;
    var mt = setInterval(function(){ mi++; var m = byId('mxMsg'); if (!m){ clearInterval(mt); return; } m.textContent = msg.slice(0, mi); if (mi >= msg.length) clearInterval(mt); }, 55);
    var cv = mxEl.querySelector('canvas'), c = cv.getContext('2d');
    var fs = 18, dpr = Math.min(window.devicePixelRatio || 1, 2), w = 0, h = 0, streams = [];
    var mouse = { x: -999, y: -999 }, last = performance.now();
    function pick(){ return MX_WORDS[Math.floor(Math.random() * MX_WORDS.length)] + ' ' + MX_WORDS[Math.floor(Math.random() * MX_WORDS.length)] + '  '; }
    function size(){
      w = window.innerWidth; h = window.innerHeight;
      cv.width = w * dpr; cv.height = h * dpr; c.setTransform(dpr, 0, 0, dpr, 0, 0);
      streams = [];
      for (var i = 0; i < Math.ceil(w / fs); i++) streams.push({ y: -Math.random() * h, v: 70 + Math.random() * 190, len: 10 + Math.floor(Math.random() * 18), s: pick(), off: Math.floor(Math.random() * 40) });
    }
    size();
    window.addEventListener('resize', size);
    mxEl.addEventListener('pointermove', function(e){ mouse.x = e.clientX; mouse.y = e.clientY; });
    mxEl.addEventListener('touchmove', function(e){ if (e.touches[0]){ mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY; } }, { passive: true });
    function frame(now){
      if (!mxEl){ window.removeEventListener('resize', size); return; }
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      c.clearRect(0, 0, w, h);
      c.font = '700 16px "JetBrains Mono", monospace';
      c.textAlign = 'center';
      var R = 150;
      for (var i = 0; i < streams.length; i++){
        var s = streams[i], bx = i * fs + fs / 2;
        s.y += s.v * dt;
        if (s.y - s.len * fs > h){ s.y = -Math.random() * 200; s.s = pick(); s.v = 70 + Math.random() * 190; }
        for (var k = 0; k < s.len; k++){
          var gy = s.y - k * fs;
          if (gy < -fs || gy > h + fs) continue;
          var row = Math.floor(gy / fs) + s.off, idx = ((row % s.s.length) + s.s.length) % s.s.length;
          var ch = s.s.charAt(idx);
          if (ch === ' ') continue;
          var dx = bx - mouse.x, dy = gy - mouse.y, d = Math.sqrt(dx * dx + dy * dy), x = bx;
          if (d < R) x += (dx >= 0 ? 1 : -1) * Math.pow(1 - d / R, 2) * 70;
          c.fillStyle = k === 0 ? '#eafff0' : 'rgba(53,255,122,' + ((1 - k / s.len) * 0.85).toFixed(3) + ')';
          c.fillText(ch, x, gy);
        }
      }
      mxRaf = requestAnimationFrame(frame);
    }
    mxRaf = requestAnimationFrame(frame);
  }
  var KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'], kpos = 0;
  document.addEventListener('keydown', function(e){
    var key = String(e.key || '').toLowerCase();
    if (mxEl){
      if (key === 'escape') { stopMatrix(); return; }
      if (key.length === 1){ mxBuf = (mxBuf + key).slice(-4); if (mxBuf === 'exit') stopMatrix(); }
      return;
    }
    if (document.querySelector('dialog[open]')) { kpos = 0; return; }
    if (key === KONAMI[kpos]){ kpos++; if (kpos === KONAMI.length){ kpos = 0; startMatrix(); } }
    else kpos = key === KONAMI[0] ? 1 : 0;
  });

  // ── new terminal commands ──
  TERM_HELP.splice(TERM_HELP.length - 2, 0,
    ['badges', 'your achievements'],
    ['card', 'make your visitor card'], ['matrix', 'follow the white rabbit']);
  TERM.matrix = function(){ termLine('Wake up, user…', 'ok'); setTimeout(startMatrix, 350); };
  TERM.card = function(){ closeTerm(); openCard(); };
  TERM.badges = function(){
    for (var i = 0; i < ACH.length; i++){
      var a = ACH[i], on = !!got[a.id];
      termLine([{ t: on ? '[x] ' : '[ ] ', c: on ? 'ok' : 'dim' }, a.ic + ' ' + a[lang][0] + (on ? '' : '   (' + a[lang][1] + ')')]);
    }
    termLine(achCount() + '/' + ACH.length, 'hl');
  };
  var _sudo = TERM.sudo, _rm = TERM.rm;
  TERM.sudo = function(a){ _sudo(a); unlock('egg'); };
  TERM.rm = function(a){ _rm(a); unlock('egg'); };


  // ── visitors globe + flat map ──
  var MAPD = window.MAP_DATA;
  var MAP_HUB = SITE.hub; // hubCountry in site.config.js
  var D2R = Math.PI / 180;
  var mapGrid = [], mapCenter = {}, codeCells = {};
  var cellN = 0, cX = [], cY = [], cZ = [], cCol = [], cRow = [], cCode = [];
  (function(){
    var r, t, k, rr, cc;
    for (r = 0; r < MAPD.rle.length; r++){
      var row = [], toks = MAPD.rle[r].split(',');
      for (t = 0; t < toks.length; t++){
        var p = toks[t].split(':'), n = parseInt(p[0], 10), v = parseInt(p[1], 10);
        for (k = 0; k < n; k++) row.push(v);
      }
      mapGrid.push(row);
    }
    for (rr = 0; rr < mapGrid.length; rr++){
      for (cc = 0; cc < mapGrid[rr].length; cc++){
        var v2 = mapGrid[rr][cc];
        if (!v2) continue;
        var code = MAPD.codes[v2 - 1];
        var lon = (-180 + MAPD.step * (cc + 0.5)) * D2R, lat = (MAPD.lat0 - MAPD.step * (rr + 0.5)) * D2R;
        var idx = cX.length;
        cX.push(Math.cos(lat) * Math.sin(lon)); cY.push(Math.sin(lat)); cZ.push(Math.cos(lat) * Math.cos(lon));
        cCol.push(cc); cRow.push(rr); cCode.push(code);
        (codeCells[code] = codeCells[code] || []).push(idx);
      }
    }
    Object.keys(codeCells).forEach(function(code){
      var cells = codeCells[code], ax = 0, ay = 0, i;
      for (i = 0; i < cells.length; i++){ ax += cCol[cells[i]]; ay += cRow[cells[i]]; }
      ax /= cells.length; ay /= cells.length;
      var best = cells[0], bd = 1e9;
      for (i = 0; i < cells.length; i++){
        var d = (cCol[cells[i]] - ax) * (cCol[cells[i]] - ax) + (cRow[cells[i]] - ay) * (cRow[cells[i]] - ay);
        if (d < bd){ bd = d; best = cells[i]; }
      }
      mapCenter[code] = best;
    });
    cellN = cX.length;
    cX = new Float32Array(cX); cY = new Float32Array(cY); cZ = new Float32Array(cZ);
  })();
  var cInt = new Float32Array(cellN), cRgb = new Uint8Array(cellN * 3), cCos = new Float32Array(cellN);
  for (var ci0 = 0; ci0 < cellN; ci0++) cCos[ci0] = Math.sqrt(Math.max(0, 1 - cY[ci0] * cY[ci0])); // cells get closer together near the poles
  function vecOf(code){ var i = mapCenter[code]; return i === undefined ? null : [cX[i], cY[i], cZ[i]]; }

  var wcv = byId('wcv'), wctx = wcv.getContext('2d'), wbox = byId('wcanvasBox'), wmapEl = byId('wmap'), wtip = byId('wtip');
  var mapMode = lsGet('lz_map', 'globe') === 'flat' ? 'flat' : 'globe';
  var geo = { countries: {}, week: {}, visits: 0 }, geoPrev = null, wmax = 1;
  var wsz = { w: 0, h: 0, cs: 1 }, wvisible = true, lastT = 0, wspawn = 0, hubPulse = -9999;
  var gl = { yaw: 0.9, pitch: 0.3, vyaw: 0, lastDrag: 0, to: null, inited: false };
  var ripples = [], arcs = {}, feed = [], wdrag = null, wtipTimer = null;
  var ARC_N = 44, AX = new Float32Array(ARC_N), AY = new Float32Array(ARC_N), AZ = new Float32Array(ARC_N);
  var STARS = [], VIS = new Uint32Array(cellN);
  for (var si = 0; si < 70; si++) STARS.push([Math.random(), Math.random(), Math.random()]);
  var LAND = [];
  for (var lb = 0; lb < 6; lb++) LAND.push('rgba(150,185,255,' + (0.05 + lb * 0.045).toFixed(3) + ')');

  function wrapPi(a){ a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; }
  function mapMix(t){
    var a = [47, 139, 255], b = [139, 92, 246], c = [250, 190, 88], u, x, y;
    if (t < 0.5){ u = t / 0.5; x = a; y = b; } else { u = (t - 0.5) / 0.5; x = b; y = c; }
    return [Math.round(x[0] + (y[0] - x[0]) * u), Math.round(x[1] + (y[1] - x[1]) * u), Math.round(x[2] + (y[2] - x[2]) * u)];
  }
  function makePackets(rank, own){
    var n = own ? 2 : (rank < 4 ? 2 : 1), list = [];
    for (var i = 0; i < n; i++) list.push({ t: Math.random(), v: 0.16 + Math.random() * 0.14 });
    return list;
  }
  function buildArcs(){
    var old = arcs;
    arcs = {};
    var hub = vecOf(MAP_HUB);
    if (!hub) return;
    var keys = Object.keys(geo.countries).filter(function(c){ return c !== MAP_HUB; })
      .sort(function(a, b){ return geo.countries[b] - geo.countries[a]; }).slice(0, 14);
    if (ME && ME.country && ME.country !== MAP_HUB && keys.indexOf(ME.country) === -1 && vecOf(ME.country)) keys.push(ME.country);
    var lg = Math.log(1 + wmax);
    keys.forEach(function(code, rank){
      var a = vecOf(code);
      if (!a) return;
      var dot = Math.max(-1, Math.min(1, a[0] * hub[0] + a[1] * hub[1] + a[2] * hub[2])), om = Math.acos(dot), so = Math.sin(om);
      if (om < 0.05 || so < 0.05) return;
      var pts = new Float32Array(ARC_N * 3);
      for (var i = 0; i < ARC_N; i++){
        var t = i / (ARC_N - 1), s0 = Math.sin((1 - t) * om) / so, s1 = Math.sin(t * om) / so;
        var lift = 1 + (0.10 + 0.30 * om / Math.PI) * Math.sin(Math.PI * t);
        pts[i * 3] = (a[0] * s0 + hub[0] * s1) * lift; pts[i * 3 + 1] = (a[1] * s0 + hub[1] * s1) * lift; pts[i * 3 + 2] = (a[2] * s0 + hub[2] * s1) * lift;
      }
      var own = !!(ME && ME.country === code), n = geo.countries[code] || 1, tt = Math.log(1 + n) / lg;
      arcs[code] = { pts: pts, own: own, tt: tt, rgb: own ? [250, 190, 88] : mapMix(Math.max(0.2, tt)), packets: (old[code] && old[code].packets) || makePackets(rank, own) };
    });
  }
  function applyGeo(){
    var keys = Object.keys(geo.countries), i;
    wmax = 1;
    keys.forEach(function(k){ if (geo.countries[k] > wmax) wmax = geo.countries[k]; });
    var lg = Math.log(1 + wmax);
    cInt.fill(0);
    keys.forEach(function(code){
      var cells = codeCells[code];
      if (!cells) return;
      var t = Math.max(0.14, Math.log(1 + geo.countries[code]) / lg), col = mapMix(t);
      for (i = 0; i < cells.length; i++){
        cInt[cells[i]] = t;
        cRgb[cells[i] * 3] = col[0]; cRgb[cells[i] * 3 + 1] = col[1]; cRgb[cells[i] * 3 + 2] = col[2];
      }
    });
    buildArcs();
    mapRender();
  }

  function mapResize(){
    var r = wbox.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    wcv.width = Math.max(10, Math.round(r.width * dpr)); wcv.height = Math.max(10, Math.round(r.height * dpr));
    wctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    wsz.w = r.width; wsz.h = r.height; wsz.cs = r.width / MAPD.cols;
    mapDraw(performance.now());
  }
  function addRipple(code, size, rgb){
    if (mapCenter[code] === undefined) return;
    ripples.push({ code: code, born: performance.now(), life: 1900, size: size, rgb: rgb || '90,160,255' });
  }
  function mapPulse(code){
    addRipple(code, 16, '250,190,88');
    setTimeout(function(){ addRipple(code, 24, '255,255,255'); }, 220);
    if (arcs[code]) arcs[code].packets.push({ t: 0, v: 0.55, once: true });
  }
  function rotateTo(code){
    var i = mapCenter[code];
    if (i === undefined) return;
    var lon = (-180 + MAPD.step * (cCol[i] + 0.5)) * D2R, lat = (MAPD.lat0 - MAPD.step * (cRow[i] + 0.5)) * D2R;
    gl.to = { yaw: lon, pitch: Math.max(-0.9, Math.min(0.9, lat)) };
    mapPulse(code);
  }

  function labelPill(c, x, y, text, rgb){
    c.font = '700 11px "JetBrains Mono", monospace';
    var w = c.measureText(text).width + 14;
    c.fillStyle = 'rgba(6,9,16,0.78)'; c.beginPath(); c.roundRect ? c.roundRect(x - w / 2, y - 9, w, 18, 9) : c.rect(x - w / 2, y - 9, w, 18); c.fill();
    c.strokeStyle = 'rgba(' + rgb + ',0.7)'; c.lineWidth = 1; c.stroke();
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, x, y + 0.5);
  }
  function updatePackets(a, dt, now, drawFn){
    for (var i = a.packets.length - 1; i >= 0; i--){
      var p = a.packets[i];
      p.t += p.v * dt;
      if (p.t >= 1){ hubPulse = now; if (p.once){ a.packets.splice(i, 1); continue; } p.t = 0; }
      drawFn(p.t, i);
    }
  }

  function globeDraw(now, dt){
    var w = wsz.w, h = wsz.h, R = Math.min(w, h) * 0.43, cx = w / 2, cy = h / 2, c = wctx, i, j, k;
    if (!w) return;
    // view: easing to a target, drag inertia, slow auto-rotation
    if (gl.to){
      var dy = wrapPi(gl.to.yaw - gl.yaw), dp = gl.to.pitch - gl.pitch, f = Math.min(1, dt * 4);
      gl.yaw += dy * f; gl.pitch += dp * f;
      if (Math.abs(dy) < 0.01 && Math.abs(dp) < 0.01) gl.to = null;
    } else if (!wdrag){
      gl.yaw += gl.vyaw * dt; gl.vyaw *= Math.exp(-2.8 * dt);
      if (!reduce && now - gl.lastDrag > 2200 && Math.abs(gl.vyaw) < 0.05) gl.yaw += 0.14 * dt;
    }
    gl.yaw = wrapPi(gl.yaw);
    var cT = Math.cos(gl.yaw), sT = Math.sin(gl.yaw), cP = Math.cos(gl.pitch), sP = Math.sin(gl.pitch), ox = 0, oy = 0, oz = 0;
    function rot(X, Y, Z){ var x1 = X * cT - Z * sT, z1 = X * sT + Z * cT; ox = cx + R * x1; oy = cy - R * (Y * cP - z1 * sP); oz = Y * sP + z1 * cP; }

    c.clearRect(0, 0, w, h);
    for (i = 0; i < STARS.length; i++){
      c.globalAlpha = 0.12 + 0.32 * STARS[i][2] * (0.6 + 0.4 * Math.sin(now / 900 + STARS[i][2] * 40));
      c.fillStyle = '#cfe0ff'; c.fillRect(STARS[i][0] * w, STARS[i][1] * h, 1.2, 1.2);
    }
    c.globalAlpha = 1;
    var ag = c.createRadialGradient(cx, cy, R * 0.94, cx, cy, R * 1.32);
    ag.addColorStop(0, 'rgba(70,140,255,0.30)'); ag.addColorStop(1, 'rgba(70,140,255,0)');
    c.fillStyle = ag; c.beginPath(); c.arc(cx, cy, R * 1.32, 0, Math.PI * 2); c.fill();
    var sg = c.createRadialGradient(cx - R * 0.38, cy - R * 0.42, R * 0.05, cx, cy, R * 1.02);
    sg.addColorStop(0, 'rgba(44,72,140,0.62)'); sg.addColorStop(0.6, 'rgba(14,24,52,0.86)'); sg.addColorStop(1, 'rgba(6,9,20,0.96)');
    c.fillStyle = sg; c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(130,180,255,0.38)'; c.lineWidth = 1.2; c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.stroke();

    // graticule
    c.strokeStyle = 'rgba(120,170,255,0.10)'; c.lineWidth = 0.8; c.beginPath();
    var pen, la, lo, lonD, latD;
    for (lonD = -180; lonD < 180; lonD += 30){
      pen = false;
      for (latD = -90; latD <= 90; latD += 6){
        la = latD * D2R; lo = lonD * D2R;
        rot(Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo));
        if (oz > 0){ if (!pen){ c.moveTo(ox, oy); pen = true; } else c.lineTo(ox, oy); } else pen = false;
      }
    }
    for (latD = -60; latD <= 60; latD += 30){
      pen = false;
      for (lonD = -180; lonD <= 180; lonD += 6){
        la = latD * D2R; lo = lonD * D2R;
        rot(Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo));
        if (oz > 0){ if (!pen){ c.moveTo(ox, oy); pen = true; } else c.lineTo(ox, oy); } else pen = false;
      }
    }
    c.stroke();

    // land: faint dots for every country, glowing ones for countries that have visitors
    var cellPx = R * MAPD.step * D2R, lp = [new Path2D(), new Path2D(), new Path2D(), new Path2D(), new Path2D(), new Path2D()], vn = 0;
    for (i = 0; i < cellN; i++){
      var X = cX[i], Y = cY[i], Z = cZ[i], x1 = X * cT - Z * sT, z1 = X * sT + Z * cT, z2 = Y * sP + z1 * cP;
      if (z2 <= 0.03) continue;
      if (cInt[i] !== 0){ VIS[vn++] = i; continue; }
      var s = cellPx * (0.40 + 0.46 * z2) * (0.5 + 0.5 * cCos[i]);
      lp[Math.min(5, Math.floor(z2 * 6))].rect(cx + R * x1 - s / 2, cy - R * (Y * cP - z1 * sP) - s / 2, s, s);
    }
    for (k = 0; k < 6; k++){ c.fillStyle = LAND[k]; c.fill(lp[k]); }
    for (j = 0; j < vn; j++){
      i = VIS[j];
      X = cX[i]; Y = cY[i]; Z = cZ[i]; x1 = X * cT - Z * sT; z1 = X * sT + Z * cT; z2 = Y * sP + z1 * cP;
      var sx = cx + R * x1, sy = cy - R * (Y * cP - z1 * sP), t = cInt[i];
      {
        var tw = 0.8 + 0.2 * Math.sin(now / 650 + cCol[i] * 7 + cRow[i] * 13);
        c.fillStyle = 'rgba(' + cRgb[i * 3] + ',' + cRgb[i * 3 + 1] + ',' + cRgb[i * 3 + 2] + ',' + (Math.min(1, (0.42 + 0.58 * t) * (0.5 + 0.5 * z2) * tw)).toFixed(3) + ')';
        c.beginPath(); c.arc(sx, sy, cellPx * (0.32 + 0.28 * t) * (0.55 + 0.45 * z2) * (0.55 + 0.45 * cCos[i]), 0, Math.PI * 2); c.fill();
      }
    }

    // arcs to the hub + packets flying along them
    Object.keys(arcs).forEach(function(code){
      var a = arcs[code], pts = a.pts, rgb = a.rgb;
      for (j = 0; j < ARC_N; j++){ rot(pts[j * 3], pts[j * 3 + 1], pts[j * 3 + 2]); AX[j] = ox; AY[j] = oy; AZ[j] = oz; }
      c.lineWidth = a.own ? 1.8 : 0.9 + 0.9 * a.tt;
      for (j = 0; j < ARC_N - 1; j++){
        var zz = (AZ[j] + AZ[j + 1]) / 2;
        if (zz <= 0) continue;
        c.strokeStyle = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + ((a.own ? 0.8 : 0.16 + 0.42 * a.tt) * Math.min(1, zz * 2.2)).toFixed(3) + ')';
        c.beginPath(); c.moveTo(AX[j], AY[j]); c.lineTo(AX[j + 1], AY[j + 1]); c.stroke();
      }
      updatePackets(a, dt, now, function(pt){
        for (var q = 5; q >= 0; q--){
          var tq = pt - q * 0.022;
          if (tq < 0) continue;
          var fidx = tq * (ARC_N - 1), i0 = Math.floor(fidx), i1 = Math.min(ARC_N - 1, i0 + 1), fr = fidx - i0;
          var px = AX[i0] + (AX[i1] - AX[i0]) * fr, py = AY[i0] + (AY[i1] - AY[i0]) * fr, pz = AZ[i0] + (AZ[i1] - AZ[i0]) * fr;
          if (pz <= 0) continue;
          if (q === 0){
            c.fillStyle = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0.18)'; c.beginPath(); c.arc(px, py, 9, 0, Math.PI * 2); c.fill();
            c.fillStyle = '#ffffff';
          } else c.fillStyle = 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + ((1 - q / 6) * 0.7).toFixed(3) + ')';
          c.beginPath(); c.arc(px, py, q === 0 ? 2.6 : 2.1 - q * 0.2, 0, Math.PI * 2); c.fill();
        }
      });
    });

    // ripples on the surface (small circles around a country)
    for (i = ripples.length - 1; i >= 0; i--){
      var rp = ripples[i], age = (now - rp.born) / rp.life, v = vecOf(rp.code);
      if (age >= 1 || !v){ ripples.splice(i, 1); continue; }
      var d = age * (0.12 + rp.size * 0.012), sd = Math.sin(d), cd = Math.cos(d);
      var upv = Math.abs(v[1]) > 0.95 ? [1, 0, 0] : [0, 1, 0];
      var ux = v[1] * upv[2] - v[2] * upv[1], uy = v[2] * upv[0] - v[0] * upv[2], uz = v[0] * upv[1] - v[1] * upv[0], ul = Math.sqrt(ux * ux + uy * uy + uz * uz);
      ux /= ul; uy /= ul; uz /= ul;
      var vx = v[1] * uz - v[2] * uy, vy = v[2] * ux - v[0] * uz, vz = v[0] * uy - v[1] * ux;
      c.strokeStyle = 'rgba(' + rp.rgb + ',' + ((1 - age) * 0.85).toFixed(3) + ')'; c.lineWidth = 1.5; c.beginPath(); pen = false;
      for (k = 0; k <= 48; k++){
        var an = k / 48 * Math.PI * 2, ca = Math.cos(an), sa = Math.sin(an);
        rot(v[0] * cd + (ux * ca + vx * sa) * sd, v[1] * cd + (uy * ca + vy * sa) * sd, v[2] * cd + (uz * ca + vz * sa) * sd);
        if (oz > 0){ if (!pen){ c.moveTo(ox, oy); pen = true; } else c.lineTo(ox, oy); } else pen = false;
      }
      c.stroke();
    }

    // hub + your own country
    var hv = vecOf(MAP_HUB);
    if (hv){
      rot(hv[0], hv[1], hv[2]);
      if (oz > 0.05){
        var ha = (now - hubPulse) / 900;
        if (ha >= 0 && ha < 1){ c.strokeStyle = 'rgba(255,255,255,' + ((1 - ha) * 0.8).toFixed(3) + ')'; c.lineWidth = 1.6; c.beginPath(); c.arc(ox, oy, 5 + ha * 16, 0, Math.PI * 2); c.stroke(); }
        c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(ox, oy - 5); c.lineTo(ox + 5, oy); c.lineTo(ox, oy + 5); c.lineTo(ox - 5, oy); c.closePath(); c.fill();
        if (oz > 0.35) labelPill(c, ox, oy - 17, SITE.hubLabel, '255,255,255');
      }
    }
    if (ME && ME.country && vecOf(ME.country)){
      var mv = vecOf(ME.country);
      rot(mv[0], mv[1], mv[2]);
      if (oz > 0.05){
        var pr = (now % 2200) / 2200;
        c.strokeStyle = 'rgba(250,190,88,' + ((1 - pr) * 0.9).toFixed(3) + ')'; c.lineWidth = 1.8; c.beginPath(); c.arc(ox, oy, 3 + pr * 18, 0, Math.PI * 2); c.stroke();
        c.fillStyle = '#fde68a'; c.beginPath(); c.arc(ox, oy, 3.2, 0, Math.PI * 2); c.fill();
        if (oz > 0.35) labelPill(c, ox, oy + 17, '📍 ' + I18N[lang].mapYou, '250,190,88');
      }
    }
  }

  function flatDraw(now, dt){
    var cs = wsz.cs, w = wsz.w, h = wsz.h, c = wctx, i;
    if (!w) return;
    c.clearRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,0.11)';
    for (i = 0; i < cellN; i++){
      if (cInt[i] !== 0) continue;
      c.fillRect(cCol[i] * cs + cs * 0.22, cRow[i] * cs + cs * 0.22, cs * 0.56, cs * 0.56);
    }
    for (i = 0; i < cellN; i++){
      var t = cInt[i];
      if (t === 0) continue;
      var tw = 0.78 + 0.22 * Math.sin(now / 650 + cCol[i] * 7 + cRow[i] * 13);
      c.fillStyle = 'rgba(' + cRgb[i * 3] + ',' + cRgb[i * 3 + 1] + ',' + cRgb[i * 3 + 2] + ',' + ((0.34 + 0.6 * t) * tw).toFixed(3) + ')';
      c.beginPath(); c.arc((cCol[i] + 0.5) * cs, (cRow[i] + 0.5) * cs, cs * (0.34 + 0.2 * t), 0, Math.PI * 2); c.fill();
    }
    var hc = mapCenter[MAP_HUB], hx = hc === undefined ? 0 : (cCol[hc] + 0.5) * cs, hy = hc === undefined ? 0 : (cRow[hc] + 0.5) * cs;
    if (hc !== undefined){
      Object.keys(arcs).forEach(function(code){
        var a = arcs[code], ci = mapCenter[code], x1 = (cCol[ci] + 0.5) * cs, y1 = (cRow[ci] + 0.5) * cs;
        var dist = Math.sqrt((hx - x1) * (hx - x1) + (hy - y1) * (hy - y1)), mx = (x1 + hx) / 2, my = (y1 + hy) / 2 - dist * 0.3;
        c.strokeStyle = 'rgba(' + a.rgb[0] + ',' + a.rgb[1] + ',' + a.rgb[2] + ',' + (a.own ? 0.8 : 0.16 + 0.4 * a.tt).toFixed(3) + ')';
        c.lineWidth = a.own ? 1.6 : 0.8 + 0.8 * a.tt;
        c.beginPath(); c.moveTo(x1, y1); c.quadraticCurveTo(mx, my, hx, hy); c.stroke();
        updatePackets(a, dt, now, function(pt){
          for (var q = 4; q >= 0; q--){
            var tq = pt - q * 0.025;
            if (tq < 0) continue;
            var u = 1 - tq, px = u * u * x1 + 2 * u * tq * mx + tq * tq * hx, py = u * u * y1 + 2 * u * tq * my + tq * tq * hy;
            c.fillStyle = q === 0 ? '#ffffff' : 'rgba(' + a.rgb[0] + ',' + a.rgb[1] + ',' + a.rgb[2] + ',' + ((1 - q / 5) * 0.7).toFixed(3) + ')';
            c.beginPath(); c.arc(px, py, q === 0 ? 2.2 : 1.8 - q * 0.2, 0, Math.PI * 2); c.fill();
          }
        });
      });
      var ha = (now - hubPulse) / 900;
      if (ha >= 0 && ha < 1){ c.strokeStyle = 'rgba(255,255,255,' + ((1 - ha) * 0.8).toFixed(3) + ')'; c.lineWidth = 1.4; c.beginPath(); c.arc(hx, hy, cs * 1.4 + ha * cs * 7, 0, Math.PI * 2); c.stroke(); }
      c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(hx, hy - cs * 1.5); c.lineTo(hx + cs * 1.5, hy); c.lineTo(hx, hy + cs * 1.5); c.lineTo(hx - cs * 1.5, hy); c.closePath(); c.fill();
    }
    for (i = ripples.length - 1; i >= 0; i--){
      var rp = ripples[i], age = (now - rp.born) / rp.life, ri = mapCenter[rp.code];
      if (age >= 1 || ri === undefined){ ripples.splice(i, 1); continue; }
      c.beginPath(); c.arc((cCol[ri] + 0.5) * cs, (cRow[ri] + 0.5) * cs, cs * 2 + age * cs * rp.size, 0, Math.PI * 2);
      c.strokeStyle = 'rgba(' + rp.rgb + ',' + ((1 - age) * 0.85).toFixed(3) + ')'; c.lineWidth = 1.6; c.stroke();
    }
    if (ME && ME.country && mapCenter[ME.country] !== undefined){
      var mi = mapCenter[ME.country], mx2 = (cCol[mi] + 0.5) * cs, my2 = (cRow[mi] + 0.5) * cs, pr = (now % 2200) / 2200;
      c.beginPath(); c.arc(mx2, my2, cs * 1.5 + pr * cs * 9, 0, Math.PI * 2);
      c.strokeStyle = 'rgba(250,190,88,' + ((1 - pr) * 0.9).toFixed(3) + ')'; c.lineWidth = 1.8; c.stroke();
      c.beginPath(); c.arc(mx2, my2, cs * 1.1, 0, Math.PI * 2); c.fillStyle = '#fde68a'; c.fill();
    }
  }
  function mapDraw(now){
    var dt = lastT ? Math.min(0.05, (now - lastT) / 1000) : 0.016;
    lastT = now;
    if (mapMode === 'globe') globeDraw(now, dt); else flatDraw(now, dt);
  }

  function agoText(ms){
    var s = Math.floor(ms / 1000), m, hh;
    if (s < 45) return lang === 'fa' ? 'الان' : 'now';
    m = Math.round(s / 60);
    if (m < 60) return lang === 'fa' ? m + ' دقیقه پیش' : m + ' min ago';
    hh = Math.round(m / 60);
    return lang === 'fa' ? hh + ' ساعت پیش' : hh + 'h ago';
  }
  function renderFeed(){
    var html = '';
    feed.slice(0, 3).forEach(function(f){
      html += '<div>' + flagOf(f.code) + ' ' + countryName(f.code) + ' <b>+' + f.n + '</b> ' + I18N[lang].mapVisits + '<small>' + agoText(Date.now() - f.t) + '</small></div>';
    });
    byId('wfeed').innerHTML = html;
  }
  function mapRender(){
    var keys = Object.keys(geo.countries).sort(function(a, b){ return geo.countries[b] - geo.countries[a]; }), weekSum = 0, i;
    Object.keys(geo.week).forEach(function(k){ weekSum += geo.week[k]; });
    byId('wchips').innerHTML =
      '<span class="wchip"><b>' + fmt(geo.visits) + '</b> ' + I18N[lang].mapVisits + '</span>' +
      '<span class="wchip"><b>' + keys.length + '</b> ' + I18N[lang].mapCountries + '</span>' +
      '<span class="wchip"><b>' + fmt(weekSum) + '</b> ' + I18N[lang].mapWeek + '</span>';
    var html = '';
    for (i = 0; i < Math.min(6, keys.length); i++){
      var code = keys[i], pct = Math.max(6, Math.round(geo.countries[code] / wmax * 100));
      html += '<li data-code="' + code + '" style="--p:' + pct + '%"><i></i><span>' + flagOf(code) + ' ' + countryName(code) + '</span><b>' + fmt(geo.countries[code]) + '</b></li>';
    }
    byId('wlist').innerHTML = html;
    byId('wyou').textContent = (ME && ME.country) ? '📍 ' + I18N[lang].mapYou + ': ' + flagOf(ME.country) + ' ' + countryName(ME.country) : '';
    renderFeed();
  }
  function loadGeo(){
    viaBoot('geo', '/api/geo').then(function(d){
      var prev = geo.countries;
      geo = { countries: d.countries || {}, week: d.week || {}, visits: d.visits || 0 };
      Object.keys(geo.countries).forEach(function(code){
        var inc = geo.countries[code] - (prev[code] || 0);
        if (geoPrev && inc > 0){ mapPulse(code); feed.unshift({ code: code, n: inc, t: Date.now() }); if (feed.length > 6) feed.length = 6; }
      });
      geoPrev = true;
      applyGeo();
      if (!gl.inited && mapMode === 'globe'){
        gl.inited = true;
        rotateTo(ME && ME.country && mapCenter[ME.country] !== undefined ? ME.country : MAP_HUB);
      }
      if (reduce) mapDraw(performance.now());
    }).catch(function(){});
  }
  var mapLastF = 0, MAP_MS = window.matchMedia && window.matchMedia('(pointer: coarse)').matches ? 42 : 32; // ~24 fps on phones, ~30 on desktop
  function mapLoop(now){
    if (wvisible && !document.hidden && now - mapLastF >= MAP_MS){
      mapLastF = now;
      if (!reduce && now - wspawn > 1300){
        wspawn = now;
        var keys = Object.keys(geo.countries);
        if (keys.length){
          var tot = 0, i;
          for (i = 0; i < keys.length; i++) tot += Math.sqrt(geo.countries[keys[i]]);
          var pickv = Math.random() * tot, chosen = keys[0];
          for (i = 0; i < keys.length; i++){ pickv -= Math.sqrt(geo.countries[keys[i]]); if (pickv <= 0){ chosen = keys[i]; break; } }
          addRipple(chosen, 8, '90,160,255');
        }
      }
      if (!reduce) mapDraw(now);
    }
    requestAnimationFrame(mapLoop);
  }

  // hover / tap tooltip and dragging the globe
  function mapPick(e){
    var r = wbox.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top, v = 0;
    if (mapMode === 'globe'){
      var R = Math.min(wsz.w, wsz.h) * 0.43, x = (px - wsz.w / 2) / R, y = -(py - wsz.h / 2) / R, d2 = x * x + y * y;
      if (d2 > 1) return null;
      var z = Math.sqrt(1 - d2), cP = Math.cos(gl.pitch), sP = Math.sin(gl.pitch);
      var ly = y * cP + z * sP, lz = -y * sP + z * cP;
      var lat = Math.asin(Math.max(-1, Math.min(1, ly))) / D2R, lon = (gl.yaw + Math.atan2(x, lz)) / D2R;
      lon = ((lon + 540) % 360) - 180;
      var c = Math.floor((lon + 180) / MAPD.step), rr = Math.floor((MAPD.lat0 - lat) / MAPD.step);
      v = (mapGrid[rr] || [])[c];
    } else {
      v = (mapGrid[Math.floor(py / wsz.cs)] || [])[Math.floor(px / wsz.cs)];
    }
    return v ? { code: MAPD.codes[v - 1], x: px, y: py } : null;
  }
  function mapHover(e){
    var hit = mapPick(e);
    if (!hit){ wtip.hidden = true; return; }
    var n = geo.countries[hit.code] || 0;
    wtip.textContent = flagOf(hit.code) + ' ' + countryName(hit.code) + (n ? ' · ' + fmt(n) : '');
    wtip.style.left = hit.x + 'px'; wtip.style.top = hit.y + 'px';
    wtip.hidden = false;
  }
  wbox.addEventListener('pointerdown', function(e){
    if (mapMode === 'globe'){
      wdrag = { x: e.clientX, y: e.clientY, moved: 0, id: e.pointerId };
      gl.vyaw = 0; gl.to = null;
      try { wbox.setPointerCapture(e.pointerId); } catch (e2) {}
    } else if (e.pointerType !== 'mouse'){
      mapHover(e); clearTimeout(wtipTimer); wtipTimer = setTimeout(function(){ wtip.hidden = true; }, 2200);
    }
  });
  wbox.addEventListener('pointermove', function(e){
    if (wdrag && e.pointerId === wdrag.id){
      var dx = e.clientX - wdrag.x, dy = e.clientY - wdrag.y;
      wdrag.x = e.clientX; wdrag.y = e.clientY; wdrag.moved += Math.abs(dx) + Math.abs(dy);
      gl.yaw -= dx * 0.0065; gl.vyaw = -dx * 0.0065 * 55;
      if (e.pointerType === 'mouse') gl.pitch = Math.max(-0.9, Math.min(0.9, gl.pitch + dy * 0.0045));
      gl.lastDrag = performance.now();
      wtip.hidden = true;
      if (reduce) mapDraw(performance.now());
      return;
    }
    if (e.pointerType === 'mouse') mapHover(e);
  });
  function dragEnd(e){
    if (wdrag && wdrag.moved < 6 && e.type === 'pointerup'){
      mapHover(e); clearTimeout(wtipTimer); wtipTimer = setTimeout(function(){ wtip.hidden = true; }, 2200);
    }
    wdrag = null; gl.lastDrag = performance.now();
  }
  wbox.addEventListener('pointerup', dragEnd);
  wbox.addEventListener('pointercancel', dragEnd);
  wbox.addEventListener('pointerleave', function(){ if (!wdrag) wtip.hidden = true; });
  byId('wlist').addEventListener('click', function(e){
    var li = e.target.closest ? e.target.closest('li[data-code]') : null;
    if (!li) return;
    if (mapMode === 'globe') rotateTo(li.getAttribute('data-code')); else mapPulse(li.getAttribute('data-code'));
  });
  function setMapMode(m){
    mapMode = m;
    lsSet('lz_map', m);
    wmapEl.classList.toggle('globe', m === 'globe'); wmapEl.classList.toggle('flat', m === 'flat');
    var segs = document.querySelectorAll('#wseg button');
    for (var q = 0; q < segs.length; q++) segs[q].setAttribute('aria-pressed', segs[q].getAttribute('data-mode') === m ? 'true' : 'false');
    wtip.hidden = true;
    mapResize();
  }
  var segBtns = document.querySelectorAll('#wseg button');
  for (var sb = 0; sb < segBtns.length; sb++) segBtns[sb].addEventListener('click', function(){ setMapMode(this.getAttribute('data-mode')); });
  if ('IntersectionObserver' in window){
    new IntersectionObserver(function(en){ wvisible = en[0].isIntersecting; }, { threshold: 0.05 }).observe(wbox);
  }
  window.addEventListener('resize', mapResize);
  setMapMode(mapMode);
  loadGeo();
  setInterval(function(){ if (pollOk()) loadGeo(); }, 60000);
  setInterval(renderFeed, 20000);
  requestAnimationFrame(mapLoop);

  // ── tip of the day ──
  var TIPS = window.TIPS || [["", "", ""]];
  var tipIdx = Math.floor(Date.now() / 86400000) % TIPS.length;
  function renderTip(){
    var t = TIPS[tipIdx];
    byId('tipCmd').textContent = t[0];
    byId('tipDesc').textContent = lang === 'fa' ? t[1] : t[2];
    byId('tipNum').textContent = (tipIdx + 1) + '/' + TIPS.length;
  }
  byId('tipNext').addEventListener('click', function(){ tipIdx = (tipIdx + 1) % TIPS.length; renderTip(); });
  byId('tipCopy').addEventListener('click', function(){
    copyText(TIPS[tipIdx][0]).then(function(){ toast(I18N[lang].copied + ': ' + TIPS[tipIdx][0]); unlock('tipper'); }).catch(function(){});
  });
  renderTip();

  // ── FX: live-support celebration, idle "everything falls", scroll reveal ──
  function fxSupportMsg(prev, d, lg){
    var l = d && d.last, pl = prev && prev.last;
    if (!l || !l.name || (pl && pl.name === l.name && pl.amount === l.amount)) return null;
    var who = (l.crypto ? '⚡ ' : '') + String(l.name).slice(0, 30), amt = l.amount > 0 ? fmtT(l.amount) : '';
    if (lg === 'fa') return '❤️ ' + who + ' همین الان ' + (amt ? amt + ' ' + I18N.fa.toman + ' ' : '') + 'حمایت کرد!';
    return '❤️ ' + who + ' just supported' + (amt ? ' with ' + amt + ' ' + I18N.en.toman : '') + '!';
  }
  function fxConfetti(origin){
    if (reduce) return;
    var W = window.innerWidth, H = window.innerHeight, dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var cv = document.createElement('canvas'), c = cv.getContext('2d');
    if (!c) return;
    cv.className = 'fx-confetti'; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    document.body.appendChild(cv);
    var r = origin ? origin.getBoundingClientRect() : null, onScreen = r && r.bottom > 0 && r.top < H;
    var ox = onScreen ? r.left + r.width / 2 : W / 2, oy = onScreen ? Math.max(40, r.top + r.height * 0.3) : H * 0.3;
    var COLS = ['#ffd36e', '#fabe58', '#4ade80', '#60a5fa', '#f472b6', '#a78bfa', '#ffffff'], bits = [], n = W < 700 ? 70 : 140, i;
    for (i = 0; i < n; i++){
      var a = Math.random() * Math.PI * 2, v = 4 + Math.random() * 9;
      bits.push({ x: ox, y: oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 7, w: 5 + Math.random() * 6, h: 3 + Math.random() * 4, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, col: COLS[i % COLS.length] });
    }
    var t0 = performance.now(), last = t0;
    function tick(now){
      var t = (now - t0) / 1000, k = Math.min(3, (now - last) / 16.7);
      last = now;
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
      c.globalAlpha = t > 2.4 ? Math.max(0, 1 - (t - 2.4) / 0.8) : 1;
      for (var j = 0; j < bits.length; j++){
        var b = bits[j], co, si;
        b.vx *= Math.pow(0.985, k); b.vy = b.vy * Math.pow(0.985, k) + 0.32 * k; b.x += b.vx * k; b.y += b.vy * k; b.r += b.vr * k;
        co = Math.cos(b.r) * dpr; si = Math.sin(b.r) * dpr;
        c.setTransform(co, si, -si, co, b.x * dpr, b.y * dpr);
        c.fillStyle = b.col; c.fillRect(-b.w / 2, -b.h / 2, b.w, b.h * Math.abs(Math.cos(b.r * 1.7)) + 1);
      }
      if (t < 3.2) requestAnimationFrame(tick); else cv.remove();
    }
    requestAnimationFrame(tick);
  }
  function celebrate(prev, d){
    var el = document.getElementById('donate');
    if (el){ el.classList.remove('boost'); void el.offsetWidth; el.classList.add('boost'); }
    toast(fxSupportMsg(prev, d, lang) || I18N[lang].newSupport, 5000);
    fxConfetti(el);
  }
  if (/[?&]fx=donate/.test(location.search)) setTimeout(function(){ celebrate({ current: 0 }, { current: 1, last: { name: 'Demo', amount: 250000 } }); }, 2500);

  // idle: every card on screen falls to the floor (gravity, a small bounce, the page shakes), then springs back on wake
  var fxFallen = [];
  function fallCards(on){
    if (reduce || !document.body.animate) return;
    var i;
    if (on){
      var vh = window.innerHeight, items = document.querySelectorAll('main .side > *, main .grid > *'), k = 0;
      for (i = 0; i < items.length; i++){
        var el = items[i], r = el.getBoundingClientRect();
        if (!r.height || r.bottom <= 0 || r.top >= vh) continue;
        // short cards land on the floor; tall ones drop until only their top edge peeks above it
        var dy = r.bottom <= vh ? vh - r.bottom - 4 - Math.random() * 10 : Math.max(0, vh - r.top - 70 - Math.random() * 50), up = Math.min(28, dy * 0.1);
        var fr = (Math.random() < 0.5 ? -1 : 1) * (r.width > 420 || r.height > 260 ? 2 + Math.random() * 4 : 6 + Math.random() * 16);
        var anim = el.animate([
          { translate: '0 0', rotate: '0deg', easing: 'cubic-bezier(.55,0,1,.6)' },
          { translate: '0 ' + dy + 'px', rotate: fr + 'deg', offset: 0.7, easing: 'cubic-bezier(.2,.6,.4,1)' },
          { translate: '0 ' + (dy - up) + 'px', rotate: (fr * 0.85) + 'deg', offset: 0.84, easing: 'cubic-bezier(.6,0,.8,.4)' },
          { translate: '0 ' + dy + 'px', rotate: fr + 'deg' }
        ], { duration: 1150, delay: k * 90 + Math.random() * 120, fill: 'forwards' });
        fxFallen.push({ el: el, a: anim });
        k++;
      }
      var m = document.querySelector('main');
      if (m && k) m.animate([{ translate: '0 0' }, { translate: '0 5px' }, { translate: '0 -2px' }, { translate: '0 0' }], { duration: 320, delay: (k - 1) * 90 + 920 });
    } else {
      for (i = 0; i < fxFallen.length; i++){
        var f = fxFallen[i], cs = getComputedStyle(f.el), from = { translate: cs.translate, rotate: cs.rotate };
        f.a.cancel();
        f.el.animate([from, { translate: '0 0', rotate: '0deg' }], { duration: 750, delay: i * 35, easing: 'cubic-bezier(.2,1.5,.4,1)', fill: 'backwards' });
      }
      fxFallen = [];
    }
  }

  // scroll reveal: cards below the fold rise in with a little spring; the globe zooms in and spins
  (function(){
    if (reduce || !('IntersectionObserver' in window)) return;
    var vh = window.innerHeight, items = document.querySelectorAll('main .grid > *'), n = 0, i;
    var io = new IntersectionObserver(function(ens){
      var k = 0;
      ens.forEach(function(en){
        if (!en.isIntersecting) return;
        var el = en.target;
        io.unobserve(el);
        el.style.setProperty('--rvd', (k++ * 90) + 'ms');
        el.classList.add('fx-in');
        if (el === wmapEl){ gl.to = null; gl.vyaw = 7; }
        setTimeout(function(){ el.classList.remove('fx-rv', 'fx-in'); el.style.removeProperty('--rvd'); el.style.removeProperty('--rvr'); }, 2200);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    for (i = 0; i < items.length; i++){
      if (items[i].getBoundingClientRect().top < vh * 0.95) continue;
      items[i].classList.add('fx-rv');
      items[i].style.setProperty('--rvr', (n++ % 2 ? 1.5 : -1.5) + 'deg');
      io.observe(items[i]);
    }
  })();

  // ── idle mode: the grid turns into a living network ──
  var idleSec = parseInt(new URLSearchParams(location.search).get('idle'), 10);
  var IDLE_MS = (idleSec >= 3 ? idleSec : 30) * 1000, lastAct = Date.now(), isIdle = false;
  window.LZ_ACTIVE = function(){ return Date.now() - lastAct < 300000; }; // stop polling after 5 quiet minutes
  function wake(){
    var gap = Date.now() - lastAct;
    lastAct = Date.now();
    if (gap > 300000){ loadDonate(); loadGeo(); }
    if (isIdle){
      isIdle = false;
      document.documentElement.classList.remove('idle');
      fallCards(false);
      if (window.LZ_GRID) window.LZ_GRID.setIdle(false);
    }
  }
  ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'].forEach(function(ev){ window.addEventListener(ev, wake, { passive: true }); });
  setInterval(function(){
    if (isIdle || reduce || document.hidden) return;
    if (document.querySelector('dialog[open]') || mxEl || byId('boot')){ lastAct = Date.now(); return; }
    if (Date.now() - lastAct > IDLE_MS){
      isIdle = true;
      document.documentElement.classList.add('idle');
      fallCards(true);
      if (window.LZ_GRID) window.LZ_GRID.setIdle(true);
    }
  }, 1000);

  // ── snake ──
  var snakeDlg = byId('snakeDialog'), snCv = byId('snCv'), snCtx = snCv.getContext('2d');
  var SN = 20;
  var sn = { state: 'idle', body: [], dir: { x: 1, y: 0 }, queue: [], food: { x: 15, y: 10 }, score: 0, speed: 140, timer: null, sid: '', best: parseInt(lsGet('lz_snake_best', '0'), 10) || 0, raf: 0, swipe: null };
  function snEl(id){ return byId(id); }
  function snFood(){
    var f, ok;
    do {
      f = { x: Math.floor(Math.random() * SN), y: Math.floor(Math.random() * SN) };
      ok = true;
      for (var i = 0; i < sn.body.length; i++) if (sn.body[i].x === f.x && sn.body[i].y === f.y) ok = false;
    } while (!ok);
    sn.food = f;
  }
  function snScoreText(){ snEl('snScore').textContent = sn.score; snEl('snBest').textContent = sn.best; }
  function snReset(){
    clearTimeout(sn.timer);
    sn.body = [{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }];
    sn.dir = { x: 1, y: 0 }; sn.queue = []; sn.score = 0; sn.speed = 140; sn.sid = ''; sn.state = 'ready';
    snFood(); snScoreText();
    snEl('snOver').hidden = true;
  }
  function snSchedule(){ clearTimeout(sn.timer); sn.timer = setTimeout(snTick, sn.speed); }
  function snBegin(){
    sn.state = 'play';
    fetch('/api/snake/start', { method: 'POST' }).then(function(r){ return r.json(); }).then(function(j){ sn.sid = j.sid || ''; }).catch(function(){});
    snSchedule();
  }
  function snTurn(dx, dy){
    if (sn.state === 'ready'){ snBegin(); }
    else if (sn.state === 'paused'){ sn.state = 'play'; snSchedule(); }
    if (sn.state !== 'play') return;
    var last = sn.queue.length ? sn.queue[sn.queue.length - 1] : sn.dir;
    if ((last.x === -dx && last.y === -dy) || (last.x === dx && last.y === dy)) return;
    if (sn.queue.length < 2) sn.queue.push({ x: dx, y: dy });
  }
  function snTick(){
    if (sn.state !== 'play') return;
    if (sn.queue.length) sn.dir = sn.queue.shift();
    var head = { x: sn.body[0].x + sn.dir.x, y: sn.body[0].y + sn.dir.y }, i, hit = false;
    if (head.x < 0 || head.y < 0 || head.x >= SN || head.y >= SN) hit = true;
    for (i = 0; i < sn.body.length - 1 && !hit; i++) if (sn.body[i].x === head.x && sn.body[i].y === head.y) hit = true;
    if (hit){ snOver(); return; }
    sn.body.unshift(head);
    if (head.x === sn.food.x && head.y === sn.food.y){
      sn.score++;
      sn.speed = Math.max(65, 140 - sn.score * 3);
      if (sn.score > sn.best){ sn.best = sn.score; lsSet('lz_snake_best', String(sn.best)); }
      snFood(); snScoreText();
    } else sn.body.pop();
    snSchedule();
  }
  function snBoardLoad(){
    viaBoot('snake', '/api/snake').then(function(d){
      var ol = snEl('snBoard'); ol.innerHTML = '';
      (d.board || []).forEach(function(e, i){
        var li = document.createElement('li'), a = document.createElement('span'), b = document.createElement('b');
        a.textContent = (i + 1) + '. ' + e.name; b.textContent = e.score;
        li.appendChild(a); li.appendChild(b); ol.appendChild(li);
      });
      var ch = byId('snChamp');
      ch.textContent = d.board && d.board.length ? '🐍 ' + I18N[lang].snakeChamp + ': ' + d.board[0].name + ' · ' + d.board[0].score : '🐍 ' + I18N[lang].snakePlay;
    }).catch(function(){});
  }
  function snOver(){
    sn.state = 'over';
    clearTimeout(sn.timer);
    if (sn.score >= 5) unlock('snake');
    var over = snEl('snOver');
    snEl('snOverTitle').textContent = I18N[lang].snakeOver + ' · ' + sn.score;
    var canSubmit = sn.score >= 1 && !!sn.sid;
    snEl('snOverMsg').textContent = canSubmit ? I18N[lang].snakeName : '';
    snEl('snName').hidden = !canSubmit; snEl('snSubmit').hidden = !canSubmit;
    snEl('snSubmit').disabled = false;
    snEl('snName').value = lsGet('lz_name', '');
    over.hidden = false;
  }
  function snSubmit(){
    var name = snEl('snName').value.trim();
    lsSet('lz_name', name);
    snEl('snSubmit').disabled = true;
    fetch('/api/snake', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sid: sn.sid, name: name, score: sn.score }) })
      .then(function(r){ return r.json(); }).then(function(d){
        if (d.ok){
          snEl('snOverMsg').textContent = I18N[lang].snakeSaved + ' #' + d.rank;
          snEl('snName').hidden = true; snEl('snSubmit').hidden = true;
          snBoardLoad();
        } else {
          snEl('snOverMsg').textContent = I18N[lang].snakeFail + (d.error ? ': ' + d.error : '');
          snEl('snName').hidden = true; snEl('snSubmit').hidden = true;
        }
      }).catch(function(){ snEl('snOverMsg').textContent = I18N[lang].snakeFail; snEl('snSubmit').disabled = false; });
  }
  function snDraw(now){
    var W = snCv.width, cs = W / SN, c = snCtx, i;
    c.clearRect(0, 0, W, W);
    var bg = c.createLinearGradient(0, 0, W, W);
    bg.addColorStop(0, '#05080b'); bg.addColorStop(1, '#0a0f16');
    c.fillStyle = bg; c.fillRect(0, 0, W, W);
    c.strokeStyle = 'rgba(90,209,201,0.07)'; c.lineWidth = 1;
    for (i = 1; i < SN; i++){
      c.beginPath(); c.moveTo(i * cs, 0); c.lineTo(i * cs, W); c.stroke();
      c.beginPath(); c.moveTo(0, i * cs); c.lineTo(W, i * cs); c.stroke();
    }
    var pulse = 0.6 + 0.4 * Math.sin(now / 220), fx = (sn.food.x + 0.5) * cs, fy = (sn.food.y + 0.5) * cs;
    var fg = c.createRadialGradient(fx, fy, 0, fx, fy, cs * 1.3);
    fg.addColorStop(0, 'rgba(250,190,88,' + (0.55 * pulse).toFixed(2) + ')'); fg.addColorStop(1, 'rgba(250,190,88,0)');
    c.fillStyle = fg; c.beginPath(); c.arc(fx, fy, cs * 1.3, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fbbf24'; c.beginPath(); c.arc(fx, fy, cs * (0.26 + 0.05 * pulse), 0, Math.PI * 2); c.fill();
    for (i = sn.body.length - 1; i >= 0; i--){
      var s = sn.body[i], t = i / Math.max(1, sn.body.length - 1), x = s.x * cs + cs * 0.12, y = s.y * cs + cs * 0.12, sz = cs * 0.76;
      if (i === 0){
        c.save(); c.shadowColor = 'rgba(90,209,201,0.95)'; c.shadowBlur = 18;
        c.fillStyle = '#eafffb'; roundRect(c, x, y, sz, sz, cs * 0.24); c.fill(); c.restore();
      } else {
        c.fillStyle = 'rgba(' + Math.round(90 - 40 * t) + ',' + Math.round(209 - 90 * t) + ',' + Math.round(201 + 40 * t) + ',' + (0.95 - 0.55 * t).toFixed(2) + ')';
        roundRect(c, x, y, sz, sz, cs * 0.22); c.fill();
      }
    }
    if (sn.state === 'ready' || sn.state === 'paused'){
      c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(0, W / 2 - 30, W, 60);
      c.fillStyle = '#c9d1db'; c.textAlign = 'center'; c.font = '600 20px Vazirmatn, Inter, sans-serif';
      c.fillText(I18N[lang].snakeReady, W / 2, W / 2 + 7);
    }
  }
  function snLoop(now){
    if (!snakeDlg.hasAttribute('open')) { sn.raf = 0; return; }
    snDraw(now);
    sn.raf = requestAnimationFrame(snLoop);
  }
  function openSnake(){
    if (termDialog.hasAttribute('open')) closeTerm();
    snReset(); snBoardLoad();
    openDlg(snakeDlg);
    if (!sn.raf) sn.raf = requestAnimationFrame(snLoop);
  }
  function closeSnake(){
    clearTimeout(sn.timer); sn.state = 'idle';
    closeDlg(snakeDlg);
  }
  byId('snClose').addEventListener('click', closeSnake);
  snakeDlg.addEventListener('close', function(){ clearTimeout(sn.timer); sn.state = 'idle'; });
  byId('snAgain').addEventListener('click', snReset);
  byId('snSubmit').addEventListener('click', snSubmit);
  byId('snChamp').addEventListener('click', openSnake);
  var pads = document.querySelectorAll('.sn-pad button');
  for (var pdi = 0; pdi < pads.length; pdi++) (function(b){
    b.addEventListener('pointerdown', function(e){ e.preventDefault(); snTurn(parseInt(b.getAttribute('data-dx'), 10), parseInt(b.getAttribute('data-dy'), 10)); });
  })(pads[pdi]);
  snCv.addEventListener('touchstart', function(e){ if (e.touches[0]) sn.swipe = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }, { passive: true });
  snCv.addEventListener('touchend', function(e){
    if (!sn.swipe || !e.changedTouches[0]) return;
    var dx = e.changedTouches[0].clientX - sn.swipe.x, dy = e.changedTouches[0].clientY - sn.swipe.y;
    sn.swipe = null;
    if (Math.abs(dx) < 18 && Math.abs(dy) < 18){ snTurn(sn.dir.x, sn.dir.y); return; }
    if (Math.abs(dx) > Math.abs(dy)) snTurn(dx > 0 ? 1 : -1, 0); else snTurn(0, dy > 0 ? 1 : -1);
  }, { passive: true });
  document.addEventListener('keydown', function(e){
    if (!snakeDlg.hasAttribute('open')) return;
    var tag = e.target && e.target.tagName;
    if (tag === 'INPUT'){ if (e.key === 'Enter') snSubmit(); return; }
    var k = String(e.key || '').toLowerCase(), map = { arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0] };
    if (map[k]){ e.preventDefault(); snTurn(map[k][0], map[k][1]); }
    else if ((k === ' ' || k === 'enter') && sn.state === 'over'){ e.preventDefault(); snReset(); }
  });
  document.addEventListener('visibilitychange', function(){
    if (document.hidden && sn.state === 'play'){ sn.state = 'paused'; clearTimeout(sn.timer); }
  });
  snBoardLoad();

  // ── terminal: snake, leaderboard, tip ──
  TERM_HELP.splice(TERM_HELP.length - 2, 0,
    ['snake', 'play snake (shared leaderboard)'], ['leaderboard', 'top snake players'], ['tip', 'Linux tip of the day']);
  TERM.snake = function(){ termLine('Loading snake…', 'ok'); setTimeout(openSnake, 250); };
  TERM.leaderboard = function(){
    fetch('/api/snake').then(function(r){ return r.json(); }).then(function(d){
      if (!d.board || !d.board.length){ termLine('No scores yet. Type snake and be the first.', 'dim'); return; }
      d.board.forEach(function(e, i){ termLine([{ t: pad(String(i + 1) + '.', 4), c: 'ok' }, pad(e.name, 18) + e.score]); });
    }).catch(function(){ termLine('Could not load the leaderboard.', 'err'); });
  };
  TERM.tip = function(){
    var t = TIPS[tipIdx];
    termLine([{ t: '$ ', c: 'ok' }, { t: t[0], c: 'cmd' }]);
    termLine(lang === 'fa' ? t[1] : t[2], 'dim');
  };

  window.LZ_FEAT = { lang: function(){ renderGreet(); renderAch(); renderTip(); mapRender(); snBoardLoad(); } };
  renderGreet();
})();
