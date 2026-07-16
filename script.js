(function() {
  let completedChallenges = [];
  let currentPhaseIdx = 0;
  let currentVariation = 0;
  let playerName = '';
  let sdkReady = false;

  const PHASE_STICKERS = ['💐','🐝','🍄','🌺','🐞','🏅'];
  const PHASE_STICKER_LABELS = ['Buquê Mágico','Mel Voando','Cogumelo Encantado','Flor Especial','Joaninha Sorridente','Missão Concluída'];
  const MEL_COMMENTS = [
    ["Que incrível! Agora tenho uma nova lembrança para meu caderno!","Conseguimos ligar tudo! Meu caderno agradece!","Mais uma página preenchida com carinho!"],
    ["Encontrei meu caminho graças a você!","Estamos enchendo meu caderno de aventuras!","Que jornada incrível pelo jardim!"],
    ["Os cogumelos não são mais um mistério!","Meu caderno está ficando lindo!","Mais uma missão concluída! Obrigada pela ajuda!"],
    ["As flores ficaram tão felizes!","Cada página conta uma história especial!","Estou tão orgulhosa do nosso progresso!"],
    ["As joaninhas adoraram nossa ajuda!","Meu caderno está quase completo!","Juntos somos imbatíveis!"],
    ["O padrão mágico foi revelado!","Completamos todas as aventuras!","Que dia mágico no jardim!"]
  ];

  const PHASES = [
    {id:'phase1',name:'Ligando e Contando',icon:'🔗',color:'#fef3c7',border:'#f59e0b',type:'linking'},
    {id:'phase2',name:'Caminhando no Jardim',icon:'🐝',color:'#dcfce7',border:'#16a34a',type:'path'},
    {id:'phase3',name:'Subtraindo Cogumelos',icon:'🍄',color:'#fce7f3',border:'#ec4899',type:'subtraction'},
    {id:'phase4',name:'Entre as Flores',icon:'🌸',color:'#e0e7ff',border:'#6366f1',type:'counting'},
    {id:'phase5',name:'Somando Joaninhas',icon:'🐞',color:'#fef9c3',border:'#eab308',type:'addition'},
    {id:'phase6',name:'Padrão Mágico',icon:'✨',color:'#f3e8ff',border:'#a855f7',type:'pattern'}
  ];

  const PHASE_HINTS = {
    'linking': [
      'Conte apontando um elemento de cada vez.',
      'Você pode separar os objetos em pequenos grupos para facilitar a contagem.',
      'Primeiro conte todos os elementos. Depois procure o número que representa essa quantidade.'
    ],
    'path': [
      'Planeje o caminho da Abelhinha antes de escolher os movimentos.',
      'Olhe para onde a Mel precisa chegar antes de começar.',
      'Trace mentalmente quantos passos para frente, trás, esquerda ou direita você precisa.'
    ],
    'subtraction': [
      'Veja quantos elementos saíram antes de contar quantos sobraram.',
      'Tire os cogumelos com cuidado e conte o que restou.',
      'Comece contando todos. Depois, remova os que devem sair e conte novamente.'
    ],
    'counting': [
      'Conte apontando um elemento de cada vez.',
      'Você pode separar as flores em pequenos grupos para facilitar a contagem.',
      'Conte com atenção e procure o número correto entre as opções.'
    ],
    'addition': [
      'Observe quantos elementos havia no início e quantos foram acrescentados.',
      'Comece com alguns e adicione mais um de cada vez.',
      'Coloque um grupo de joaninhas, depois acrescente o outro grupo.'
    ],
    'pattern': [
      'Descubra qual desenho está se repetindo.',
      'Observe os dois primeiros elementos antes de continuar a sequência.',
      'Veja qual é a ordem dos elementos e repita esse padrão.'
    ]
  };

  const savedName = localStorage.getItem('bee_player_name');
  if (savedName) playerName = savedName;

  document.addEventListener('DOMContentLoaded', function() {
    if (playerName) document.getElementById('player-name-input').value = playerName;
    document.getElementById('btn-start-el').addEventListener('click', startGame);
    document.getElementById('btn-narration-continue-el').addEventListener('click', showMap);
    document.getElementById('btn-notebook').addEventListener('click', showNotebook);
    document.getElementById('btn-nb-back').addEventListener('click', showMap);
    document.getElementById('btn-game-back').addEventListener('click', showMap);
    document.getElementById('btn-continue-el').addEventListener('click', afterSuccess);
    document.getElementById('btn-replay-el').addEventListener('click', resetGame);
    document.getElementById('btn-sticker-continue').addEventListener('click', onStickerContinue);
    document.getElementById('btn-hint').addEventListener('click', showHint);
    document.getElementById('btn-close-hint').addEventListener('click', closeHint);
    initSDK();
  });

  async function initSDK() {
    const result = await window.dataSdk.init({
      onDataChanged: function(data) {
        completedChallenges = data;
        sdkReady = true;
        renderMap();
        renderNotebook();
      }
    });
    if (!result.isOk) { sdkReady = true; }
  }

  function startGame() {
    const input = document.getElementById('player-name-input');
    playerName = input.value.trim() || 'Jogador';
    localStorage.setItem('bee_player_name', playerName);
    showNarration();
  }

  function showNarration() {
    showScreen('screen-narration');
    speakNarration();
  }

  function speakNarration() {
    var el = document.querySelector('[data-template-id="narration-text"]');
    if (!el || !el.textContent) return;
    var synth = window.speechSynthesis; synth.cancel();
    var u = new SpeechSynthesisUtterance(el.textContent);
    u.lang='pt-BR'; u.rate=0.95; u.pitch=1.1;
    var v = synth.getVoices().find(function(x){return x.lang.includes('pt-BR');});
    if(v) u.voice=v;
    synth.speak(u);
  }

  function speakText(text) {
    var synth = window.speechSynthesis; synth.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang='pt-BR'; u.rate=0.95; u.pitch=1.1;
    var v = synth.getVoices().find(function(x){return x.lang.includes('pt-BR');});
    if(v) u.voice=v;
    synth.speak(u);
  }

  function getChallengeId(phaseIdx, variation) { return 'p'+(phaseIdx+1)+'v'+(variation+1); }
  function isChallengeCompleted(cid) { return completedChallenges.some(function(r){return r.phase_completed===cid;}); }
  function getPhaseProgress(idx) { let c=0; for(let v=0;v<3;v++) if(isChallengeCompleted(getChallengeId(idx,v))) c++; return c; }
  function isPhaseUnlocked(idx) { if(idx===0) return true; return getPhaseProgress(idx-1)===3; }
  function isPhaseComplete(idx) { return getPhaseProgress(idx)===3; }
  function getCompletedPhaseCount() { let c=0; PHASES.forEach(function(_,i){if(isPhaseComplete(i))c++;}); return c; }

  function showScreen(id) {
    document.querySelectorAll('[id^="screen-"]').forEach(function(s){s.classList.add('hidden');});
    document.getElementById(id).classList.remove('hidden');
  }

  function showMap() {
    showScreen('screen-map');
    renderMap();
    var g = document.getElementById('player-greeting');
    if(g) g.textContent = playerName ? 'Olá, '+playerName+'! 🐝' : '';
  }

  function showNotebook() { showScreen('screen-notebook'); renderNotebook(); }

  function renderNotebook() {
    var grid = document.getElementById('notebook-grid');
    if(!grid) return;
    grid.innerHTML = '';
    PHASES.forEach(function(ph,i){
      var done = isPhaseComplete(i);
      var cell = document.createElement('div');
      cell.className = 'notebook-sticker '+(done?'earned sticker-pop':'');
      cell.innerHTML = '<div class="flex flex-col items-center gap-1"><span>'+(done?PHASE_STICKERS[i]:'❓')+'</span><span class="text-xs font-bold">'+(done?PHASE_STICKER_LABELS[i]:'???')+'</span></div>';
      grid.appendChild(cell);
    });
  }

  function renderMap() {
    var c = document.getElementById('phase-map');
    if(!c) return;
    c.innerHTML = '';
    PHASES.forEach(function(ph,i){
      var unlocked = isPhaseUnlocked(i), done = isPhaseComplete(i), progress = getPhaseProgress(i);
      var node = document.createElement('div');
      node.className = 'flex flex-col items-center gap-2';
      var mapNode = document.createElement('div');
      mapNode.className = 'map-node '+(unlocked?'':'locked');
      mapNode.style.background = unlocked?ph.color:'#e5e7eb';
      mapNode.style.border = '4px solid '+(unlocked?ph.border:'#9ca3af');
      mapNode.innerHTML = '<span>'+(done?'⭐':ph.icon)+'</span>';
      if(unlocked){(function(idx){mapNode.addEventListener('click',function(){startPhase(idx);})})(i);}
      var label = document.createElement('span');
      label.className = 'font-bold text-sm text-center';
      label.style.color = unlocked?'#065f46':'#9ca3af';
      label.textContent = ph.name;
      var dots = document.createElement('div');
      dots.className = 'flex gap-1';
      for(var v=0;v<3;v++){var dot=document.createElement('div');dot.className='challenge-dot';dot.style.background=v<progress?'#10b981':'#d1d5db';dots.appendChild(dot);}
      node.appendChild(mapNode);node.appendChild(label);node.appendChild(dots);c.appendChild(node);
    });
  }

  function startPhase(idx) {
    currentPhaseIdx = idx;
    var progress = getPhaseProgress(idx);
    currentVariation = progress < 3 ? progress : 0;
    launchVariation();
  }

  function launchVariation() {
    var ph = PHASES[currentPhaseIdx];
    document.getElementById('game-phase-title').textContent = ph.icon+' '+ph.name;
    document.getElementById('game-variation').textContent = (currentVariation+1)+'/3';
    document.getElementById('game-feedback').innerHTML = '';
    showScreen('screen-game');
    var c = document.getElementById('game-content'); c.innerHTML = '';
    var isFirst = currentVariation===0;
    switch(ph.type){
      case 'linking': buildLinking(currentVariation,isFirst); break;
      case 'path': buildPath(currentVariation,isFirst); break;
      case 'subtraction': buildSubtraction(currentVariation,isFirst); break;
      case 'counting': buildCounting(currentVariation,isFirst); break;
      case 'addition': buildAddition(currentVariation,isFirst); break;
      case 'pattern': buildPattern(currentVariation,isFirst); break;
    }
  }

  function showHint() {
    var ph = PHASES[currentPhaseIdx];
    var hints = PHASE_HINTS[ph.type];
    if (!hints || hints.length === 0) return;
    var hint = hints[currentVariation % hints.length];
    document.getElementById('hint-text').textContent = hint;
    document.getElementById('hint-modal').classList.remove('hidden');
  }

  function closeHint() {
    document.getElementById('hint-modal').classList.add('hidden');
  }

  function showFeedback(success) {
    var fb = document.getElementById('game-feedback');
    if(success){
      fb.innerHTML = '<div class="feedback-msg bg-green-100 text-green-700">✅ Parabéns!</div>';
      setTimeout(function(){challengeWon();},1000);
    } else {
      fb.innerHTML = '<div class="feedback-msg bg-red-100 text-red-500">❌ Tente novamente!</div>';
      setTimeout(function(){fb.innerHTML='';},1500);
    }
  }

  async function challengeWon() {
    var cid = getChallengeId(currentPhaseIdx, currentVariation);
    if(!isChallengeCompleted(cid) && completedChallenges.length < 999){
      await window.dataSdk.create({phase_completed:cid, difficulty:'normal', sticker_earned:PHASE_STICKERS[currentPhaseIdx], completed_at:new Date().toISOString()});
    }
    playConfetti();
    playApplause();
    currentVariation++;
    if(currentVariation < 3){
      setTimeout(function(){launchVariation();},1000);
    } else {
      // Phase complete - show sticker reward
      setTimeout(function(){showStickerReward();},1000);
    }
  }

  function showStickerReward() {
    showScreen('screen-sticker-reward');
    var page = document.getElementById('sticker-page');
    page.classList.remove('page-turn');
    void page.offsetWidth;
    page.classList.add('page-turn');

    var emoji = document.getElementById('sticker-emoji');
    emoji.style.display = 'none';
    emoji.textContent = PHASE_STICKERS[currentPhaseIdx];
    setTimeout(function(){emoji.style.display='block';emoji.classList.remove('sticker-glue');void emoji.offsetWidth;emoji.classList.add('sticker-glue');},600);

    document.getElementById('sticker-phase-name').textContent = PHASE_STICKER_LABELS[currentPhaseIdx];
    var total = getCompletedPhaseCount();
    document.getElementById('sticker-progress').textContent = 'Adesivos: '+total+' de 6';

    var comments = MEL_COMMENTS[currentPhaseIdx];
    var comment = comments[Math.floor(Math.random()*comments.length)];
    document.getElementById('mel-comment').textContent = comment;
    speakText(comment);

    playConfetti();
  }

  function onStickerContinue() {
    if(currentPhaseIdx < 5){
      showMap();
    } else {
      renderFinalNotebook();
      showScreen('screen-done');
      playConfetti();
      setTimeout(function(){
        var speech = document.querySelector('[data-template-id="done-mel-speech"]');
        if(speech && speech.textContent) speakText(speech.textContent);
      },500);
    }
  }

  function afterSuccess() { showMap(); }

  function resetGame() {
    completedChallenges = [];
    currentPhaseIdx = 0;
    currentVariation = 0;
    localStorage.removeItem('bee_player_name');
    playerName = '';
    document.getElementById('player-name-input').value = '';
    showScreen('screen-title');
  }

  function playConfetti() {
    var colors=['🎉','⭐','🎊','✨','🌟'];
    for(var i=0;i<25;i++){
      var conf=document.createElement('div');conf.className='confetti';
      conf.textContent=colors[Math.floor(Math.random()*colors.length)];
      conf.style.left=Math.random()*100+'%';conf.style.fontSize=(18+Math.random()*18)+'px';
      conf.style.animationDuration=(2+Math.random())+'s';conf.style.animationDelay=Math.random()*0.4+'s';
      document.body.appendChild(conf);
      (function(el){setTimeout(function(){el.remove();},3500);})(conf);
    }
  }

  function playApplause() {
    try{var ctx=new(window.AudioContext||window.webkitAudioContext)();var now=ctx.currentTime;
    for(var i=0;i<4;i++){var osc=ctx.createOscillator();var gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);osc.frequency.value=300+Math.random()*400;gain.gain.setValueAtTime(0.08,now+i*0.12);gain.gain.exponentialRampToValueAtTime(0.01,now+i*0.12+0.1);osc.start(now+i*0.12);osc.stop(now+i*0.12+0.1);}}catch(e){}
  }

  function renderFinalNotebook() {
    var grid = document.getElementById('final-notebook-grid');
    if(!grid) return;
    grid.innerHTML = '';
    grid.classList.remove('flip-book');void grid.offsetWidth;grid.classList.add('flip-book');
    PHASES.forEach(function(ph,i){
      var done = isPhaseComplete(i);
      var cell = document.createElement('div');
      cell.className = 'flex flex-col items-center gap-2';
      var sticker = document.createElement('div');
      sticker.className = 'notebook-sticker '+(done?'earned sticker-pop':'');
      sticker.innerHTML = '<span>'+(done?PHASE_STICKERS[i]:'❓')+'</span>';
      var label = document.createElement('p');
      label.className = 'text-xs font-bold text-center leading-tight';
      label.style.color = done?'#065f46':'#9ca3af';
      label.textContent = done?PHASE_STICKER_LABELS[i]:'???';
      label.style.maxWidth = '70px';
      cell.appendChild(sticker);cell.appendChild(label);grid.appendChild(cell);
    });
  }

  // ===== PHASE 1: LINKING =====
  function buildLinking(v, isFirst) {
    var sets = [
      [{emoji:'🐱',count:2},{emoji:'🍓',count:4},{emoji:'🌈',count:3},{emoji:'🌸',count:5}],
      [{emoji:'🐶',count:1},{emoji:'🍎',count:3},{emoji:'⭐',count:5},{emoji:'🎈',count:2}],
      [{emoji:'🐝',count:4},{emoji:'🍇',count:2},{emoji:'🌻',count:6},{emoji:'🦋',count:3}]
    ];
    var groups = sets[v];
    var numbers = groups.map(function(g){return g.count;});
    var shuffledGroups = groups.slice().sort(function(){return Math.random()-0.5;});
    var c = document.getElementById('game-content');
    c.innerHTML = '<div class="bg-white rounded-3xl p-5 shadow-lg border-4 border-yellow-300 mb-3 relative"><div class="absolute -top-4 left-8 text-3xl">💭</div><p class="text-center text-base leading-relaxed font-semibold text-green-800">Ajude Mel contando e ligando cada grupo ao número correspondente!</p></div><div class="flex justify-between items-start w-full gap-6"><div id="link-left" class="flex flex-col gap-4 flex-1"></div><div id="link-right" class="flex flex-col gap-4 items-center"></div></div>';
    if(isFirst) setTimeout(function(){speakText('Ajude Mel contando e ligando cada grupo ao número correspondente!');},300);
    var leftCol=document.getElementById('link-left'),rightCol=document.getElementById('link-right');
    var selectedGroup=null, matches=0;
    var shuffledNums=numbers.slice().sort(function(){return Math.random()-0.5;});
    shuffledNums.forEach(function(num){
      var btn=document.createElement('button');
      btn.className='link-num bg-white border-2 border-purple-300 shadow-md text-purple-700';
      btn.textContent=num;
      btn.addEventListener('click',function(){
        if(!selectedGroup||btn.classList.contains('matched'))return;
        if(num===parseInt(selectedGroup.dataset.count)){selectedGroup.classList.add('matched','bg-green-200');selectedGroup.classList.remove('selected');btn.classList.add('matched','bg-green-200');selectedGroup=null;matches++;if(matches===groups.length)showFeedback(true);}
        else showFeedback(false);
      });
      rightCol.appendChild(btn);
    });
    shuffledGroups.forEach(function(g){
      var div=document.createElement('div');div.className='link-group bg-pink-50 border-2 border-pink-300';div.dataset.count=g.count;
      div.innerHTML='<div class="flex gap-2 flex-wrap">'+Array(g.count).fill('<span class="text-4xl">'+g.emoji+'</span>').join('')+'</div>';
      div.addEventListener('click',function(){if(div.classList.contains('matched'))return;document.querySelectorAll('.link-group').forEach(function(el){el.classList.remove('selected');});div.classList.add('selected');selectedGroup=div;});
      leftCol.appendChild(div);
    });
  }

  // ===== PHASE 2: PATH =====
  var pathState = null;
  function buildPath(v, isFirst) {
    var configs=[{size:3,target:{r:2,c:2}},{size:3,target:{r:2,c:1}},{size:4,target:{r:3,c:3}}];
    var cfg=configs[v];
    var c=document.getElementById('game-content');
    c.innerHTML='<div class="bg-white rounded-3xl p-5 shadow-lg border-4 border-yellow-300 mb-3 relative"><div class="absolute -top-4 left-8 text-3xl">💭</div><p class="text-center text-base leading-relaxed font-semibold text-green-800">Programe o caminho da abelha até a flor!</p></div>'+
      '<div id="path-grid" class="grid gap-2 mx-auto" style="grid-template-columns:repeat('+cfg.size+',64px)"></div>'+
      '<div id="move-display" class="flex gap-1 flex-wrap justify-center min-h-[40px] p-2 bg-white rounded-xl shadow-inner"></div>'+
      '<div class="flex gap-3 justify-center flex-wrap"><button class="arrow-btn" id="move-up">⬆️</button><button class="arrow-btn" id="move-down">⬇️</button><button class="arrow-btn" id="move-left">⬅️</button><button class="arrow-btn" id="move-right">➡️</button></div>'+
      '<div class="flex gap-3"><button class="px-4 py-2 bg-red-200 rounded-xl font-bold" id="move-clear">🗑️ Limpar</button><button class="px-4 py-2 bg-green-300 rounded-xl font-bold" id="move-run">▶️ Ir!</button></div>';
    pathState={size:cfg.size,beePos:{r:0,c:0},target:cfg.target,moves:[]};
    renderPathGrid();
    if(isFirst) setTimeout(function(){speakText('Programe o caminho da abelha até a flor!');},300);
    document.getElementById('move-up').addEventListener('click',function(){addMove('up');});
    document.getElementById('move-down').addEventListener('click',function(){addMove('down');});
    document.getElementById('move-left').addEventListener('click',function(){addMove('left');});
    document.getElementById('move-right').addEventListener('click',function(){addMove('right');});
    document.getElementById('move-clear').addEventListener('click',clearMoves);
    document.getElementById('move-run').addEventListener('click',runMoves);
  }
  function renderPathGrid(){if(!pathState)return;var g=document.getElementById('path-grid');if(!g)return;g.innerHTML='';for(var r=0;r<pathState.size;r++)for(var c=0;c<pathState.size;c++){var cell=document.createElement('div');cell.className='grid-cell';if(r===pathState.beePos.r&&c===pathState.beePos.c)cell.textContent='🐝';else if(r===pathState.target.r&&c===pathState.target.c)cell.textContent='🌼';else cell.textContent='🌿';g.appendChild(cell);}}
  function addMove(dir){if(!pathState)return;pathState.moves.push(dir);var icons={up:'⬆️',down:'⬇️',left:'⬅️',right:'➡️'};var d=document.getElementById('move-display');var sp=document.createElement('span');sp.textContent=icons[dir];sp.className='text-2xl';d.appendChild(sp);}
  function clearMoves(){if(!pathState)return;pathState.moves=[];document.getElementById('move-display').innerHTML='';}
  async function runMoves(){if(!pathState||pathState.moves.length===0)return;var pos={r:pathState.beePos.r,c:pathState.beePos.c};for(var i=0;i<pathState.moves.length;i++){var m=pathState.moves[i];if(m==='up')pos.r--;if(m==='down')pos.r++;if(m==='left')pos.c--;if(m==='right')pos.c++;pos.r=Math.max(0,Math.min(pathState.size-1,pos.r));pos.c=Math.max(0,Math.min(pathState.size-1,pos.c));pathState.beePos={r:pos.r,c:pos.c};renderPathGrid();await new Promise(function(resolve){setTimeout(resolve,400);});}if(pos.r===pathState.target.r&&pos.c===pathState.target.c)showFeedback(true);else{showFeedback(false);setTimeout(function(){pathState.beePos={r:0,c:0};pathState.moves=[];document.getElementById('move-display').innerHTML='';renderPathGrid();},1600);}}

  // ===== PHASE 3: SUBTRACTION =====
  function buildSubtraction(v){
    var configs=[{total:5,remove:2},{total:7,remove:3},{total:9,remove:4}];var cfg=configs[v];
    var c=document.getElementById('game-content');
    c.innerHTML='<div class="bg-white rounded-2xl p-4 shadow-lg text-center"><p class="text-4xl font-bold">'+cfg.total+' 🍄 - '+cfg.remove+' 🍄 = ?</p><p class="text-md text-gray-600">Toque em '+cfg.remove+' cogumelos para tirá-los!</p></div><div id="sub-items" class="flex flex-wrap justify-center gap-4 p-6"></div><p id="sub-counter" class="text-2xl font-bold text-center">Restam: '+cfg.total+'</p>';
    var items=document.getElementById('sub-items');var removed=0;
    for(var i=0;i<cfg.total;i++){var btn=document.createElement('button');btn.className='mushroom-item';btn.textContent='🍄';(function(button){button.addEventListener('click',function(){if(button.classList.contains('fade-out'))return;if(removed>=cfg.remove)return;button.classList.add('fade-out');removed++;document.getElementById('sub-counter').textContent='Restam: '+(cfg.total-removed);setTimeout(function(){button.style.visibility='hidden';},400);if(removed===cfg.remove)setTimeout(function(){showFeedback(true);},600);});})(btn);items.appendChild(btn);}
  }

  // ===== PHASE 4: COUNTING =====
  function buildCounting(v){
    var counts=[3,6,8];var count=counts[v];var flowers=['🌸','🌺','🌷'];var flower=flowers[v];
    var wrong=[count-1,count+1,count+2].filter(function(x){return x>0;});
    var options=[count].concat(wrong).sort(function(){return Math.random()-0.5;});
    var c=document.getElementById('game-content');
    c.innerHTML='<div class="bg-white rounded-2xl p-4 shadow-lg text-center"><p class="text-lg font-bold">Quantas flores '+flower+' você vê?</p></div><div class="flex flex-wrap justify-center gap-3 p-4">'+Array(count).fill('<span class="text-6xl">'+flower+'</span>').join('')+'</div><div id="count-options" class="flex gap-4 justify-center flex-wrap"></div>';
    var optC=document.getElementById('count-options');
    options.forEach(function(opt){var btn=document.createElement('button');btn.className='w-20 h-20 rounded-2xl bg-purple-100 text-4xl font-bold shadow-md phase-btn border-2 border-purple-300';btn.textContent=opt;btn.addEventListener('click',function(){if(opt===count)showFeedback(true);else{btn.classList.add('bg-red-200');btn.disabled=true;showFeedback(false);}});optC.appendChild(btn);});
  }

  // ===== PHASE 5: ADDITION =====
  var addState=null;
  function buildAddition(v){
    var configs=[{a:2,b:3},{a:4,b:1},{a:3,b:4}];var cfg=configs[v];var answer=cfg.a+cfg.b;
    var c=document.getElementById('game-content');
    c.innerHTML='<div class="bg-white rounded-2xl p-4 shadow-lg text-center"><p class="text-4xl font-bold">'+cfg.a+' 🐞 + '+cfg.b+' 🐞 = ?</p><p class="text-md text-gray-600">Toque para adicionar joaninhas!</p></div><div id="add-area" class="flex flex-wrap justify-center gap-3 p-6 min-h-[150px] bg-white rounded-xl shadow-inner cursor-pointer"></div><p id="add-counter" class="text-2xl font-bold text-center">Joaninhas: 0</p><button class="px-6 py-3 bg-yellow-200 rounded-xl font-bold text-lg" id="btn-check-add">✅ Confirmar</button>';
    addState={answer:answer,count:0};
    document.getElementById('add-area').addEventListener('click',function(){if(!addState)return;addState.count++;var area=document.getElementById('add-area');var sp=document.createElement('span');sp.className='text-5xl sticker-pop';sp.textContent='🐞';area.appendChild(sp);document.getElementById('add-counter').textContent='Joaninhas: '+addState.count;});
    document.getElementById('btn-check-add').addEventListener('click',function(){if(!addState)return;if(addState.count===addState.answer)showFeedback(true);else{showFeedback(false);setTimeout(function(){addState.count=0;document.getElementById('add-area').innerHTML='';document.getElementById('add-counter').textContent='Joaninhas: 0';},1600);}});
  }

  // ===== PHASE 6: PATTERN =====
  function buildPattern(v){
    var patterns=[
      {sequence:['🌸','🐛','🌸','🐛','🌸'],target:['🐛'],choices:['🐛','🌻','🦋']},
      {sequence:['🐞','🦋','🦋','🐞','🦋','🦋','🐞'],target:['🦋','🦋'],choices:['🦋','🌸','🐛']},
      {sequence:['🌺','🐝','🌺','🐝','🌺'],target:['🐝'],choices:['🐝','🌻','🐛']}
    ];
    var pat=patterns[v];var c=document.getElementById('game-content');
    c.innerHTML='<div class="bg-white rounded-2xl p-4 shadow-lg text-center"><p class="text-lg font-bold">Complete o padrão!</p></div><div id="pattern-sequence" class="flex flex-wrap justify-center gap-4 p-6 bg-white rounded-xl shadow-inner max-w-sm min-h-[120px]">'+pat.sequence.map(function(e){return '<span class="text-5xl">'+e+'</span>';}).join('')+'<span class="text-5xl text-gray-300 opacity-60">?</span></div><div id="pattern-choices" class="flex gap-4 justify-center flex-wrap mt-6"></div>';
    var patternState={target:pat.target,completed:[],answered:false};
    var choicesDiv=document.getElementById('pattern-choices');
    pat.choices.forEach(function(emoji){var btn=document.createElement('button');btn.textContent=emoji;btn.className='text-7xl p-6 rounded-2xl bg-purple-100 border-2 border-purple-300 shadow-md phase-btn';btn.addEventListener('click',function(){if(patternState.answered)return;if(patternState.target[patternState.completed.length]===emoji){patternState.completed.push(emoji);btn.classList.add('ring-4','ring-purple-500');if(patternState.completed.length===patternState.target.length){patternState.answered=true;showFeedback(true);}}else{patternState.answered=true;btn.classList.add('bg-red-200');showFeedback(false);}});choicesDiv.appendChild(btn);});
  }

})();
   
