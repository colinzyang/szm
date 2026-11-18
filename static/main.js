/* ============================================================
   SZM 美术馆 · The Museum of SZM — 交互引擎
   数据驱动：馆藏来自 static/gallery-data.js（社区可无限扩展）
   ============================================================ */
(() => {
  'use strict';

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer   = matchMedia('(pointer: fine)').matches;

  /* ---------- 馆藏数据 ---------- */
  const DATA = (window.SZM_GALLERY && Array.isArray(window.SZM_GALLERY.exhibits))
    ? window.SZM_GALLERY.exhibits : [];
  const byId = new Map(DATA.map(e => [e.id, e]));
  const FEATURED_TAG = '镇馆之宝';
  const PAGE_SIZE = 8;

  /* 分类标签双语 · Bilingual tag labels */
  const TAG_EN = {
    '全部': 'All', '镇馆之宝': 'Masterpiece', '摄影': 'Photography', '人像': 'Portrait',
    '风景': 'Landscape', '梗图': 'Meme', '二次元': 'Anime', '设计': 'Design', '其他': 'Misc',
  };
  const tagLabel = t => TAG_EN[t] ? `${t} ${TAG_EN[t]}` : t;

  const featuredExhibits = (() => {
    const tagged = DATA.filter(e => (e.tags || []).includes(FEATURED_TAG));
    return (tagged.length ? tagged : DATA).slice(0, 2);
  })();
  const featuredIds = new Set(featuredExhibits.map(e => e.id));
  const communityExhibits = DATA.filter(e => !featuredIds.has(e.id));

  /* ---------- 预加载 ---------- */
  const preloader = $('#preloader');
  const preBar = $('.pre-bar i');
  const runPreloader = () => new Promise(resolve => {
    if (reducedMotion) { preloader.classList.add('done'); document.body.classList.add('loaded'); resolve(); return; }
    let p = 0;
    const tick = () => {
      p = Math.min(100, p + Math.random() * 16 + 6);
      preBar.style.width = p + '%';
      if (p < 100) setTimeout(tick, 90 + Math.random() * 120);
      else setTimeout(() => {
        preloader.classList.add('done');
        document.body.classList.add('loaded');
        resolve();
      }, 350);
    };
    tick();
  });
  runPreloader();

  /* ---------- 自定义光标 ---------- */
  if (finePointer && !reducedMotion) {
    const dot = $('.cursor-dot'), ring = $('.cursor-ring');
    let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y;
    addEventListener('mousemove', e => {
      x = e.clientX; y = e.clientY;
      dot.style.transform = `translate(${x}px, ${y}px) translate(-50%,-50%)`;
    }, { passive: true });
    (function loop() {
      rx += (x - rx) * 0.16; ry += (y - ry) * 0.16;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
      requestAnimationFrame(loop);
    })();
    const hoverSel = 'a, button, [role="button"]';
    document.addEventListener('mouseover', e => { if (e.target.closest(hoverSel)) document.body.classList.add('cursor-hover'); });
    document.addEventListener('mouseout',  e => { if (e.target.closest(hoverSel)) document.body.classList.remove('cursor-hover'); });
  }

  /* ---------- 导航 & 滚动进度 & 英雄区视差 ---------- */
  const nav = $('#nav'), progress = $('#scroll-progress'), heroBg = $('.hero-bg');
  const onScroll = () => {
    const st = scrollY;
    nav.classList.toggle('solid', st > 40);
    const h = document.documentElement.scrollHeight - innerHeight;
    progress.style.width = (h > 0 ? (st / h) * 100 : 0) + '%';
    if (!reducedMotion && heroBg) heroBg.style.marginTop = st * 0.12 + 'px';
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- 跑马灯：无缝循环 ---------- */
  const track = $('#marquee-track');
  if (track) track.innerHTML += track.innerHTML;

  /* ============================================================
     馆藏渲染引擎 · Gallery Renderer
     ============================================================ */
  const featuredGrid = $('#featured-grid');
  const communityGrid = $('#community-grid');
  const tagChipsBox = $('#tag-chips');
  const searchInput = $('#gallery-search');
  const loadMoreBtn = $('#load-more');
  const emptyBox = $('#gallery-empty');
  const countLine = $('#gallery-count');

  const buildCard = (ex, i) => {
    const card = document.createElement('article');
    card.className = 'exhibit reveal';
    card.style.setProperty('--d', (i % 4) * 0.08 + 's');
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.dataset.id = ex.id;
    card.setAttribute('aria-label', `鉴赏作品 Appreciate · ${ex.id} ${ex.title}`);
    card.dataset.tags = (ex.tags || []).join('|');

    const frame = document.createElement('div');
    frame.className = 'frame';
    const media = document.createElement('div');
    media.className = 'exhibit-media';
    const img = document.createElement('img');
    img.src = ex.src;
    img.alt = `${ex.title} · by @${ex.author || '匿名'}`;
    img.loading = 'lazy';
    media.appendChild(img);
    frame.appendChild(media);
    card.appendChild(frame);

    const plaque = document.createElement('div');
    plaque.className = 'plaque';
    const no = document.createElement('span');
    no.className = 'plaque-no';
    no.textContent = 'EXHIBIT ' + ex.id;
    const h3 = document.createElement('h3');
    h3.textContent = ex.title + ' ';
    if (ex.titleEn) {
      const em = document.createElement('em');
      em.textContent = ex.titleEn;
      h3.appendChild(em);
    }
    const meta = document.createElement('p');
    meta.className = 'plaque-meta';
    meta.textContent = [ex.year, ex.medium, ex.author ? `by @${ex.author}` : ''].filter(Boolean).join(' · ');
    const tags = document.createElement('p');
    tags.className = 'plaque-tags';
    (ex.tags || []).forEach(t => {
      const b = document.createElement('span');
      b.className = 'tag-badge';
      b.textContent = tagLabel(t);
      tags.appendChild(b);
    });
    const desc = document.createElement('p');
    desc.className = 'plaque-desc';
    desc.textContent = ex.desc || '';
    plaque.append(no, h3, meta, tags, desc);
    card.appendChild(plaque);
    return card;
  };

  // 镇馆之宝（保留交错的 12 栅格布局）
  featuredExhibits.forEach((ex, i) => {
    const card = buildCard(ex, i);
    card.classList.add(i === 0 ? 'exhibit--a' : 'exhibit--b');
    featuredGrid.appendChild(card);
  });
  // 社区馆藏
  communityExhibits.forEach((ex, i) => communityGrid.appendChild(buildCard(ex, i)));

  // 统计：策展人 / 馆藏数
  const authors = new Set(DATA.map(e => e.author || '匿名'));
  $('#stat-exhibits').dataset.count = DATA.length;
  $('#stat-curators').dataset.count = authors.size;
  if (countLine) {
    const enExhibits = `${DATA.length} exhibit${DATA.length === 1 ? '' : 's'}`;
    const enCurators = `${authors.size} curator${authors.size === 1 ? '' : 's'}`;
    countLine.innerHTML = `当前 ${DATA.length} 件馆藏 · ${authors.size} 位策展人 · 永久开放投稿<span class="en">${enExhibits} · ${enCurators} · submissions always open</span>`;
  }

  /* ---------- 筛选 / 搜索 / 分页 ---------- */
  const allTags = ['全部', ...new Set(DATA.flatMap(e => e.tags || []))];
  let curTag = '全部';
  let page = 1;

  allTags.forEach((t, i) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip' + (i === 0 ? ' active' : '');
    chip.textContent = tagLabel(t);
    chip.addEventListener('click', () => {
      curTag = t;
      $$('.chip', tagChipsBox).forEach(c => c.classList.toggle('active', c === chip));
      page = 1;
      applyFilter();
    });
    tagChipsBox.appendChild(chip);
  });

  let searchTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { page = 1; applyFilter(); }, 160);
  });

  const matches = ex => {
    const q = searchInput.value.trim().toLowerCase();
    const okTag = curTag === '全部' || (ex.tags || []).includes(curTag);
    const hay = `${ex.title} ${ex.titleEn || ''} ${ex.author || ''} ${ex.desc || ''} ${(ex.tags || []).join(' ')}`.toLowerCase();
    return okTag && (!q || hay.includes(q));
  };

  const applyFilter = () => {
    const q = searchInput.value.trim();
    const searching = q !== '';
    let communityShown = 0, communityMatched = 0;

    $$('.exhibit', featuredGrid).forEach(card => {
      const ex = byId.get(card.dataset.id);
      card.classList.toggle('is-hidden', ex ? !matches(ex) : false);
    });
    $$('.exhibit', communityGrid).forEach(card => {
      const ex = byId.get(card.dataset.id);
      if (!ex || !matches(ex)) { card.classList.add('is-hidden'); return; }
      communityMatched++;
      // 搜索时忽略分页，全部展示；浏览时分页展示
      const withinPage = searching || communityMatched <= page * PAGE_SIZE;
      card.classList.toggle('is-hidden', !withinPage);
      if (withinPage) communityShown++;
    });

    const total = $$('.exhibit:not(.is-hidden)', featuredGrid).length + communityShown;
    emptyBox.hidden = total !== 0;
    const remaining = communityMatched - (searching ? 0 : page * PAGE_SIZE);
    loadMoreBtn.hidden = remaining <= 0;
    loadMoreBtn.textContent = remaining > 0 ? `展开更多馆藏 · Load more（${remaining}）` : '展开更多馆藏 · Load more';
  };
  loadMoreBtn.addEventListener('click', () => { page++; applyFilter(); });
  applyFilter();

  /* ---------- 滚动显现 ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px' });
  $$('.reveal').forEach(el => io.observe(el));

  /* ---------- 数字滚动 ---------- */
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const countIO = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target, target = +el.dataset.count, suffix = el.dataset.suffix || '';
      countIO.unobserve(el);
      if (reducedMotion) { el.textContent = target + suffix; return; }
      const t0 = performance.now(), dur = 1600;
      (function step(now) {
        const k = Math.min(1, (now - t0) / dur);
        el.textContent = Math.round(easeOut(k) * target) + suffix;
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach(el => countIO.observe(el));

  /* ---------- 展品 3D 倾斜 + 聚光灯 ---------- */
  const bindTilt = card => {
    if (!finePointer || reducedMotion) return;
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      card.style.setProperty('--ry', ((px - 0.5) * 10).toFixed(2) + 'deg');
      card.style.setProperty('--rx', ((0.5 - py) * 8).toFixed(2) + 'deg');
      card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
      card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
    });
    card.addEventListener('mouseleave', () => {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  };
  $$('.exhibit').forEach(bindTilt);

  /* ---------- 灯箱（按当前可见顺序浏览） ---------- */
  const lb = $('#lightbox'), lbImg = $('#lb-img'),
        lbNo = $('#lb-no'), lbTitle = $('#lb-title'), lbDesc = $('#lb-desc');
  let visibleIds = [], cur = 0, lastFocus = null;

  const refreshVisible = () => {
    visibleIds = [...$$('.exhibit:not(.is-hidden)', featuredGrid), ...$$('.exhibit:not(.is-hidden)', communityGrid)]
      .map(c => c.dataset.id);
  };
  const show = i => {
    cur = (i + visibleIds.length) % visibleIds.length;
    const it = byId.get(visibleIds[cur]);
    if (!it) return;
    lbImg.classList.remove('zoomed');
    lbImg.src = it.src;
    lbImg.alt = `${it.title} · by @${it.author || '匿名'}`;
    lbNo.textContent = 'EXHIBIT ' + it.id;
    lbTitle.textContent = it.title + (it.titleEn ? ` · ${it.titleEn}` : '');
    lbDesc.textContent = it.desc || '';
  };
  const openLb = id => {
    refreshVisible();
    const idx = visibleIds.indexOf(id);
    if (idx < 0) return;
    lastFocus = document.activeElement;
    show(idx);
    lb.hidden = false;
    requestAnimationFrame(() => lb.classList.add('open'));
    document.body.style.overflow = 'hidden';
    $('.lb-close').focus();
  };
  const closeLb = () => {
    lb.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => { lb.hidden = true; }, 450);
    if (lastFocus) lastFocus.focus();
  };
  const zoom = e => {
    if (e.target !== lbImg) return;
    lbImg.classList.toggle('zoomed');
    if (lbImg.classList.contains('zoomed')) {
      const r = lbImg.getBoundingClientRect();
      lbImg.style.transformOrigin = `${e.clientX - r.left}px ${e.clientY - r.top}px`;
    }
  };

  $$('.exhibit').forEach(card => {
    card.addEventListener('click', () => openLb(card.dataset.id));
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLb(card.dataset.id); } });
  });
  $('.lb-close').addEventListener('click', closeLb);
  $('.lb-prev').addEventListener('click', () => show(cur - 1));
  $('.lb-next').addEventListener('click', () => show(cur + 1));
  lb.addEventListener('click', e => { if (e.target === lb || e.target === $('.lb-figure')) closeLb; else zoom(e); });
  addEventListener('keydown', e => {
    if (lb.hidden) return;
    if (e.key === 'Escape') closeLb();
    if (e.key === 'ArrowLeft')  show(cur - 1);
    if (e.key === 'ArrowRight') show(cur + 1);
  });

  /* ---------- 彩带 ---------- */
  const canvas = $('#confetti'), ctx = canvas.getContext('2d');
  let parts = [], rafId = null;
  const fitCanvas = () => { canvas.width = innerWidth; canvas.height = innerHeight; };
  fitCanvas();
  addEventListener('resize', fitCanvas);
  const COLORS = ['#c9a24b', '#ecd28a', '#f2ead8', '#d94f4f', '#4fa3a5', '#7a9e5f'];
  const boom = (ox, oy) => {
    const n = reducedMotion ? 0 : 180;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = 4 + Math.random() * 9;
      parts.push({
        x: ox, y: oy,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v - 4,
        w: 5 + Math.random() * 7, h: 3 + Math.random() * 5,
        rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
        color: COLORS[(Math.random() * COLORS.length) | 0],
        life: 1,
      });
    }
    if (!rafId) rafId = requestAnimationFrame(drawParts);
  };
  const drawParts = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    parts = parts.filter(p => p.life > 0 && p.y < canvas.height + 40);
    parts.forEach(p => {
      p.vy += 0.13; p.vx *= 0.985; p.x += p.vx; p.y += p.vy;
      p.rot += p.vr; p.life -= 0.006;
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    rafId = parts.length ? requestAnimationFrame(drawParts) : (ctx.clearRect(0, 0, canvas.width, canvas.height), null);
  };
  $$('[data-confetti]').forEach(btn =>
    btn.addEventListener('click', e => boom(e.clientX || innerWidth / 2, e.clientY || innerHeight / 2))
  );

  /* ---------- Toast ---------- */
  const toast = $('#toast');
  let toastTimer;
  const showToast = msg => {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  };

  /* ---------- 彩蛋：Konami → 全息传奇模式 ---------- */
  const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  let ki = 0;
  addEventListener('keydown', e => {
    ki = (e.key === KONAMI[ki]) ? ki + 1 : (e.key === KONAMI[0] ? 1 : 0);
    if (ki === KONAMI.length) {
      ki = 0;
      const on = document.body.classList.toggle('party');
      showToast(on ? '全息传奇模式已开启 · Hologram Legend Mode ON · 再按一次关闭 Press again to exit' : '全息传奇模式已关闭 · Hologram Legend Mode OFF');
      if (on) boom(innerWidth / 2, innerHeight / 2);
    }
  });

  /* ---------- 年份 ---------- */
  $('#year').textContent = new Date().getFullYear();
})();
