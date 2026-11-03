/* Photo mode: MediaPipe selfie segmentation, fully offline (model + wasm are bundled in vendor/).
   Works from file:// because the wasm binary and model are loaded from base64 script files. */
window.SB_PHOTO = (function(){
  let segPromise = null;
  function loadScript(src){ return new Promise((res, rej)=>{ const s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=()=>rej(new Error('Could not load '+src)); document.head.appendChild(s); }); }
  function b64ToBytes(b64){ const bin = atob(b64); const u = new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i); return u; }
  function getSegmenter(){
    if(segPromise) return segPromise;
    segPromise = (async ()=>{
      if(!window.Vision) await loadScript('vendor/mediapipe/vision_bundle.js');
      if(!window.SB_MP_WASM) await loadScript('vendor/mediapipe/wasm_b64.js');
      if(!window.SB_MP_MODEL) await loadScript('vendor/mediapipe/model_b64.js');
      // MediaPipe would load its loader with crossOrigin="anonymous", which file:// blocks. Load it as a plain
      // script instead (it sets self.ModuleFactory) and pass an empty loader path so MediaPipe uses it directly.
      if(!self.ModuleFactory) await loadScript('vendor/mediapipe/vision_wasm_internal.js');
      const wasmUrl = URL.createObjectURL(new Blob([b64ToBytes(window.SB_MP_WASM)], {type:'application/wasm'}));
      const model = b64ToBytes(window.SB_MP_MODEL);
      window.SB_MP_WASM = null; // free the big string
      return await window.Vision.ImageSegmenter.createFromOptions(
        { wasmLoaderPath: '', wasmBinaryPath: wasmUrl },
        { baseOptions: { modelAssetBuffer: model, delegate: 'CPU' }, runningMode: 'IMAGE', outputConfidenceMasks: true, outputCategoryMask: false });
    })();
    segPromise.catch(()=>{ segPromise = null; });
    return segPromise;
  }
  function loadImage(src){ return new Promise((res, rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=src; }); }

  // source: HTMLImageElement or canvas. Returns a JPEG data URL of the child on the stone wall.
  async function makeCutout(source, wallSrc){
    const seg = await getSegmenter();
    // 1) normalise input size
    const maxSide = 768, sw = source.naturalWidth||source.width, sh = source.naturalHeight||source.height;
    const k = Math.min(1, maxSide/Math.max(sw, sh));
    const iw = Math.round(sw*k), ih = Math.round(sh*k);
    const src = document.createElement('canvas'); src.width=iw; src.height=ih;
    const sctx = src.getContext('2d'); sctx.drawImage(source, 0, 0, iw, ih);
    // 2) segment
    const result = seg.segment(src);
    const mask = result.confidenceMasks[0];
    const mw = mask.width, mh = mask.height, conf = mask.getAsFloat32Array();
    // 3) person layer with soft alpha
    const img = sctx.getImageData(0,0,iw,ih), d = img.data;
    let minX=iw, minY=ih, maxX=0, maxY=0, count=0;
    for(let y=0;y<ih;y++) for(let x=0;x<iw;x++){
      const mx = Math.min(mw-1, Math.floor(x*mw/iw)), my = Math.min(mh-1, Math.floor(y*mh/ih));
      let a = conf[my*mw+mx]; a = Math.max(0, Math.min(1, (a-0.25)/0.5)); a = a*a*(3-2*a);
      d[(y*iw+x)*4+3] = Math.round(a*255);
      if(a>0.5){ count++; if(x<minX)minX=x; if(x>maxX)maxX=x; if(y<minY)minY=y; if(y>maxY)maxY=y; }
    }
    if(result.close) result.close();
    if(count < iw*ih*0.02) throw new Error('no-person');
    sctx.putImageData(img,0,0);
    // 4) compose on the wall (portrait cards are 9:10)
    const W=576, H=640, out=document.createElement('canvas'); out.width=W; out.height=H; const o=out.getContext('2d');
    if(!window.SB_WALL) await loadScript('js/wall_b64.js');
    const wall = await loadImage(window.SB_WALL || wallSrc);
    const ws = Math.max(W/wall.width, H/wall.height); o.drawImage(wall, (W-wall.width*ws)/2, (H-wall.height*ws)/2, wall.width*ws, wall.height*ws);
    const bw = maxX-minX+1, bh = maxY-minY+1;
    const cutAtBottom = maxY >= ih*0.97;
    let scale = (cutAtBottom ? 0.84*H : 0.80*H) / bh; if(bw*scale > 0.92*W) scale = 0.92*W/bw;
    const dw = bw*scale, dh = bh*scale, dx = (W-dw)/2, dy = cutAtBottom ? H-dh : 0.94*H-dh;
    // person layer at output size
    const p = document.createElement('canvas'); p.width=W; p.height=H; const pc=p.getContext('2d');
    pc.drawImage(src, minX, minY, bw, bh, dx, dy, dw, dh);
    // 5) soft wall shadow (light from upper left => shadow to the lower right)
    const sh2 = document.createElement('canvas'); sh2.width=W; sh2.height=H; const shc = sh2.getContext('2d');
    shc.drawImage(p,0,0); shc.globalCompositeOperation='source-in'; shc.fillStyle='#000'; shc.fillRect(0,0,W,H);
    o.save(); o.globalAlpha=0.42; o.filter='blur(16px)'; o.drawImage(sh2, 26, 12); o.restore();
    // contact shadow
    o.save();
    const cy = cutAtBottom ? H : dy+dh;
    const g = o.createRadialGradient(W/2+8, cy, 4, W/2+8, cy, dw*0.6);
    g.addColorStop(0,'rgba(0,0,0,0.55)'); g.addColorStop(1,'rgba(0,0,0,0)');
    o.fillStyle=g; o.translate(0, cy); o.scale(1, 0.22); o.translate(0, -cy); o.fillRect(0, cy-dw, W, dw*2);
    o.restore();
    // 6) torch lighting: brightness only (same factor on R, G and B => no tint)
    const pd = pc.getImageData(0,0,W,H), q = pd.data;
    for(let y=0;y<H;y++){ for(let x=0;x<W;x++){ const i=(y*W+x)*4; if(!q[i+3]) continue;
      const f = 1.14 - 0.40*(x/W) - 0.10*(y/H);
      q[i]=Math.min(255,q[i]*f); q[i+1]=Math.min(255,q[i+1]*f); q[i+2]=Math.min(255,q[i+2]*f); } }
    pc.putImageData(pd,0,0);
    o.drawImage(p,0,0);
    return out.toDataURL('image/jpeg', 0.86);
  }
  return { makeCutout, getSegmenter, loadImage };
})();
