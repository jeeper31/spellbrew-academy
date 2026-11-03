const { chromium } = require('playwright-core');
(async()=>{
 const b = await chromium.launch({executablePath:'/usr/bin/google-chrome', args:['--autoplay-policy=no-user-gesture-required']});
 const p = await b.newPage({viewport:{width:1366,height:768}});
 const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
 await p.goto('file://'+process.cwd()+'/index.html'); await p.waitForTimeout(800);
 await p.screenshot({path:'/tmp/p_gate.png'});
 await p.fill('#gate-name','Maya'); await p.click('#gate-enter'); await p.waitForTimeout(600);
 await p.screenshot({path:'/tmp/p_desk.png'});
 await p.evaluate(()=>{const s=__sb.state; s.belt={0:2,1:1,2:1}; s.xp=30; s.cleared[0]=true; __sb.save();});
 await p.click('#nav-dungeon'); await p.waitForTimeout(800); await p.screenshot({path:'/tmp/p_dungeon.png'});
 await p.click('.room[data-room="1"]'); await p.waitForTimeout(900); await p.click('#enter-room'); await p.waitForTimeout(800);
 await p.screenshot({path:'/tmp/p_battle.png'});
 console.log(errs.join('\n')); await b.close();
})();
