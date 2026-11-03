/* Spellbrew Academy end-to-end tests. Run: node tests/run.js  (Chrome at /usr/bin/google-chrome, 1366x768, file://) */
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), URL = 'file://' + ROOT + '/index.html', SHOTS = path.join(ROOT, 'screenshots');
fs.mkdirSync(SHOTS, { recursive: true });
let pass = 0, fail = 0; const results = [];
function ok(cond, msg){ if(cond){ pass++; } else { fail++; results.push('  ✗ ' + msg); throw new Error(msg); } }
async function fresh(browser, opts = {}){
  const ctx = await browser.newContext({ viewport:{ width:1366, height:768 }, reducedMotion: opts.reduced ? 'reduce' : 'no-preference' });
  const p = await ctx.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(200);
  return p;
}
async function enter(p, name = 'Maya'){ await p.fill('#gate-name', name); await p.click('#gate-enter'); await p.waitForSelector('#desk:not([hidden])'); }
const word = p => p.evaluate(() => __sb.round.w.word);
async function typeAndEnter(p, text){ await p.fill('#spell-input', ''); await p.type('#spell-input', text); await p.keyboard.press('Enter'); await p.waitForTimeout(120); }
async function spellRight(p){ const w = await word(p); await typeAndEnter(p, w); await p.keyboard.press('Enter'); await p.waitForTimeout(80); }

const tests = {
  async 'gate: layout, maker rows, combinations, all 576 portraits exist'(b){
    const p = await fresh(b);
    ok(await p.isVisible('#gate'), 'gate visible');
    ok(await p.textContent('label[for=gate-name]') === 'What should the tower call you?', 'name prompt');
    ok(await p.textContent('#gate-enter') === 'Enter the tower', 'enter button text');
    ok(await p.$$eval('#mk-hair .opt', a => a.length) === 6, '6 hair'); ok(await p.$$eval('#mk-face .opt', a => a.length) === 6, '6 faces');
    ok(await p.$$eval('#mk-skin .opt', a => a.length) === 8, '8 skins');
    ok(await p.$eval('.gate-left', e => getComputedStyle(e).position) === 'sticky', 'left column sticky');
    await p.click('#mk-gender [data-g=b]'); await p.click('#mk-hair [data-hair=curls]'); await p.click('#mk-face [data-face=glasses]'); await p.click('#mk-skin [data-skin="7"]');
    const src = await p.getAttribute('#gate-portrait', 'src');
    ok(src.endsWith('b_7_curls_glasses.webp'), 'combined choice portrait ' + src);
    await p.waitForTimeout(300);
    ok(await p.$eval('#gate-portrait', i => i.complete && i.naturalWidth > 0), 'portrait loaded');
    ok((await p.textContent('#gate-choice-label')).includes('Curls · Glasses · Skin tone 7'), 'choice label');
    const D = await p.evaluate(() => ({ H: SB_DATA.HAIR, F: SB_DATA.FACES }));
    let n = 0; for(const g of ['g','b']) for(let s = 1; s <= 8; s++) for(const [h] of D.H[g]) for(const [f] of D.F[g]){ ok(fs.existsSync(path.join(ROOT, `assets/portraits/${g}_${s}_${h}_${f}.webp`)), `missing ${g}_${s}_${h}_${f}`); n++; }
    ok(n === 576, '576 combos');
    await p.click('#mk-gender [data-g=g]'); await p.click('#mk-hair [data-hair=braids]'); await p.click('#mk-face [data-face=smile]'); await p.click('#mk-skin [data-skin="4"]');
    await p.fill('#gate-name', 'Maya');
    await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(SHOTS, 'gate.png') });
    ok(!p.errs.length, 'no page errors: ' + p.errs.join('; '));
  },
  async 'gate: photo mode cuts out offline, shows everywhere, can switch back'(b){
    const p = await fresh(b);
    await p.setInputFiles('#ph-input', path.join(__dirname, 'fixtures/test_kid.jpg'));
    await p.waitForFunction(() => /Done|could not|not find/.test(document.getElementById('ph-status').textContent), null, { timeout: 90000 });
    ok((await p.textContent('#ph-status')).startsWith('Done'), 'photo processed');
    ok((await p.getAttribute('#gate-portrait', 'src')).startsWith('data:image/jpeg'), 'gate uses photo');
    await enter(p);
    ok((await p.getAttribute('#tb-avatar', 'src')).startsWith('data:image/jpeg'), 'header uses photo');
    await p.evaluate(() => { __sb.state.belt = { 0: 1 }; __sb.save(); });
    await p.click('#nav-dungeon'); await p.waitForTimeout(300);
    ok((await p.getAttribute('#map .token img', 'src')).startsWith('data:image/jpeg'), 'map token uses photo');
    await p.click('#enter-room'); await p.waitForTimeout(200);
    ok((await p.getAttribute('#b-hero', 'src')).startsWith('data:image/jpeg'), 'battle uses photo');
    await p.click('#nav-gate'); await p.click('#ph-back');
    ok((await p.getAttribute('#gate-portrait', 'src')).includes('assets/portraits/'), 'switched back to portrait');
    ok(await p.evaluate(() => !!__sb.state.photo), 'photo kept on device for switching again');
    fs.writeFileSync(path.join(SHOTS, 'photo-cutout.jpg'), Buffer.from((await p.evaluate(() => __sb.state.photo)).split(',')[1], 'base64'));
  },
  async 'spelling: correct first try, case + curly apostrophe, tiles, streak, focus, paste blocked'(b){
    const p = await fresh(b); await enter(p);
    await p.evaluate(() => __sb.startRound("don't")); await p.waitForTimeout(50);
    ok(await p.isVisible('#apos-note'), 'apostrophe note shown');
    ok((await p.textContent('#w-sent')).includes('____'), 'sentence blank');
    ok(!(await p.textContent('#w-sent')).toLowerCase().includes("don't"), 'word hidden in sentence');
    ok((await p.textContent('.enter-hint')).includes('Enter'), 'enter note next to button');
    ok(await p.evaluate(() => document.activeElement.id) === 'spell-input', 'input focused');
    // paste is blocked
    await p.evaluate(() => { const dt = new DataTransfer(); dt.setData('text/plain', "don't"); document.getElementById('spell-input').dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); });
    ok(await p.textContent('#feedback') === 'Type it yourself. Your hand is the spell.', 'paste message');
    ok(await p.inputValue('#spell-input') === '', 'paste did not insert');
    await typeAndEnter(p, 'DON\u2019T');
    ok((await p.textContent('#feedback')).includes('First try'), 'first try feedback');
    ok(await p.$$eval('#tile-history .tile.g', a => a.length) === 5, '5 green tiles');
    ok(await p.textContent('#tb-streak') === '1', 'streak 1');
    ok(await p.$$eval('#recipe-slots li.filled', a => a.length) === 1, 'slot filled');
    ok(await p.evaluate(() => document.activeElement.id) === 'spell-input', 'input keeps focus');
    await p.keyboard.press('Enter'); await p.waitForTimeout(80);
    ok(await p.evaluate(() => __sb.round.w.id !== "don't" && __sb.round.phase === 'spell'), 'Enter moves to next word');
    // second first-try success masters the word
    await p.evaluate(() => __sb.startRound("don't")); await typeAndEnter(p, "don't");
    ok(await p.evaluate(() => __sb.state.words["don't"].mastered === true), 'two first tries master the word');
    ok((await p.textContent('#feedback')).includes('MASTERED'), 'mastered message');
  },
  async 'spelling: miss 1 tiles only, miss 2 hint + starts-with, miss 3 study, cover, look again, review'(b){
    const p = await fresh(b); await enter(p);
    await p.evaluate(() => __sb.startRound('friend')); await p.waitForTimeout(50);
    await typeAndEnter(p, 'freand');
    ok(await p.$eval('#spell-input', e => e.classList.contains('shake')), 'box shakes');
    let fb = await p.textContent('#feedback');
    ok(fb === 'Not quite. Check your tiles and try again.', 'miss 1: tiles only, no hint text: ' + fb);
    ok(!fb.includes('Hint') && !fb.includes('starts with') && !fb.includes("I before E"), 'miss 1: no hint, no starts-with');
    const marks = await p.$$eval('#tile-history .tile-row:last-child .tile', a => a.map(t => t.className.split(' ')[1]).join(''));
    ok(marks === 'ggyxgg', 'wordle marks ' + marks);
    const bg = await p.$$eval('#tile-history .tile', a => a.map(t => getComputedStyle(t).backgroundColor));
    ok(bg[0] === 'rgb(76, 175, 80)' && bg[2] === 'rgb(224, 168, 46)' && bg[3] === 'rgb(154, 160, 166)', 'green / gold / gray colors ' + bg.join(' '));
    ok(await p.isVisible('#tile-key'), 'color key shown');
    ok(await p.textContent('#tb-streak') === '0', 'streak reset');
    await p.waitForTimeout(1000);
    await p.screenshot({ path: path.join(SHOTS, 'desk.png') });
    await typeAndEnter(p, 'frend');
    ok(await p.$eval('#spell-input', e => e.classList.contains('shake')), 'box shakes on miss 2');
    fb = await p.textContent('#feedback');
    ok(fb.startsWith('Hint: ') && fb.includes(await p.evaluate(() => __sb.round.w.hint)) && fb.includes('it starts with "f'), 'miss 2: hint + starts-with');
    ok(await p.$$eval('#tile-history .tile-row', a => a.length) === 2, 'miss 2: tiles too');
    ok(!(await p.isVisible('#study')), 'word not shown yet');
    await typeAndEnter(p, 'frennd');
    ok(await p.$$eval('#tile-history .tile-row', a => a.length) === 3, 'miss 3: tiles too');
    ok(await p.isVisible('#study'), 'study step after 3 misses');
    ok(await p.textContent('#study-word') === 'friend' && (await p.textContent('#study-syl')) === 'friend', 'study word + syllables');
    ok(await p.isDisabled('#spell-input'), 'input locked while studying');
    await p.click('#study-cover');
    ok(await p.$eval('#study-word', e => e.classList.contains('covered')), 'word covered');
    await typeAndEnter(p, 'freind');
    ok(await p.isVisible('#study-look'), 'look again offered');
    await p.click('#study-look'); ok(!(await p.$eval('#study-word', e => e.classList.contains('covered'))), 'look again uncovers');
    await p.click('#study-cover'); await typeAndEnter(p, 'friend');
    ok((await p.textContent('#feedback')).includes('from memory'), 'cover success');
    const st = await p.evaluate(() => __sb.state.words.friend);
    ok(st.review === true && st.mastered === false && st.firstTries === 0, 'cover success → review, not mastered');
    ok(await p.$$eval('#recipe-slots li.filled', a => a.length) === 1, 'cover success fills a slot');
    // non-first-try correct also puts on review
    await p.keyboard.press('Enter');
    await p.evaluate(() => __sb.startRound('because')); await typeAndEnter(p, 'becuase'); await typeAndEnter(p, 'because');
    ok(await p.evaluate(() => __sb.state.words.because.review && !__sb.state.words.because.mastered), 'second-try correct → review');
    ok(await p.textContent('#tb-streak') === '0', 'non-first-try does not add to streak');
  },
  async 'scoring + word selection rules'(b){
    const p = await fresh(b); await enter(p);
    ok(await p.evaluate(() => __sb.score('lettre', 'letter').join('')) === 'ggggyy', 'score repeated letters');
    ok(await p.evaluate(() => __sb.score('aaa', 'abc').join('')) === 'gxx', 'score extra letters grey');
    ok(await p.evaluate(() => __sb.norm(' It\u2019S ')) === "it's", 'normalise');
    ok(await p.evaluate(() => __sb.blankSentence({ word:'thumb', sentence:'She gave a thumbs-up with her thumb.' })) === 'She gave a thumbs-up with her ____.', 'word-boundary blank');
    const r = await p.evaluate(() => {
      const S = __sb.state; let seed = 7; __sb.setRng(() => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; });
      // cooldown: simulate 60 completed rounds
      let bad = 0, counts = {};
      for(let i = 0; i < 60; i++){ const { w, why } = __sb.pickWord(); if(S.recent.slice(-6).includes(w.id)) bad++; counts[why] = (counts[why]||0)+1; S.recent.push(w.id); const s = S.words[w.id] || (S.words[w.id] = {tries:0,correct:0,firstTries:0,mastered:false,review:false}); s.tries++; }
      // review share: mark 10 tier-1 words for review
      S.recent = []; SB_WORDS.filter(w => w.tier === 1).slice(0, 10).forEach(w => S.words[w.id].review = true);
      let rev = 0; for(let i = 0; i < 2000; i++) if(__sb.pickWord().why === 'review') rev++;
      // fallback: all tier-1 words mastered → "any except last"
      SB_WORDS.filter(w => w.tier === 1).forEach(w => S.words[w.id] = {tries:2,correct:2,firstTries:2,mastered:true,review:false});
      S.recent = ['because']; const any = new Set(); for(let i = 0; i < 300; i++) any.add(__sb.pickWord().w.id);
      // tier after 8 potions stays 4
      S.potionsMade = 8; S.recipeIdx = 0; const t4 = __sb.pickWord().w.tier;
      __sb.setRng(null);
      return { bad, counts, rev, anyHasLast: any.has('because'), anySize: any.size, t4 };
    });
    ok(r.bad === 0, 'no pick from last 6');
    ok(r.counts.fresh > 0 && r.counts.unmastered > 0, 'fresh then unmastered ' + JSON.stringify(r.counts));
    ok(r.rev > 330 && r.rev < 480, 'about 1 in 5 from review: ' + r.rev + '/2000');
    ok(!r.anyHasLast && r.anySize === 19, 'fallback any-except-last');
    ok(r.t4 === 4, 'tier stays 4 after recipe 8');
  },
  async 'brewing: 2 words fill Spark Dew, centered brew, belt, rank, cycle'(b){
    const p = await fresh(b); await enter(p);
    for(let i = 0; i < 2; i++){ const w = await word(p); await typeAndEnter(p, w); if(i < 1){ await p.keyboard.press('Enter'); await p.waitForTimeout(60); } }
    await p.waitForSelector('#brew:not([hidden])', { timeout: 3000 });
    ok((await p.textContent('#brew-name')) === 'Spark Dew', 'brew name');
    const box = await p.$eval('.brew-card', e => { const r = e.getBoundingClientRect(); return { cx: r.left + r.width/2, cy: r.top + r.height/2 }; });
    ok(Math.abs(box.cx - 683) < 10 && Math.abs(box.cy - 384) < 20, 'brew moment centered');
    await p.waitForTimeout(700);
    await p.screenshot({ path: path.join(SHOTS, 'brew.png') });
    ok(await p.evaluate(() => document.activeElement.id) === 'brew-ok', 'brew button focused');
    await p.keyboard.press('Enter'); await p.waitForTimeout(100);
    ok(await p.isHidden('#brew'), 'Enter closes brew');
    const s = await p.evaluate(() => ({ belt: __sb.state.belt, ri: __sb.state.recipeIdx, rank: document.getElementById('tb-rank').textContent }));
    ok(s.belt[0] === 1 && s.ri === 1 && s.rank === 'Spark Keeper', 'belt/rank/next recipe ' + JSON.stringify(s));
    ok(await p.$$eval('#desk-belt svg', a => a.length) === 1, 'potion on belt');
    await p.evaluate(() => { __sb.state.recipeIdx = 7; __sb.state.slots = [0,1,2,3,4]; __sb.state.potionsMade = 7; __sb.state.distinct = [0,1,2,3,4,5,6]; __sb.save(); __sb.startRound(); });
    await p.keyboard.press('Enter'); await spellRight(p);
    await p.waitForSelector('#brew:not([hidden])');
    ok(await p.evaluate(() => __sb.state.recipeIdx === 0 && __sb.state.potionsMade === 8), 'cycles to recipe 1');
    ok((await p.textContent('#brew-sub')).includes('stay at Tier 4'), 'tier stays 4 note');
    await p.keyboard.press('Escape');
    ok(await p.textContent('#tb-rank') === 'Archmage', 'Archmage after all 8');
    await p.evaluate(() => { __sb.state.recipeIdx = 3; __sb.state.slots = [0]; __sb.save(); __sb.startRound(); });
    ok((await p.textContent('#recipe-blurb')).includes('1 of 4 ingredients'), 'recipe blurb + filled count');
    ok(await p.$$eval('#recipe-slots li', a => a.map(l => l.textContent.trim()).join('|')) === '🦁Lionmane|🐝Honeycomb|🌰Ember Seed|🍂Copper Leaf', 'Courage Cordial slots');
  },
  async 'dungeon: unlock rules, sealed doors, readiness wording, token walk, Esc'(b){
    const p = await fresh(b); await enter(p);
    await p.click('#nav-dungeon'); await p.waitForTimeout(200);
    ok(await p.$$eval('#map .room', a => a.length) === 8, '8 rooms');
    ok(await p.$$eval('#map .torch', a => a.length) >= 8, 'torches');
    const shapes = await p.$$eval('#map .room .floor', a => new Set(a.map(f => f.style.clipPath)).size); ok(shapes === 8, '8 different room shapes');
    ok(await p.$$eval('#map .rlabel', a => a.map(l => l.textContent).join('|')) === '1. Dusty Nook|2. Sealed door|3. Sealed door|4. Sealed door|5. Sealed door|6. Sealed door|7. Sealed door|8. Sealed door', 'only open rooms appear by name');
    ok(await p.$$eval('#map .rlabel', a => a.every(l => l.scrollWidth <= l.clientWidth + 1)), 'labels not cut off');
    let panel = await p.textContent('#room-panel');
    ok(panel.includes('Your belt is empty. Brew something first.'), 'empty belt wording');
    ok(panel.includes('Hint: Tiny sneezes and a little glitter.') && !panel.includes('Puffmite'), 'hint, not the monster name');
    ok(await p.textContent('#enter-room') === 'Open the door' && await p.isDisabled('#enter-room'), 'Open the door disabled with empty belt');
    ok(await p.evaluate(() => [0,1,2].map(__sb.unlocked).join()) === 'true,false,false', 'only room 1 open');
    await p.click('.room[data-room="2"]'); ok((await p.textContent('#room-panel')).includes('opens after you clear Dusty Nook'), 'locked reason names earlier room');
    // Moss Cellar (tier 1, weak to Moonmoss Tea) with only Spark Dew (same tier, not favorite)
    await p.evaluate(() => { const s = __sb.state; s.cleared[0] = true; s.belt = { 0: 1 }; __sb.save(); __sb.show('dungeon'); });
    ok(await p.textContent('.room[data-room="1"] .rlabel') === '2. Moss Cellar', 'room 2 appears once room 1 is cleared');
    await p.click('.room[data-room="1"]'); await p.waitForTimeout(100);
    ok((await p.textContent('#room-panel')).includes('You can try. A potion might fizzle.'), 'same-tier non-favorite wording');
    await p.evaluate(() => { __sb.state.belt = { 1: 1 }; __sb.save(); __sb.show('dungeon'); });
    ok((await p.textContent('#room-panel')).includes('Your belt can handle this door.'), 'favorite → can handle');
    await p.evaluate(() => { __sb.state.belt = { 2: 1 }; __sb.save(); __sb.show('dungeon'); });
    ok((await p.textContent('#room-panel')).includes('Your belt can handle this door.'), 'higher tier → can handle');
    // Dim Gallery needs level 2 (24 XP); Cloak Closet is also level 2
    await p.evaluate(() => { const s = __sb.state; s.cleared[1] = true; s.belt = { 2: 1, 0: 2 }; __sb.save(); __sb.show('dungeon'); });
    ok(await p.evaluate(() => __sb.unlocked(1) && !__sb.unlocked(2)), 'room 3 needs level 2');
    await p.click('.room[data-room="2"]'); ok((await p.textContent('#room-panel')).includes('needs battle Level 2 (Bottle Tosser)'), 'level lock text');
    await p.evaluate(() => { __sb.state.xp = 24; __sb.save(); __sb.show('dungeon'); });
    ok(await p.evaluate(() => __sb.unlocked(2)), 'room 3 opens at level 2');
    await p.evaluate(() => { __sb.state.cleared[2] = true; __sb.save(); });
    ok(await p.evaluate(() => __sb.unlocked(3)), 'Cloak Closet opens at level 2');
    await p.evaluate(() => { __sb.state.cleared[2] = false; __sb.save(); __sb.show('dungeon'); });
    await p.click('.room[data-room="2"]'); await p.waitForTimeout(1200);
    { const mp = await p.evaluate(() => [__sb.state.mapPos, __sb.state.selRoom, __sb.unlocked(2)]); ok(mp[0] === 2, 'token walked to room 3 ' + mp); }
    panel = await p.textContent('#room-panel');
    ok(panel.includes('3. Dim Gallery') && panel.includes('Hint: Soft wings in the dark.') && !panel.includes('Gloom Moth'), 'Dim Gallery hint without name');
    await p.screenshot({ path: path.join(SHOTS, 'dungeon.png') });
    await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(100); ok(await p.evaluate(() => __sb.state.selRoom) === 1, 'arrow keys select');
    await p.keyboard.press('Escape'); await p.waitForTimeout(100);
    ok(await p.isVisible('#desk'), 'Esc returns to spelling');
  },
  async 'spec data: recipes, rooms, ranks, words match the spec verbatim; XP balance'(b){
    const p = await fresh(b);
    const D = await p.evaluate(() => SB_DATA), W = await p.evaluate(() => SB_WORDS);
    const rec = D.RECIPES.map(r => `${r.name} (tier ${r.tier}): ${r.ings.map(i => i.name).join(', ')}`).join('\n');
    ok(rec === [
      'Spark Dew (tier 1): Dewdrop, Glowdust',
      'Moonmoss Tea (tier 1): Moonmoss, Star Sugar, Brookwater',
      'Firefly Phial (tier 2): Firefly, Amber Sap, Glass Shard',
      'Courage Cordial (tier 2): Lionmane, Honeycomb, Ember Seed, Copper Leaf',
      'Memory Mist (tier 3): Forget-me-not, Silver Ink, Owl Feather, Midnight Oil',
      'Stormbottle (tier 3): Thunder Salt, Cloudwool, Rain Pearl, Gale Seed, Lightning Wick',
      'Dragonscale Draught (tier 4): Dragon Scale, Crimson Berry, Ash, Gold Dust, Phoenix Down',
      'Archmage Elixir (tier 4): Starcore, Void Lily, Time Sand, Moonstone, Ancient Root, Wizard\u2019s Tear'].join('\n'), 'recipes:\n' + rec);
    ok(D.RECIPES.every(r => r.blurb && r.ings.every(i => i.icon && ['dew','moss','gold','ember','storm','night'].includes(i.liquid))), 'icons, liquids, blurbs');
    const rooms = D.ROOMS.map(r => [r.name, r.level, r.hint, r.monster, D.RECIPES[r.fav].name, r.hp].join(' / ')).join('\n');
    ok(rooms === [
      'Dusty Nook / 1 / Tiny sneezes and a little glitter. / Puffmite / Spark Dew / 4',
      'Moss Cellar / 1 / Wet leaves and something heavy hopping. / Moss Toad / Moonmoss Tea / 6',
      'Dim Gallery / 2 / Soft wings in the dark. / Gloom Moth / Firefly Phial / 8',
      'Cloak Closet / 2 / A squeak, then the coats go still. / Nervebat / Courage Cordial / 10',
      'Fog Landing / 3 / This hall can\u2019t quite remember you. / Muddle Wisp / Memory Mist / 12',
      'Storm Stair / 4 / The steps crackle under nothing. / Storm Cloud / Stormbottle / 14',
      'Cinder Hall / 5 / Warm scrapes along the stone. / Cinder Wyrmling / Dragonscale Draught / 16',
      'Lantern End / 6 / An old light is waiting. / Shade Herald / Archmage Elixir / 20'].join('\n'), 'rooms:\n' + rooms);
    ok(D.ROOMS.every(r => r.tier === D.RECIPES[r.fav].tier), 'room tier = favorite tier');
    ok(JSON.stringify(D.XP_RANKS) === JSON.stringify([[0,'Spark Hand'],[24,'Bottle Tosser'],[60,'Phial Knight'],[120,'Courtyard Adept'],[220,'Storm Caller'],[360,'Wyrm Warden'],[540,'Archmage\u2019s Arm']]), 'battle ranks');
    ok(D.BREW_RANKS.map(x => x[1]).join(', ') === 'Novice Apprentice, Spark Keeper, Cauldron Hand, Alchemist, Potion Master, Archmage', 'brewing ranks');
    ok(D.HAIR.g.map(h => h[1]).join(', ') === 'Long waves, Two puffs, Curls, Straight bangs, Side part, Braids', 'girl hair');
    ok(D.HAIR.b.map(h => h[1]).join(', ') === 'Short crop, Tousled, Side part, Curls, Buzz cut, Swept hair', 'boy hair');
    ok(D.FACES.g.map(h => h[1]).join(', ') === 'Smile, Calm, Freckles, Glasses, Bright, Wink' && D.FACES.b.map(h => h[1]).join(', ') === 'Smile, Calm, Freckles, Glasses, Bright, Grin', 'faces');
    const t = n => W.filter(w => w.tier === n).map(w => w.word);
    ok(['because','friend','beautiful'].every(w => t(1).includes(w)) && ['aisle','queue','rhyme','courageous'].every(w => t(4).includes(w)), 'anchor words in tiers');
    ok([1,2,3,4].map(n => t(n).length).join() === '20,30,40,30' && W.length === 120, 'tier sizes');
    ok(W.every(w => w.word && w.definition && w.hint && w.syllables && w.pattern && w.tier), 'word fields');
    ok(await p.evaluate(() => SB_WORDS.every(w => __sb.blankSentence(w).includes('____'))), 'every sentence gets a ____ blank');
    ok(['vowel','silent','homophone','contraction','suffix','double'].every(pt => W.some(w => w.pattern === pt)), 'patterns covered');
    ok(W.filter(w => w.tier === 3).some(w => w.pattern === 'homophone') && W.filter(w => w.tier === 3).some(w => w.pattern === 'suffix'), 'tier 3 homophones + endings');
    // XP balance: clear every room in order with only its favorite potion, all hits (the fewest XP possible for a clear).
    let xp = 0; const lv = x => D.XP_RANKS.filter(r => x >= r[0]).length; const log = [];
    D.ROOMS.forEach((r, i) => { const tier = D.RECIPES[r.fav].tier, dmg = tier + 1, hits = Math.ceil(r.hp / dmg);
      log.push(`${r.name}: arrive ${xp} XP (Lv ${lv(xp)}, needs ${r.level}) · ${hits} hits · +${hits * (tier * 8 + 6)}`);
      ok(lv(xp) >= r.level, `favorite-only play reaches ${r.name}: ${xp} XP`); xp += hits * (tier * 8 + 6); });
    log.push(`end ${xp} XP (Lv ${lv(xp)})`); fs.writeFileSync(path.join(ROOT, 'tests/xp-balance.txt'), log.join('\n') + '\n');
  },
  async 'battle: odds, damage, XP, fizzle uses bottle, win, wander home, level up'(b){
    const p = await fresh(b); await enter(p);
    const odds = await p.evaluate(() => [[0,0],[2,0],[3,2],[0,2]].map(([r, room]) => { const h = __sb.hitInfo(r, room); return h.p + ' ' + h.label; }));
    ok(odds.join('|') === '0.88 Its favorite|0.7 Strong|0.5 Might fizzle|0.32 Often fizzles', 'hit chances ' + odds);
    await p.evaluate(() => { __sb.state.belt = { 0: 2, 2: 1, 1: 1 }; __sb.save(); __sb.setRng(() => 0); });
    await p.click('#nav-dungeon'); await p.click('#enter-room'); await p.waitForSelector('#battle:not([hidden])');
    ok((await p.textContent('.throw-btn')).includes('Its favorite · 88% · 2 damage'), 'favorite listed first with damage');
    await p.click('.throw-btn[data-ri="0"]'); await p.waitForTimeout(760);
    await p.screenshot({ path: path.join(SHOTS, 'battle.png') });
    await p.waitForTimeout(600);
    let s = await p.evaluate(() => ({ hp: __sb.state.roomHp[0], xp: __sb.state.xp, belt0: __sb.state.belt[0] }));
    ok(s.hp === 2 && s.xp === 14 && s.belt0 === 1, 'favorite hit: 2 dmg, 14 XP ' + JSON.stringify(s));
    ok((await p.textContent('#hp-num')) === '2 / 4 HP', 'HP bar text');
    await p.evaluate(() => __sb.setRng(() => 0.99));
    await p.keyboard.press('2'); await p.waitForTimeout(1500);
    s = await p.evaluate(() => ({ hp: __sb.state.roomHp[0], xp: __sb.state.xp, belt: __sb.state.belt }));
    ok(s.hp === 2 && s.xp === 14, 'fizzle does no damage');
    ok(Object.values(s.belt).reduce((a, n) => a + n, 0) === 2, 'fizzle uses up the bottle');
    await p.evaluate(() => __sb.setRng(() => 0));
    await p.click('.throw-btn[data-ri="0"]'); await p.waitForTimeout(1600);
    s = await p.evaluate(() => ({ cleared: __sb.state.cleared[0], xp: __sb.state.xp }));
    ok(s.cleared && s.xp === 28, 'win clears room, XP 28');
    ok(await p.$eval('#b-monster', e => e.classList.contains('home') || e.classList.contains('dizzy')), 'creature dizzy/wanders home');
    ok((await p.textContent('#b-msg')).includes('home'), 'home message');
    await p.waitForSelector('#levelup:not([hidden])', { timeout: 5000 });
    ok((await p.textContent('#lu-rank')) === 'Level 2: Bottle Tosser', 'level up celebration');
    await p.keyboard.press('Enter'); await p.waitForTimeout(100); ok(await p.isHidden('#levelup'), 'level up closes');
    await p.keyboard.press('Escape'); await p.waitForTimeout(100); ok(await p.isVisible('#dungeon'), 'Esc leaves battle to map');
    ok(await p.evaluate(() => __sb.unlocked(1)), 'next room unlocked after clear');
    ok(await p.evaluate(() => __sb.levelOf(539) === 6 && __sb.levelOf(540) === 7 && __sb.levelOf(0) === 1), 'XP rank thresholds');
  },
  async 'spellbook: stats row, lists, practice, switches, Esc'(b){
    const p = await fresh(b); await enter(p, 'Maya');
    await p.evaluate(() => { __sb.state.recipeIdx = 7; __sb.save(); }); // 6-slot recipe, so no brew pops up mid-test
    await p.evaluate(() => __sb.startRound('friend')); await typeAndEnter(p, 'frend'); await typeAndEnter(p, 'friend'); await p.keyboard.press('Enter');
    for(const w of ['because', 'because']){ await p.evaluate(x => __sb.startRound(x), w); await typeAndEnter(p, w); await p.keyboard.press('Enter'); }
    await p.click('#nav-book'); await p.waitForTimeout(400);
    const keys = await p.$$eval('#book-stats .stat', a => a.length); ok(keys === 8, 'one stats row of 8');
    const txt = await p.textContent('#book-stats');
    ok(['Maya','Streak','Best streak','Words tried','Words correct','First tries'].every(k => txt.includes(k)), 'stats labels');
    ok(await p.$eval('#book-stats', e => { const ys = [...e.children].map(c => c.getBoundingClientRect().top); return Math.max(...ys) - Math.min(...ys) < 2; }), 'stats in one row');
    ok((await p.textContent('#mastered')).includes('because'), 'mastered list');
    ok(await p.isVisible('[data-practice="friend"]'), 'review list');
    const w = await p.$eval('.book', e => e.getBoundingClientRect().width); ok(w > 1200, 'wide panel ' + w);
    await p.screenshot({ path: path.join(SHOTS, 'spellbook.png') });
    await p.uncheck('#set-count'); ok(await p.evaluate(() => __sb.state.showCount === false), 'letter count switch');
    await p.uncheck('#set-sound'); ok((await p.textContent('#nav-sound')).includes('off'), 'sound switch updates top bar');
    await p.keyboard.press('Escape'); ok(await p.isHidden('#book'), 'Esc closes spellbook');
    await p.click('#nav-book'); await p.click('[data-practice="friend"]'); await p.waitForTimeout(100);
    ok(await p.evaluate(() => __sb.round.w.id) === 'friend', 'practice a review word');
    ok(await p.isHidden('#letter-count'), 'letter count hidden when off');
    await p.click('#nav-book'); await p.click('#book-apprentice'); ok(await p.isVisible('#gate'), 'change apprentice opens gate');
    ok(await p.textContent('#gate-enter') === 'Continue spelling', 'continue button');
  },
  async 'reset keeps portrait, photo, name, settings; clears potions, words, dungeon; progress persists across reload'(b){
    const p = await fresh(b);
    await p.click('#mk-gender [data-g=b]'); await p.click('#mk-hair [data-hair=buzz]');
    await enter(p, 'Leo'); await spellRight(p);
    await p.evaluate(() => { __sb.state.photo = 'data:image/jpeg;base64,AAAA'; __sb.state.xp = 99; __sb.state.belt = {0:3}; __sb.state.cleared[0] = true; __sb.state.sound = false; __sb.state.showCount = false; __sb.save(); });
    await p.reload(); await p.waitForTimeout(200);
    ok(await p.evaluate(() => __sb.state.xp === 99 && __sb.state.name === 'Leo' && __sb.state.tried === 1), 'saved in localStorage');
    await enter(p, 'Leo');
    await p.click('#nav-book'); await p.click('#book-reset'); await p.click('#confirm-yes'); await p.waitForTimeout(100);
    const s = await p.evaluate(() => __sb.state);
    ok(s.gender === 'b' && s.hair === 'buzz' && s.photo === 'data:image/jpeg;base64,AAAA', 'portrait + photo kept');
    ok(s.name === 'Leo' && s.sound === false && s.showCount === false, 'name and settings kept');
    ok(s.xp === 0 && s.tried === 0 && Object.keys(s.words).length === 0 && Object.keys(s.belt).length === 0 && s.recipeIdx === 0 && s.slots.length === 0 && s.potionsMade === 0 && !s.cleared.some(Boolean) && s.streak === 0, 'potions, words, dungeon progress cleared');
    ok(await p.textContent('#gate-enter') === 'Enter the tower' && await p.inputValue('#gate-name') === 'Leo', 'gate after reset');
    ok(await p.isVisible('#gate'), 'back at the gate');
  },
  async 'reduced motion still plays through brew and battle'(b){
    const p = await fresh(b, { reduced: true }); await enter(p);
    await p.evaluate(() => { __sb.state.belt = { 0: 2 }; __sb.save(); __sb.setRng(() => 0); });
    await p.click('#nav-dungeon'); await p.click('#enter-room'); await p.keyboard.press('1'); await p.waitForTimeout(300); await p.keyboard.press('1'); await p.waitForTimeout(400);
    ok(await p.evaluate(() => __sb.state.cleared[0]), 'battle works with reduced motion');
    ok(!p.errs.length, 'no errors');
  },
};

(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
  for(const [name, fn] of Object.entries(tests)){
    const before = fail;
    try{ await fn(browser); console.log('✓', name); }
    catch(e){ if(fail === before) { fail++; results.push('  ✗ ' + e.message); } console.log('✗', name); console.log(results.splice(0).join('\n')); }
  }
  await browser.close();
  console.log(`\n${pass} assertions passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
