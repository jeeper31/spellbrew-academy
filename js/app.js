/* Spellbrew Academy — main game logic. Classic script (works from file://). */
(function(){
'use strict';
const D = window.SB_DATA, WORDS = window.SB_WORDS, A = window.SB_AUDIO;
const BY_ID = Object.fromEntries(WORDS.map(w => [w.id, w]));
const KEY = 'spellbrew.v1';
const $ = id => document.getElementById(id);
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.body.classList.contains('reduced');
let rng = Math.random;
const pickOne = arr => arr[Math.floor(rng() * arr.length)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------------- State ---------------- */
function freshProgress(){
  return { name:'', sound:true, showCount:true, entered:false,
    words:{}, recent:[], streak:0, bestStreak:0, tried:0, correctTotal:0, firstTryTotal:0,
    recipeIdx:0, slots:[], potionsMade:0, distinct:[], belt:{}, xp:0, cleared:[false,false,false,false,false,false,false,false],
    roomHp:{}, mapPos:0, selRoom:0, current:null };
}
function defaults(){ return Object.assign({ v:1, gender:'g', hair:'waves', face:'smile', skin:3, photo:null, usePhoto:false }, freshProgress()); }
let S;
function load(){ try{ const raw = localStorage.getItem(KEY); S = Object.assign(defaults(), raw ? JSON.parse(raw) : {}); }catch(e){ S = defaults(); } }
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){ console.warn('save failed', e); } }
function wstat(id){ return S.words[id] || (S.words[id] = { tries:0, correct:0, firstTries:0, mastered:false, review:false }); }

/* ---------------- Ranks / levels ---------------- */
function brewRank(){ const n = S.distinct.length; let r = D.BREW_RANKS[0][1]; for(const [t, name] of D.BREW_RANKS) if(n >= t) r = name; return r; }
function levelOf(xp){ let l = 0; D.XP_RANKS.forEach(([t], i) => { if(xp >= t) l = i; }); return l + 1; }
function xpRankName(level){ return D.XP_RANKS[level-1][1]; }
function currentTier(){ return S.potionsMade >= 8 ? 4 : D.RECIPES[S.recipeIdx].tier; }

/* ---------------- Avatar ---------------- */
function portraitPath(g, skin, hair, face){ return `assets/portraits/${g}_${skin}_${hair}_${face}.webp`; }
function avatarSrc(){ return (S.usePhoto && S.photo) ? S.photo : portraitPath(S.gender, S.skin, S.hair, S.face); }
// Defensive fallback (all 576 combinations ship, so this should never fire): same gender/skin/hair with the
// "smile" face, then the first hair with "smile". The fallback is announced in the label, never silent.
function setAvatarImg(img, onFallback){
  const want = avatarSrc(); img.onerror = null;
  if(S.usePhoto && S.photo){ img.src = want; return; }
  const chain = [want, portraitPath(S.gender, S.skin, S.hair, 'smile'), portraitPath(S.gender, S.skin, D.HAIR[S.gender][0][0], 'smile')];
  let i = 0;
  img.onerror = () => { i++; if(i < chain.length){ img.src = chain[i]; if(onFallback) onFallback(i); } };
  img.src = chain[0];
}
function refreshAvatars(){
  const label = $('gate-choice-label');
  const hairL = D.HAIR[S.gender].find(h => h[0] === S.hair)[1], faceL = D.FACES[S.gender].find(f => f[0] === S.face)[1];
  label.textContent = (S.usePhoto && S.photo) ? 'Using your photo' : `${S.gender === 'g' ? 'Girl' : 'Boy'} · ${hairL} · ${faceL} · Skin tone ${S.skin}`;
  setAvatarImg($('gate-portrait'), i => { label.textContent += i === 1 ? ' — this face is missing, showing Smile instead' : ' — this combination is missing, showing the closest one'; });
  ['tb-avatar','b-hero'].forEach(id => setAvatarImg($(id)));
  const tok = document.querySelector('#map .token img'); if(tok) setAvatarImg(tok);
}

/* ---------------- Screens ---------------- */
let screen = 'gate';
function show(name){
  screen = name;
  ['gate','desk','dungeon','battle'].forEach(s => $(s).hidden = s !== name);
  $('topbar').hidden = name === 'gate';
  $('nav-desk').hidden = name === 'desk';
  $('nav-dungeon').hidden = name === 'dungeon' || name === 'battle';
  if(name === 'gate') renderGate();
  if(name === 'desk'){ renderDesk(); focusInput(); }
  if(name === 'dungeon') renderDungeon();
  refreshTop();
  window.scrollTo(0, 0);
}
function refreshTop(){
  $('tb-name').textContent = S.name || 'Apprentice';
  $('tb-rank').textContent = brewRank();
  const lv = levelOf(S.xp); $('tb-level').textContent = `Level ${lv} ${xpRankName(lv)}`;
  $('tb-streak').textContent = S.streak;
  $('nav-sound').textContent = S.sound ? '🔔 Chimes on' : '🔕 Chimes off';
  $('nav-sound').setAttribute('aria-pressed', String(S.sound));
  setAvatarImg($('tb-avatar'));
}

/* ---------------- Gate ---------------- */
function renderGate(){
  $('gate-name').value = S.name;
  const started = S.entered || S.tried > 0;
  $('gate-enter').textContent = started ? 'Continue spelling' : 'Enter the tower';
  document.querySelectorAll('#mk-gender .seg-btn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.g === S.gender)));
  const g = S.gender, portraitOn = !(S.usePhoto && S.photo);
  $('mk-hair').innerHTML = D.HAIR[g].map(([k, l]) => `<button class="opt" data-hair="${k}" aria-pressed="${portraitOn && k === S.hair}"><img alt="" src="${portraitPath(g, S.skin, k, S.face)}">${esc(l)}</button>`).join('');
  $('mk-face').innerHTML = D.FACES[g].map(([k, l]) => `<button class="opt" data-face="${k}" aria-pressed="${portraitOn && k === S.face}"><img alt="" src="${portraitPath(g, S.skin, S.hair, k)}">${esc(l)}</button>`).join('');
  $('mk-skin').innerHTML = D.SKINS.map((c, i) => `<button class="opt swatch" data-skin="${i+1}" aria-pressed="${portraitOn && i+1 === S.skin}" style="background:${c}" aria-label="Skin tone ${i+1}"><span>${i+1}</span></button>`).join('');
  $('ph-back').hidden = !S.photo;
  $('ph-back').textContent = (S.usePhoto && S.photo) ? '↩ Use the portraits again' : '🧑 Use my photo again';
  refreshAvatars();
}
function setGender(g){
  if(g === S.gender) { S.usePhoto = false; save(); renderGate(); return; }
  const hi = D.HAIR[S.gender].findIndex(h => h[0] === S.hair), fi = D.FACES[S.gender].findIndex(f => f[0] === S.face);
  S.gender = g; S.hair = D.HAIR[g][Math.max(0, hi)][0]; S.face = D.FACES[g][Math.max(0, fi)][0];
  S.usePhoto = false; save(); renderGate();
}
function enterTower(){
  A.unlock();
  S.name = $('gate-name').value.trim().slice(0, 20) || 'Apprentice';
  S.entered = true; save(); A.play('click'); show('desk');
}

/* ---------------- Photo mode ---------------- */
let camStream = null;
async function usePicture(imgOrCanvas){
  $('ph-status').textContent = 'Cutting you out with the tower magic… (the first time takes a few seconds)';
  try{
    const url = await window.SB_PHOTO.makeCutout(imgOrCanvas, 'assets/scenes/stonewall.webp');
    S.photo = url; S.usePhoto = true; save(); renderGate();
    $('ph-status').textContent = 'Done! Your photo stays on this device. You can switch back to the portraits any time.';
  }catch(e){
    console.warn(e);
    $('ph-status').textContent = e && e.message === 'no-person' ? 'I could not find a person in that picture. Try one where you are easy to see.' : 'The photo magic could not run here. Your portrait still works!';
  }
}
function onFile(ev){
  const f = ev.target.files && ev.target.files[0]; if(!f) return;
  const r = new FileReader();
  r.onload = () => window.SB_PHOTO.loadImage(r.result).then(usePicture);
  r.readAsDataURL(f); ev.target.value = '';
}
async function openCamera(){
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){ $('ph-status').textContent = 'This browser has no camera here. Try "Choose a picture" instead.'; return; }
  try{
    camStream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:'user', width:{ideal:1280}, height:{ideal:720} }, audio:false });
    $('cam-video').srcObject = camStream; $('cam').hidden = false; $('cam-snap').focus();
  }catch(e){ $('ph-status').textContent = 'The camera is not available. Try "Choose a picture" instead.'; }
}
function closeCamera(){ if(camStream){ camStream.getTracks().forEach(t => t.stop()); camStream = null; } $('cam').hidden = true; }
function snap(){
  const v = $('cam-video'), c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight;
  const x = c.getContext('2d'); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(v, 0, 0);
  closeCamera(); usePicture(c);
}

/* ---------------- Speech ---------------- */
let voice = null;
function pickVoice(){ if(!window.speechSynthesis) return; const vs = speechSynthesis.getVoices(); voice = vs.find(v => /en[-_]US/i.test(v.lang) && /female|samantha|google/i.test(v.name)) || vs.find(v => /^en/i.test(v.lang)) || null; }
function say(text, rate){
  if(!window.speechSynthesis) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text); u.rate = rate || 0.9; u.pitch = 1.05; if(voice) u.voice = voice; u.lang = 'en-US';
  speechSynthesis.speak(u);
}

/* ---------------- Word selection ---------------- */
// Recent = the last 6 words (cooldown). ~1 in 5 picks come from review words. Otherwise: fresh words in the
// current tier, then unmastered tier words, then any tier word except the last one.
function pickWord(){
  const recent = S.recent.slice(-6), last = S.recent[S.recent.length - 1];
  const tier = currentTier();
  const inTier = WORDS.filter(w => w.tier === tier);
  const review = WORDS.filter(w => { const s = S.words[w.id]; return s && s.review && !s.mastered && !recent.includes(w.id); });
  if(review.length && rng() < 0.2) return { w: pickOne(review), why:'review' };
  const fresh = inTier.filter(w => !(S.words[w.id] && S.words[w.id].tries) && !recent.includes(w.id));
  if(fresh.length) return { w: pickOne(fresh), why:'fresh' };
  const unm = inTier.filter(w => !(S.words[w.id] && S.words[w.id].mastered) && !recent.includes(w.id));
  if(unm.length) return { w: pickOne(unm), why:'unmastered' };
  const any = inTier.filter(w => w.id !== last);
  return { w: pickOne(any), why:'any' };
}

/* ---------------- Spelling round ---------------- */
let R = null; // { w, misses, phase:'spell'|'study'|'cover'|'done', firstTry, counted, why }
const norm = s => s.normalize('NFC').replace(/[\u2018\u2019\u02BC\u0060\u00B4\u2032]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase();
function blankSentence(w){
  const re = new RegExp("(^|[^A-Za-z'\u2019])" + w.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "(?![A-Za-z'\u2019])", 'i');
  return w.sentence.replace(re, (m, pre) => pre + '____');
}
function startRound(forcedId){
  let w, why;
  if(forcedId && BY_ID[forcedId]){ w = BY_ID[forcedId]; why = 'practice'; }
  else if(S.current && BY_ID[S.current]){ w = BY_ID[S.current]; why = 'resume'; }
  else ({ w, why } = pickWord());
  S.current = w.id; save();
  R = { w, misses:0, phase:'spell', firstTry:true, counted:false, why };
  renderRound();
  if(screen === 'desk') setTimeout(() => say(w.word), 250);
}
function renderRound(){
  const w = R.w;
  $('desk-tier').textContent = `Tier ${w.tier}`;
  $('desk-pattern').textContent = ({vowel:'Tricky vowels', silent:'Silent letters', homophone:'Sound-alike word', contraction:'Contraction', suffix:'Word ending', double:'Double letters'})[w.pattern] || w.pattern;
  const st = S.words[w.id];
  $('desk-review').hidden = !(st && st.review && !st.mastered);
  $('w-def').textContent = w.definition;
  $('w-sent').textContent = blankSentence(w);
  renderSlots(false);
  $('letter-count').textContent = S.showCount ? `${w.word.replace(/'/g,'').length} letters${w.word.includes("'") ? ' + an apostrophe' : ''}` : '';
  $('letter-count').hidden = !S.showCount;
  $('apos-note').hidden = !w.word.includes("'");
  $('study').hidden = true;
  $('tile-history').innerHTML = ''; $('live-tiles').innerHTML = ''; $('tile-key').hidden = true;
  setFeedback('', '');
  $('type-label').textContent = 'Type the word';
  $('check-btn').textContent = '✨ Check spelling';
  const inp = $('spell-input'); inp.value = ''; inp.disabled = false; inp.readOnly = false;
  renderRecipe();
}
function renderSlots(reveal){
  const w = R.w, box = $('word-slots');
  if(!S.showCount && !reveal){ box.innerHTML = `<span class="word-mystery">✦ Listen, then spell ✦</span>`; return; }
  box.innerHTML = [...w.word].map(ch => ch === "'" ? `<div class="slot apos">'</div>` : `<div class="slot">${reveal ? esc(ch) : ''}</div>`).join('');
}
function setFeedback(text, kind){ const f = $('feedback'); f.textContent = text; f.className = 'feedback ' + (kind || ''); }
function focusInput(){ const i = $('spell-input'); if(screen === 'desk' && !i.disabled && !anyOverlay()) setTimeout(() => i.focus(), 0); }

// Wordle-style scoring with letter counts (two passes).
function score(guess, answer){
  const g = [...guess], a = [...answer], res = g.map(() => 'x'), left = {};
  a.forEach((ch, i) => { if(g[i] === ch) res[i] = 'g'; else left[ch] = (left[ch] || 0) + 1; });
  g.forEach((ch, i) => { if(res[i] !== 'g' && left[ch]){ res[i] = 'y'; left[ch]--; } });
  return res;
}
const MARK_NAME = { g:'right letter, right place', y:'in the word, wrong place', x:'not in the word' };
function tilesHTML(guess, marks){ return `<div class="tile-row">${[...guess].map((ch, i) => `<div class="tile ${marks[i]} flip" style="animation-delay:${i*45}ms" title="${MARK_NAME[marks[i]]}" aria-label="${esc(ch)}: ${MARK_NAME[marks[i]]}">${esc(ch)}</div>`).join('')}</div>`; }
function addTiles(guess){
  const marks = score(guess, norm(R.w.word));
  const hist = $('tile-history'); hist.insertAdjacentHTML('beforeend', tilesHTML(guess, marks));
  while(hist.children.length > 3) hist.removeChild(hist.firstChild);
  $('tile-key').hidden = marks.every(m => m === 'g');
}
function startsWith(word){ const n = word.length > 5 ? 2 : 1; return word.slice(0, n); }

function check(){
  if(!R) return;
  const inp = $('spell-input');
  if(R.phase === 'done'){ nextWord(); return; }
  if(R.phase === 'study'){ setFeedback('Read it, then press "Cover the word" when you are ready.', ''); return; }
  const guess = norm(inp.value);
  if(!guess){ setFeedback('Type the word first. Then press Enter.', ''); return; }
  if(!R.counted){ R.counted = true; S.tried++; wstat(R.w.id).tries++; }
  const answer = norm(R.w.word), st = wstat(R.w.id);
  addTiles(guess);
  if(guess === answer){
    st.correct++; S.correctTotal++;
    if(R.firstTry && R.phase === 'spell'){
      st.firstTries++; S.firstTryTotal++; S.streak++; S.bestStreak = Math.max(S.bestStreak, S.streak);
      if(st.firstTries >= 2){ st.mastered = true; st.review = false; }
      $('tb-streak').parentElement.classList.remove('pop'); void $('tb-streak').offsetWidth; $('tb-streak').parentElement.classList.add('pop');
      setFeedback(st.mastered && st.firstTries === 2 ? `✨ First try! "${R.w.word}" is now MASTERED!` : '✨ First try! Perfect spelling!', 'good');
    } else {
      st.review = true; S.streak = 0;
      setFeedback(R.phase === 'cover' ? `🌟 You wrote it from memory! "${R.w.word}" goes on your review list for more practice.` : `✅ Got it! "${R.w.word}" goes on your review list.`, 'good');
    }
    A.play('correct');
    renderSlots(true);
    R.phase = 'done'; $('study').hidden = true;
    $('check-btn').textContent = '➡️ Next word';
    inp.disabled = false; inp.readOnly = true;
    pushRecent(R.w.id); S.current = null;
    addSlot();
    save(); refreshTop();
    focusInput();
    return;
  }
  // wrong
  A.play('wrong');
  inp.classList.remove('shake'); void inp.offsetWidth; inp.classList.add('shake');
  R.firstTry = false; S.streak = 0; st.review = true;
  if(R.phase === 'cover'){
    setFeedback('Almost! Press "Look again" to peek, then cover it and try once more.', 'bad');
    $('study-look').hidden = false; inp.select(); save(); refreshTop(); return;
  }
  R.misses++;
  // Miss 1: tiles only. Miss 2: tiles + hint + first letters. Miss 3: show the word (study).
  if(R.misses === 1) setFeedback('Not quite. Check your tiles and try again.', 'bad');
  else if(R.misses === 2) setFeedback(`Hint: ${R.w.hint} And it starts with "${startsWith(R.w.word)}…"`, 'bad');
  else { openStudy(); }
  inp.select(); save(); refreshTop();
}
function openStudy(){
  R.phase = 'study';
  const w = R.w;
  $('study').hidden = false; $('study-word').textContent = w.word; $('study-word').classList.remove('covered');
  $('study-syl').textContent = w.syllables; $('study-hint').textContent = '💡 ' + w.hint;
  $('study-cover').hidden = false; $('study-look').hidden = true;
  setFeedback("Let's study it together. Look closely, say it in parts, then cover it.", '');
  renderSlots(true);
  $('spell-input').value = ''; $('spell-input').disabled = true;
  say(w.word, 0.6);
  setTimeout(() => $('study-cover').focus(), 0);
}
function coverWord(){
  R.phase = 'cover';
  $('study-word').classList.add('covered'); $('study-cover').hidden = true; $('study-look').hidden = false;
  renderSlots(false);
  $('type-label').textContent = 'Write it from memory';
  setFeedback('Now write it from memory. You can look again if you need to.', '');
  const i = $('spell-input'); i.disabled = false; i.value = ''; i.focus();
}
function lookAgain(){ R.phase = 'study'; $('study-word').classList.remove('covered'); $('study-cover').hidden = false; $('study-look').hidden = true; renderSlots(true); $('spell-input').disabled = true; setFeedback('Take another good look, then cover it again.', ''); $('study-cover').focus(); }
function pushRecent(id){ S.recent.push(id); if(S.recent.length > 12) S.recent = S.recent.slice(-12); }
function nextWord(){ $('spell-input').readOnly = false; startRound(); focusInput(); }

/* ---------------- Cauldron / potions ---------------- */
function hexToRgb(h){ const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function mix(hexes){ if(!hexes.length) return '#2c3a4a'; const s = [0,0,0]; hexes.forEach(h => hexToRgb(h).forEach((v, i) => s[i] += v)); return '#' + s.map(v => Math.round(v / hexes.length).toString(16).padStart(2, '0')).join(''); }
function bottleSVG(recipeIdx, big){
  const r = D.RECIPES[recipeIdx], c = D.LIQUID[r.color], id = 'b' + recipeIdx + (big ? 'B' : '') + Math.floor(rng()*1e6);
  const stars = '★'.repeat(r.tier);
  return `<svg viewBox="0 0 60 90" aria-hidden="true"><defs><radialGradient id="${id}" cx="40%" cy="40%"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".25" stop-color="${c}"/><stop offset="1" stop-color="${c}" stop-opacity=".75"/></radialGradient></defs>
  <rect x="24" y="4" width="12" height="10" rx="2" fill="#a0703c" stroke="#5a3b12"/><rect x="22" y="13" width="16" height="14" fill="#cfe3ea55" stroke="#ffffffaa"/>
  <circle cx="30" cy="56" r="27" fill="url(#${id})" stroke="#ffffffcc" stroke-width="2.5"/><ellipse cx="21" cy="46" rx="6" ry="9" fill="#fff" opacity=".45"/>
  <text x="30" y="68" font-size="11" text-anchor="middle" fill="#3a2a10" font-weight="900">${stars}</text></svg>`;
}
function cauldronSVG(colors, n){
  const liquid = mix(colors), glow = 0.15 + n * 0.18;
  const bubbles = Array.from({length: 2 + n * 2}, (_, i) => `<circle class="bubble" cx="${110 + (i * 37) % 85}" cy="78" r="${5 + (i % 3) * 2}" fill="${liquid}" stroke="#fff8" style="animation-delay:${(i * 0.37) % 2.4}s"/>`).join('');
  return `<svg viewBox="0 0 300 250" aria-label="Cauldron">
  <defs><radialGradient id="cg" cx="40%" cy="30%"><stop offset="0" stop-color="#5b5f66"/><stop offset=".6" stop-color="#26282d"/><stop offset="1" stop-color="#0e0f12"/></radialGradient>
  <radialGradient id="lg"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".35" stop-color="${liquid}"/><stop offset="1" stop-color="${liquid}"/></radialGradient>
  <radialGradient id="gl"><stop offset="0" stop-color="${liquid}" stop-opacity="${glow}"/><stop offset="1" stop-color="${liquid}" stop-opacity="0"/></radialGradient></defs>
  <ellipse cx="150" cy="70" rx="150" ry="70" fill="url(#gl)"/>
  <g class="fire"><ellipse cx="120" cy="232" rx="18" ry="14" fill="#ff8a2a"/><ellipse cx="150" cy="235" rx="24" ry="16" fill="#ffb347"/><ellipse cx="180" cy="232" rx="18" ry="14" fill="#ff8a2a"/><ellipse cx="150" cy="238" rx="12" ry="8" fill="#fff1a8"/></g>
  <rect x="85" y="205" width="16" height="30" rx="4" fill="#1a1b1f"/><rect x="199" y="205" width="16" height="30" rx="4" fill="#1a1b1f"/>
  <path d="M55 85 Q50 215 150 220 Q250 215 245 85 Z" fill="url(#cg)" stroke="#000" stroke-width="3"/>
  <ellipse cx="150" cy="85" rx="100" ry="22" fill="#1b1c20" stroke="#6c6f76" stroke-width="5"/>
  <ellipse cx="150" cy="87" rx="88" ry="16" fill="url(#lg)"/>
  ${bubbles}
  <path d="M75 120 Q80 170 110 190" stroke="#ffffff22" stroke-width="10" fill="none" stroke-linecap="round"/></svg>`;
}
function renderRecipe(){
  const r = D.RECIPES[S.recipeIdx];
  $('recipe-title').innerHTML = `Recipe ${S.recipeIdx + 1} of 8: ${esc(r.name)} <span class="small muted nowrap">(Tier ${r.tier})</span>`;
  $('recipe-blurb').textContent = `${r.blurb} ${S.slots.length} of ${r.ings.length} ingredients.`;
  document.querySelector('.desk-right').classList.toggle('many', r.ings.length > 4);
  const filled = S.slots.length;
  $('cauldron').innerHTML = cauldronSVG(S.slots.map(i => D.LIQUID[r.ings[i].liquid]), filled);
  $('recipe-slots').innerHTML = r.ings.map((ing, i) => `<li class="${i < filled ? 'filled' : ''} ${i === filled ? 'next' : ''}" data-i="${i}"><span class="ic">${ing.icon}</span><span>${esc(ing.name)}</span><span class="lq" style="background:${D.LIQUID[ing.liquid]}"></span></li>`).join('');
  renderBeltMini();
}
function renderBeltMini(){
  const entries = Object.entries(S.belt).filter(([, n]) => n > 0);
  $('desk-belt').innerHTML = entries.length ? entries.map(([ri, n]) => Array.from({length: Math.min(n, 6)}, () => `<span title="${esc(D.RECIPES[ri].name)}">${bottleSVG(+ri)}</span>`).join('') + (n > 6 ? `<b>×${n}</b>` : '')).join('') : '<span class="empty">Empty — every correct word adds an ingredient.</span>';
}
function addSlot(){
  const r = D.RECIPES[S.recipeIdx];
  S.slots.push(S.slots.length);
  A.play('slot');
  renderRecipe();
  const li = document.querySelector(`#recipe-slots li[data-i="${S.slots.length - 1}"]`); if(li) li.classList.add('just');
  if(S.slots.length >= r.ings.length){
    const made = S.recipeIdx;
    S.potionsMade++; if(!S.distinct.includes(made)) S.distinct.push(made);
    S.belt[made] = (S.belt[made] || 0) + 1;
    S.recipeIdx = (S.recipeIdx + 1) % D.RECIPES.length; S.slots = [];
    save();
    setTimeout(() => showBrew(made), reduced() ? 50 : 700);
  }
}
function showBrew(ri){
  const r = D.RECIPES[ri];
  $('brew-bottle').innerHTML = bottleSVG(ri, true);
  $('brew-name').textContent = r.name;
  const nxt = D.RECIPES[S.recipeIdx];
  $('brew-sub').innerHTML = `A Tier ${r.tier} potion for your belt! Brewing rank: <b>${esc(brewRank())}</b><br>Next recipe: ${esc(nxt.name)}${S.potionsMade >= 8 && S.recipeIdx === 0 ? ' (words stay at Tier 4)' : ''}`;
  $('brew').hidden = false; A.play('brew'); confetti(30, r.color);
  setTimeout(() => $('brew-ok').focus(), 30);
  refreshTop();
}
function closeBrew(){ $('brew').hidden = true; renderRecipe(); focusInput(); }
function confetti(n, colorKey){
  if(reduced()) return;
  const cols = ['#e5b143', '#8fd3e8', '#6fae4f', '#e2703a', '#fff', D.LIQUID[colorKey] || '#e5b143'];
  for(let i = 0; i < n; i++){
    const c = document.createElement('div'); c.className = 'confetti';
    c.style.left = (rng() * 100) + 'vw'; c.style.background = pickOne(cols); c.style.animationDelay = (rng() * 0.6) + 's'; c.style.animationDuration = (1.8 + rng() * 1.4) + 's';
    document.body.appendChild(c); setTimeout(() => c.remove(), 3600);
  }
}

/* ---------------- Desk render ---------------- */
function renderDesk(){ if(!R || (S.current && R.w.id !== S.current && R.phase !== 'done')) startRound(); else renderRecipe(); }

/* ---------------- Dungeon ---------------- */
const POS = [[13,26],[37,26],[62,26],[87,26],[87,69],[62,69],[37,69],[13,69]];
const SHAPES = {
  round:   { w:12, h:34, clip:'circle(50% at 50% 50%)' },
  cellar:  { w:15, h:30, clip:'polygon(12% 0,88% 0,100% 100%,0 100%)' },
  gallery: { w:17, h:32, clip:'polygon(0 22%,18% 22%,18% 0,82% 0,82% 22%,100% 22%,100% 78%,82% 78%,82% 100%,18% 100%,18% 78%,0 78%)' },
  closet:  { w:9,  h:36, clip:'inset(0 round 14px)' },
  landing: { w:15, h:34, clip:'polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)' },
  spiral:  { w:13, h:36, clip:'polygon(50% 0,100% 38%,82% 100%,18% 100%,0 38%)' },
  hall:    { w:19, h:24, clip:'inset(0 round 60px)' },
  lantern: { w:14, h:38, clip:'polygon(30% 0,70% 0,100% 30%,100% 70%,70% 100%,30% 100%,0 70%,0 30%)' },
};
function unlocked(i){ for(let j = 0; j < i; j++) if(!S.cleared[j]) return false; return levelOf(S.xp) >= D.ROOMS[i].level; }
function hitInfo(ri, roomIdx){
  const room = D.ROOMS[roomIdx], pt = D.RECIPES[ri].tier;
  if(+ri === room.fav) return { p:0.88, label:'Its favorite', cls:'odds-fav' };
  if(pt > room.tier) return { p:0.70, label:'Strong', cls:'odds-strong' };
  if(pt === room.tier) return { p:0.50, label:'Might fizzle', cls:'odds-mid' };
  return { p:0.32, label:'Often fizzles', cls:'odds-low' };
}
function beltList(roomIdx){
  return Object.entries(S.belt).filter(([, n]) => n > 0).map(([ri, n]) => ({ ri:+ri, n, ...hitInfo(+ri, roomIdx) })).sort((a, b) => b.p - a.p || D.RECIPES[b.ri].tier - D.RECIPES[a.ri].tier);
}
function readiness(i){
  // Spec wording, verbatim. "Higher tier" means higher than the tier of the creature's favorite potion.
  const room = D.ROOMS[i], list = beltList(i);
  if(!list.length) return { cls:'empty', text:'Your belt is empty. Brew something first.' };
  if(list.some(x => x.ri === room.fav || D.RECIPES[x.ri].tier > room.tier)) return { cls:'', text:'Your belt can handle this door.' };
  return { cls:'warn', text:'You can try. A potion might fizzle.' };
}
function renderDungeon(){
  const map = $('map');
  const pts = POS.map(([x, y]) => `${x},${y}`).join(' ');
  let html = `<svg class="corr" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    <polyline points="${pts}" fill="none" stroke="#1c140c" stroke-width="5.5" stroke-linejoin="round" vector-effect="non-scaling-stroke" style="stroke-width:30px"/>
    <polyline points="${pts}" fill="none" stroke="#6b5b45" stroke-width="22" stroke-linejoin="round" vector-effect="non-scaling-stroke" style="stroke-width:22px;stroke-dasharray:2 6" stroke-linecap="round"/>
    ${POS.slice(0, -1).map(([x, y], i) => S.cleared[i] ? `<line x1="${x}" y1="${y}" x2="${POS[i+1][0]}" y2="${POS[i+1][1]}" stroke="#ffcf6a" stroke-opacity=".35" vector-effect="non-scaling-stroke" style="stroke-width:10px"/>` : '').join('')}
  </svg>`;
  // torches along the corridors (between rooms, slightly off the line) and at the turn
  const torches = [[25,17],[49.5,17],[74.5,17],[94,47.5],[74.5,78],[49.5,78],[25,78],[6,47.5],[25,35],[74.5,60]];
  html += torches.map(([x, y]) => `<span class="torch" style="left:${x}%;top:${y}%"></span>`).join('');
  html += D.ROOMS.map((room, i) => {
    const sh = SHAPES[room.shape], [x, y] = POS[i], un = unlocked(i), cl = S.cleared[i];
    return `<button class="room ${un ? '' : 'locked'} ${i === S.selRoom ? 'sel' : ''}" data-room="${i}" style="left:${x}%;top:${y}%;width:${sh.w}%;height:${sh.h}%" aria-label="${un ? esc(room.name) : 'Sealed door ' + (i+1)}${un ? '' : ' (locked)'}${cl ? ' (cleared)' : ''}">
      <div class="floor" style="background-image:url(assets/rooms/floor${i+1}.webp);clip-path:${sh.clip}"></div>${un ? '' : `<div class="fog" style="clip-path:${sh.clip}"></div>`}
      <span class="badge">${cl ? '⭐' : un ? '' : '🔒'}</span><span class="rlabel">${un ? `${i+1}. ${esc(room.name)}` : `${i+1}. Sealed door`}</span></button>`;
  }).join('');
  const [tx, ty] = POS[S.mapPos];
  html += `<div class="token" id="token" style="left:${tx}%;top:${ty}%"><img alt="You"></div>`;
  map.innerHTML = html;
  setAvatarImg(map.querySelector('.token img'));
  renderRoomPanel();
}
function renderRoomPanel(){
  const i = S.selRoom, room = D.ROOMS[i], un = unlocked(i), cl = S.cleared[i], fav = D.RECIPES[room.fav];
  const lv = levelOf(S.xp), hpNow = S.roomHp[i] != null ? S.roomHp[i] : room.hp;
  let lock = '';
  if(!un){
    const firstUncleared = S.cleared.findIndex((c, j) => j < i && !c);
    if(firstUncleared >= 0) lock = `🔒 This door opens after you clear <b>${esc(D.ROOMS[firstUncleared].name)}</b>.`;
    if(lv < room.level) lock += `${lock ? '<br>' : ''}🔒 It also needs battle Level ${room.level} (${esc(xpRankName(room.level))}). You are Level ${lv} with ${S.xp} XP; you need ${D.XP_RANKS[room.level-1][0]} XP. Clearing the rooms before it earns enough, and cleared rooms can be visited again for more XP.`;
  }
  const rd = readiness(i);
  // Before a room is open it is a sealed door: no name, no hint, no creature. Before it is cleared: the hint, never the monster's name.
  $('room-panel').innerHTML = un ? `
    <div class="room-art" style="background-image:url(assets/scenes/room${i+1}.webp)">${cl ? `<img src="assets/monsters/m${i+1}.webp" alt="${esc(room.monster)}">` : ''}</div>
    <h2>${i+1}. ${esc(room.name)} ${cl ? '⭐' : ''}</h2>
    <div class="room-meta"><span class="chip">${cl ? esc(room.monster) : 'Someone is inside…'}</span><span class="chip">Level ${room.level}</span><span class="chip">❤️ ${cl ? room.hp : hpNow}/${room.hp}</span><span class="chip">Weak to: ${esc(fav.name)}</span></div>
    <p class="room-hint"><b>Hint:</b> ${esc(room.hint)}</p>
    <div class="readiness ${rd.cls}">${esc(rd.text)}</div>
    ${cl ? `<p class="small muted">⭐ Cleared! The ${esc(room.monster)} wandered home. Visit again to practice throws and earn more XP.</p>` : ''}
    <div class="row-btns" style="justify-content:flex-start">
      <button class="btn gold xl" id="enter-room" ${beltList(i).length ? '' : 'disabled'}>${cl ? 'Visit again' : 'Open the door'}</button>
      <button class="btn ghost" id="back-desk">✍️ Back to spelling (Esc)</button>
    </div>
    <p class="small muted">Tip: use ← → to pick a room and Enter to go in.</p>` : `
    <div class="room-art sealed" style="background-image:url(assets/scenes/room${i+1}.webp)"></div>
    <h2>${i+1}. Sealed door</h2>
    <div class="lockmsg">${lock}</div>
    <div class="row-btns" style="justify-content:flex-start"><button class="btn ghost" id="back-desk">✍️ Back to spelling (Esc)</button></div>`;
  const er = $('enter-room'); if(er) er.onclick = () => enterBattle(i);
  $('back-desk').onclick = () => show('desk');
}
let walking = false;
function selectRoom(i, fromKey){
  if(i < 0 || i > 7) return;
  S.selRoom = i; save();
  document.querySelectorAll('#map .room').forEach(b => b.classList.toggle('sel', +b.dataset.room === i));
  renderRoomPanel();
  if(unlocked(i)) walkTo(i);
  if(fromKey){ const b = document.querySelector(`#map .room[data-room="${i}"]`); if(b) b.focus(); }
}
let walkTarget = 0;
function walkTo(target){
  if(!$('token')) return;
  walkTarget = target;               // a new click retargets a walk already under way
  const step = () => {
    const tok = $('token');          // the map may have been re-rendered mid-walk
    if(!tok){ walking = false; return; }
    if(S.mapPos === walkTarget){ tok.classList.remove('walk'); walking = false; return; }
    walking = true; tok.classList.add('walk');
    S.mapPos += walkTarget > S.mapPos ? 1 : -1; save();
    const [x, y] = POS[S.mapPos];
    tok.style.transition = reduced() ? 'none' : 'left .42s ease-in-out, top .42s ease-in-out';
    tok.style.left = x + '%'; tok.style.top = y + '%';
    setTimeout(step, reduced() ? 0 : 440);
  };
  if(!walking) step();
}

/* ---------------- Battle ---------------- */
let B = null; // { room, hp, busy, won }
function enterBattle(i){
  if(!unlocked(i) || !beltList(i).length) return;
  const room = D.ROOMS[i];
  if(S.cleared[i] || S.roomHp[i] == null || S.roomHp[i] <= 0) S.roomHp[i] = room.hp;
  B = { room:i, busy:false, won:false };
  save(); show('battle');
  $('stage-bg').style.backgroundImage = `url(assets/scenes/room${i+1}.webp)`;
  const m = $('b-monster'); m.className = 'b-monster'; m.src = `assets/monsters/m${i+1}.webp`; m.alt = room.monster; m.style.opacity = '';
  $('b-name').textContent = room.monster;
  setAvatarImg($('b-hero'));
  renderHP(true); renderBattleSide();
  message(`${room.monster} blocks the way! Pick a potion to throw.`);
}
function renderHP(instant){
  const room = D.ROOMS[B.room], hp = Math.max(0, S.roomHp[B.room]), pct = hp / room.hp * 100;
  const f = $('hp-fill'), g = $('hp-ghost');
  if(instant){ f.style.transition = g.style.transition = 'none'; }
  f.style.width = pct + '%'; g.style.width = pct + '%';
  f.style.background = pct > 50 ? '' : pct > 25 ? 'linear-gradient(#ffe36c,#e0a82e)' : 'linear-gradient(#ff9a6c,#d64b2a)';
  if(instant){ void f.offsetWidth; f.style.transition = g.style.transition = ''; }
  $('hp-num').textContent = `${hp} / ${room.hp} HP`;
}
function renderBattleSide(){
  const lv = levelOf(S.xp), cur = D.XP_RANKS[lv-1][0], nxt = D.XP_RANKS[lv] ? D.XP_RANKS[lv][0] : null;
  $('b-level').textContent = `Level ${lv}`; $('b-xprank').textContent = xpRankName(lv);
  $('xp-fill').style.width = nxt ? ((S.xp - cur) / (nxt - cur) * 100) + '%' : '100%';
  $('xp-text').textContent = nxt ? `${S.xp} XP · ${nxt - S.xp} XP to ${D.XP_RANKS[lv][1]}` : `${S.xp} XP · Top rank!`;
  const list = beltList(B.room);
  if(B.won){
    $('b-belt').innerHTML = `<div class="readiness">🌟 Room calmed! The ${esc(D.ROOMS[B.room].monster)} wandered home.</div><button class="btn gold xl" id="won-map">🗺️ Back to the map</button>`;
    $('won-map').onclick = leaveBattle; setTimeout(() => $('won-map') && $('won-map').focus(), 30); return;
  }
  if(!list.length){
    $('b-belt').innerHTML = `<div class="readiness empty">🎒 Out of potions! The ${esc(D.ROOMS[B.room].monster)} will wait here — its HP stays where you left it. Spell more words to brew potions.</div><button class="btn gold xl" id="go-brew">✍️ Go brew more</button>`;
    $('go-brew').onclick = () => show('desk'); return;
  }
  $('b-belt').innerHTML = list.map((x, k) => { const r = D.RECIPES[x.ri], dmg = r.tier + (x.label === 'Its favorite' ? 1 : 0);
    return `<button class="throw-btn" data-ri="${x.ri}" ${B.busy ? 'disabled' : ''}>${bottleSVG(x.ri)}<div><div class="tn">Throw ${esc(r.name)}</div><div class="tc ${x.cls}">${x.label} · ${Math.round(x.p*100)}% · ${dmg} damage</div><div class="key">Press ${k+1}</div></div><span class="cnt">×${x.n}</span></button>`; }).join('');
}
function message(t){ const m = $('b-msg'); m.textContent = t; m.classList.remove('show'); void m.offsetWidth; m.classList.add('show'); }
function throwPotion(ri){
  if(!B || B.busy || B.won || !(S.belt[ri] > 0)) return;
  B.busy = true;
  const room = D.ROOMS[B.room], info = hitInfo(ri, B.room), r = D.RECIPES[ri];
  S.belt[ri]--; save();
  const hit = rng() < info.p;
  renderBattleSide();
  const hero = $('b-hero'); hero.classList.remove('throw'); void hero.offsetWidth; hero.classList.add('throw');
  A.play('whoosh');
  const stage = $('stage'), sr = stage.getBoundingClientRect(), hr = hero.getBoundingClientRect(), mr = $('b-monster').getBoundingClientRect();
  const x0 = hr.right - sr.left - 20, y0 = hr.top - sr.top + hr.height * 0.3;
  const x1 = mr.left - sr.left + mr.width * 0.5, y1 = mr.top - sr.top + mr.height * 0.45;
  const fly = document.createElement('div'); fly.className = 'flying'; fly.innerHTML = bottleSVG(ri); $('b-fx').appendChild(fly);
  const dur = reduced() ? 1 : 720, peak = Math.min(y0, y1) - sr.height * 0.28, t0 = performance.now();
  const frame = now => {
    const t = Math.min(1, (now - t0) / dur);
    const x = x0 + (x1 - x0) * t;
    const y = (1-t)*(1-t)*y0 + 2*(1-t)*t*peak + t*t*y1; // quadratic bezier arc
    fly.style.transform = `translate(${x - 24}px, ${y - 35}px) rotate(${t * 540}deg) scale(${1 + Math.sin(t * Math.PI) * 0.25})`;
    if(t < 1) requestAnimationFrame(frame); else { fly.remove(); land(hit, ri, x1, y1, info, room, r); }
  };
  requestAnimationFrame(frame);
}
function puffs(x, y, color, n, spread){
  if(reduced()) n = Math.min(n, 4);
  for(let i = 0; i < n; i++){
    const p = document.createElement('div'); p.className = 'puff';
    const a = rng() * Math.PI * 2, d = spread * (0.4 + rng() * 0.6);
    p.style.left = x + 'px'; p.style.top = y + 'px'; p.style.background = `radial-gradient(circle, #fff, ${color} 60%, transparent 72%)`;
    p.style.setProperty('--dx', Math.cos(a) * d + 'px'); p.style.setProperty('--dy', Math.sin(a) * d + 'px');
    p.style.width = p.style.height = (20 + rng() * 26) + 'px';
    $('b-fx').appendChild(p); setTimeout(() => p.remove(), 800);
  }
}
function floatText(x, y, text, cls){ const d = document.createElement('div'); d.className = 'dmg ' + (cls || ''); d.textContent = text; d.style.left = x + 'px'; d.style.top = y + 'px'; $('b-fx').appendChild(d); setTimeout(() => d.remove(), 1200); }
function land(hit, ri, x, y, info, room, r){
  const m = $('b-monster'), lvBefore = levelOf(S.xp);
  if(hit){
    const fav = info.label === 'Its favorite', dmg = r.tier + (fav ? 1 : 0), xp = r.tier * 8 + (fav ? 6 : 0);
    S.roomHp[B.room] = Math.max(0, S.roomHp[B.room] - dmg); S.xp += xp; save();
    A.play('hit'); puffs(x, y, D.LIQUID[r.color], 14, 110);
    floatText(x, y - 40, `-${dmg}`); setTimeout(() => floatText(x - 90, y - 10, `+${xp} XP`, 'fizz'), 180);
    m.className = 'b-monster'; void m.offsetWidth; m.classList.add('hit');
    const st = $('stage'); st.classList.remove('shake'); void st.offsetWidth; if(!reduced()) st.classList.add('shake');
    message((fav ? '💖 Its favorite! ' : '') + pickOne(room.hits));
    renderHP(false);
  } else {
    A.play('fizzle'); puffs(x, y, '#cfd8e6', 8, 70); floatText(x, y - 30, 'fizzle…', 'fizz');
    message(pickOne(D.FIZZLES));
  }
  const after = () => {
    m.className = 'b-monster';
    if(S.roomHp[B.room] <= 0){ win(); }
    else { B.busy = false; renderBattleSide(); const first = document.querySelector('.throw-btn'); if(first) first.focus(); }
    const lvNow = levelOf(S.xp); if(lvNow > lvBefore) setTimeout(() => levelUp(lvNow), B.won ? 2600 : 300);
    refreshTop();
  };
  setTimeout(after, reduced() ? 50 : 700);
}
function win(){
  const i = B.room, room = D.ROOMS[i], m = $('b-monster');
  B.won = true; B.busy = false; S.cleared[i] = true; S.roomHp[i] = room.hp; save();
  m.classList.add('dizzy'); message(room.home); A.play('win');
  setTimeout(() => { m.classList.remove('dizzy'); m.classList.add('home'); }, reduced() ? 10 : 1600);
  renderBattleSide(); confetti(40, D.RECIPES[room.fav].color);
}
function levelUp(lv){
  $('lu-rank').textContent = `Level ${lv}: ${xpRankName(lv)}`;
  const opens = D.ROOMS.map((r, i) => ({ r, i })).filter(x => x.r.level === lv).map(x => x.r.name);
  $('lu-sub').textContent = opens.length ? `New rooms can open: ${opens.join(', ')}` : 'Your throwing arm grows stronger!';
  $('levelup').hidden = false; A.play('levelup'); confetti(60, 'gold'); setTimeout(() => $('lu-ok').focus(), 30);
}
function leaveBattle(){ if(B && B.busy) return; B = null; show('dungeon'); }

/* ---------------- Spellbook ---------------- */
function openBook(){
  const lv = levelOf(S.xp);
  const stat = (k, v) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div></div>`;
  $('book-stats').innerHTML = `<div class="stat"><div class="k">Name</div><div class="v">${esc(S.name || 'Apprentice')}</div></div>
    <div class="stat"><img id="book-portrait" alt="Your apprentice"></div>
    <div class="stat"><div class="k">Rank</div><div class="v" style="font-size:20px">${esc(brewRank())}<br><span class="small">Lv ${lv} ${esc(xpRankName(lv))}</span></div></div>
    ${stat('Streak', S.streak)}${stat('Best streak', S.bestStreak)}${stat('Words tried', S.tried)}${stat('Words correct', S.correctTotal)}${stat('First tries', S.firstTryTotal)}`;
  setAvatarImg($('book-portrait'));
  const ws = Object.entries(S.words);
  const mastered = ws.filter(([, s]) => s.mastered).map(([id]) => id).sort();
  const review = ws.filter(([, s]) => s.review && !s.mastered).map(([id]) => id).sort();
  $('mastered-n').textContent = `(${mastered.length})`;
  $('mastered').innerHTML = mastered.length ? mastered.map(id => `<span class="wchip">✔ ${esc(BY_ID[id] ? BY_ID[id].word : id)}</span>`).join('') : '<span class="muted">Spell a word right on the first try twice to master it.</span>';
  $('review').innerHTML = review.length ? review.map(id => `<button class="wchip" data-practice="${esc(id)}">↻ ${esc(BY_ID[id] ? BY_ID[id].word : id)}</button>`).join('') : '<span class="muted">No review words yet.</span>';
  $('set-sound').checked = S.sound; $('set-count').checked = S.showCount;
  $('book').hidden = false; $('book-close').focus();
}
function closeBook(){ $('book').hidden = true; focusInput(); }
function practice(id){
  closeBook();
  if(R && R.phase !== 'done' && R.w.id !== id){ /* abandoning a word mid-round does not count against it */ }
  S.current = null; show('desk'); $('spell-input').readOnly = false; startRound(id); focusInput();
}
function resetAll(){
  const keep = { gender:S.gender, hair:S.hair, face:S.face, skin:S.skin, photo:S.photo, usePhoto:S.usePhoto, name:S.name, sound:S.sound, showCount:S.showCount };
  S = Object.assign(defaults(), keep); save(); A.set(S.sound);
  R = null; $('confirm').hidden = true; $('book').hidden = true; show('gate');
}

/* ---------------- Overlays & keys ---------------- */
function anyOverlay(){ return ['brew','book','levelup','confirm','cam'].some(id => !$(id).hidden); }
function onKey(e){
  if(e.key === 'Escape'){
    if(!$('confirm').hidden){ $('confirm').hidden = true; return; }
    if(!$('levelup').hidden){ $('levelup').hidden = true; focusInput(); return; }
    if(!$('brew').hidden){ closeBrew(); return; }
    if(!$('cam').hidden){ closeCamera(); return; }
    if(!$('book').hidden){ closeBook(); return; }
    if(screen === 'battle'){ leaveBattle(); return; }
    if(screen === 'dungeon'){ show('desk'); return; }
    return;
  }
  if(anyOverlay()) return;
  if(screen === 'dungeon' && document.activeElement.tagName !== 'INPUT'){
    if(e.key === 'ArrowRight' || e.key === 'ArrowDown'){ e.preventDefault(); selectRoom(Math.min(7, S.selRoom + 1), true); }
    if(e.key === 'ArrowLeft' || e.key === 'ArrowUp'){ e.preventDefault(); selectRoom(Math.max(0, S.selRoom - 1), true); }
    if(e.key === 'Enter' && document.activeElement.classList.contains('room')){ e.preventDefault(); if(unlocked(S.selRoom)) enterBattle(S.selRoom); }
  }
  if(screen === 'battle' && /^[1-9]$/.test(e.key)){ const b = document.querySelectorAll('.throw-btn')[+e.key - 1]; if(b) b.click(); }
}

/* ---------------- Wiring ---------------- */
function wire(){
  $('gate-enter').onclick = enterTower;
  $('gate-name').addEventListener('keydown', e => { if(e.key === 'Enter') enterTower(); });
  $('mk-gender').onclick = e => { const b = e.target.closest('[data-g]'); if(b){ A.play('click'); setGender(b.dataset.g); } };
  $('mk-hair').onclick = e => { const b = e.target.closest('[data-hair]'); if(b){ S.hair = b.dataset.hair; S.usePhoto = false; save(); A.play('click'); renderGate(); } };
  $('mk-face').onclick = e => { const b = e.target.closest('[data-face]'); if(b){ S.face = b.dataset.face; S.usePhoto = false; save(); A.play('click'); renderGate(); } };
  $('mk-skin').onclick = e => { const b = e.target.closest('[data-skin]'); if(b){ S.skin = +b.dataset.skin; S.usePhoto = false; save(); A.play('click'); renderGate(); } };
  $('gate-name').addEventListener('input', () => { S.name = $('gate-name').value.slice(0, 20); save(); });
  $('ph-file').onclick = () => $('ph-input').click();
  $('ph-input').onchange = onFile;
  $('ph-camera').onclick = openCamera;
  $('ph-back').onclick = () => { S.usePhoto = !S.usePhoto && !!S.photo; save(); renderGate(); };
  $('cam-snap').onclick = snap; $('cam-cancel').onclick = closeCamera;

  $('nav-gate').onclick = () => show('gate');
  $('nav-desk').onclick = () => show('desk');
  $('nav-dungeon').onclick = () => show('dungeon');
  $('nav-book').onclick = openBook;
  $('nav-sound').onclick = () => { S.sound = !S.sound; A.set(S.sound); save(); refreshTop(); };

  const inp = $('spell-input');
  inp.addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); check(); } });
  const noPaste = e => { e.preventDefault(); setFeedback('Type it yourself. Your hand is the spell.', 'bad'); };
  inp.addEventListener('paste', noPaste); inp.addEventListener('drop', noPaste);
  inp.addEventListener('beforeinput', e => { if(e.inputType === 'insertFromPaste' || e.inputType === 'insertFromDrop' || e.inputType === 'insertReplacementText') noPaste(e); });
  inp.addEventListener('contextmenu', e => e.preventDefault());
  $('check-btn').onclick = check;
  // keep the typing box focused when the child clicks desk buttons
  $('desk').addEventListener('mousedown', e => { if(e.target.closest('button') && !e.target.closest('#study')) e.preventDefault(); });
  $('say-word').onclick = () => { say(R.w.word, 0.9); focusInput(); };
  $('say-slow').onclick = () => { say(R.w.word, 0.5); focusInput(); };
  $('say-sentence').onclick = () => { say(R.w.sentence, 0.9); focusInput(); };
  $('study-cover').onclick = coverWord; $('study-look').onclick = lookAgain;
  $('brew-ok').onclick = closeBrew;

  $('map').addEventListener('click', e => { const b = e.target.closest('.room'); if(b){ A.play('click'); selectRoom(+b.dataset.room); } });
  $('map').addEventListener('dblclick', e => { const b = e.target.closest('.room'); if(b && unlocked(+b.dataset.room)) enterBattle(+b.dataset.room); });
  $('b-belt').addEventListener('click', e => { const b = e.target.closest('.throw-btn'); if(b) throwPotion(+b.dataset.ri); });
  $('b-leave').onclick = leaveBattle;
  $('lu-ok').onclick = () => { $('levelup').hidden = true; focusInput(); };

  $('book-close').onclick = closeBook;
  $('book').addEventListener('click', e => { if(e.target.id === 'book') closeBook(); const p = e.target.closest('[data-practice]'); if(p) practice(p.dataset.practice); });
  $('set-sound').onchange = e => { S.sound = e.target.checked; A.set(S.sound); save(); refreshTop(); };
  $('set-count').onchange = e => { S.showCount = e.target.checked; save(); if(R && R.phase !== 'done' && R.phase !== 'study') { renderSlots(false); $('letter-count').hidden = !S.showCount; $('letter-count').textContent = S.showCount ? `${R.w.word.replace(/'/g,'').length} letters${R.w.word.includes("'") ? ' + an apostrophe' : ''}` : ''; } };
  $('book-apprentice').onclick = () => { closeBook(); show('gate'); };
  $('book-reset').onclick = () => { $('confirm').hidden = false; $('confirm-no').focus(); };
  $('confirm-yes').onclick = resetAll; $('confirm-no').onclick = () => { $('confirm').hidden = true; };
  document.addEventListener('keydown', onKey);
  if(window.speechSynthesis){ pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
}

/* ---------------- Boot ---------------- */
load(); A.set(S.sound); wire();
show('gate');
window.__sb = {
  get state(){ return S; }, get round(){ return R; }, setRng(fn){ rng = fn || Math.random; }, save, pickWord, score, norm, blankSentence,
  startRound, show, levelOf, unlocked, hitInfo, beltList, reload(){ load(); A.set(S.sound); }
};
})();
