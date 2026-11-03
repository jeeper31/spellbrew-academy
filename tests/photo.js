const { chromium } = require('playwright-core');
(async()=>{
 const b = await chromium.launch({executablePath:'/usr/bin/google-chrome'});
 const p = await b.newPage({viewport:{width:1366,height:768}});
 const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()!=='log') errs.push(m.type()+': '+m.text())});
 await p.goto('file://'+process.cwd()+'/index.html');
 await p.setInputFiles('#ph-input', 'tests/fixtures/test_kid.jpg');
 await p.waitForFunction(()=>/Done|could not|not find/.test(document.getElementById('ph-status').textContent), null, {timeout:90000});
 console.log(await p.textContent('#ph-status'));
 const url = await p.evaluate(()=>__sb.state.photo);
 if(url){ require('fs').writeFileSync('/tmp/cut.jpg', Buffer.from(url.split(',')[1],'base64')); console.log('len', url.length); }
 console.log(errs.join('\n')); await b.close();
})();
