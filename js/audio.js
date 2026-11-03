/* WebAudio chimes — no audio files needed */
window.SB_AUDIO = (function(){
  let ctx = null, on = true;
  function ac(){ if(!ctx){ try{ ctx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ return null; } } if(ctx.state==='suspended') ctx.resume(); return ctx; }
  function tone(freq, t0, dur, type='sine', vol=0.18){
    const c = ac(); if(!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, c.currentTime + t0);
    g.gain.setValueAtTime(0.0001, c.currentTime + t0);
    g.gain.exponentialRampToValueAtTime(vol, c.currentTime + t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t0 + dur);
    o.connect(g).connect(c.destination); o.start(c.currentTime + t0); o.stop(c.currentTime + t0 + dur + 0.05);
  }
  function noise(t0, dur, vol=0.12, from=2000, to=300){
    const c = ac(); if(!c) return;
    const b = c.createBuffer(1, c.sampleRate*dur, c.sampleRate), d = b.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i] = (Math.random()*2-1);
    const s = c.createBufferSource(); s.buffer = b;
    const f = c.createBiquadFilter(); f.type='bandpass'; f.frequency.setValueAtTime(from, c.currentTime+t0); f.frequency.exponentialRampToValueAtTime(to, c.currentTime+t0+dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, c.currentTime+t0); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime+t0+dur);
    s.connect(f).connect(g).connect(c.destination); s.start(c.currentTime+t0);
  }
  const S = {
    correct(){ [784,988,1175,1568].forEach((f,i)=>tone(f, i*0.07, 0.5, 'triangle', 0.16)); },
    wrong(){ tone(330,0,0.22,'sine',0.14); tone(262,0.14,0.3,'sine',0.12); },
    slot(){ tone(1046,0,0.25,'triangle',0.12); tone(1568,0.05,0.35,'sine',0.08); },
    brew(){ [523,659,784,1046,1318,1568,2093].forEach((f,i)=>tone(f, i*0.06, 0.6, 'triangle', 0.13)); noise(0,0.6,0.05,800,4000); },
    whoosh(){ noise(0,0.35,0.08,500,2500); },
    hit(){ tone(180,0,0.18,'square',0.12); noise(0,0.25,0.18,1800,200); tone(660,0.08,0.25,'triangle',0.12); },
    fizzle(){ noise(0,0.6,0.1,3000,400); tone(440,0,0.3,'sine',0.06); tone(330,0.15,0.3,'sine',0.05); },
    win(){ [523,659,784,1046,784,1046,1318].forEach((f,i)=>tone(f, i*0.1, 0.45, 'triangle', 0.15)); },
    levelup(){ [392,523,659,784,1046,1318,1568].forEach((f,i)=>tone(f, i*0.08, 0.7, 'square', 0.07)); [784,1046,1568].forEach((f,i)=>tone(f, 0.7+i*0.02, 1.0, 'triangle', 0.12)); },
    click(){ tone(880,0,0.08,'triangle',0.06); },
  };
  return {
    play(name){ if(on && S[name]) try{ S[name](); }catch(e){} },
    set(v){ on = !!v; }, get(){ return on; }, unlock(){ ac(); }
  };
})();
