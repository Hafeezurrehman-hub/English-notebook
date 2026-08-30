// EnglishNotebook — AI Assistant (shared across all pages)
// Include this in every lesson page

const EN_AI = {
  WORKER_URL: "https://english-notebook-ai.hafiz-hafeez-ur-rehman2022.workers.dev",
  FREE_LIMIT: 5,
  STARTER_LIMIT: 50,

  getUsed(){
    return parseInt(localStorage.getItem('en_ai_used') || '0');
  },
  addUsed(){
    localStorage.setItem('en_ai_used', this.getUsed() + 1);
    this.updateBadge();
  },
  getPlanName(){
    try{
      const p = JSON.parse(localStorage.getItem('englishnotebook_progress_v1') || '{}');
      // 'paid' kept for backwards compatibility with older accounts -> unlimited
      if(p.plan === 'unlimited' || p.plan === 'paid') return 'unlimited';
      if(p.plan === 'starter') return 'starter';
      return 'free';
    }catch(e){ return 'free'; }
  },
  getLimit(){
    const plan = this.getPlanName();
    if(plan === 'unlimited') return 9999;
    if(plan === 'starter') return this.STARTER_LIMIT;
    return this.FREE_LIMIT;
  },
  hasLimit(){
    return this.getUsed() >= this.getLimit();
  },
  updateBadge(){
    const el = document.getElementById('en-ai-fab-badge');
    if(!el) return;
    const limit = this.getLimit();
    const used = this.getUsed();
    const left = Math.max(0, limit - used);
    if(limit >= 9999){
      el.textContent = '∞';
      el.style.background = '#2F6F5E';
    } else if(left === 0){
      el.textContent = '!';
      el.style.background = '#B5482A';
    } else {
      el.textContent = left;
      el.style.background = left <= 2 ? '#D48C00' : '#4A90D9';
    }
  },

  async call(systemPrompt, userPrompt, onChunk){
    const res = await fetch(this.WORKER_URL, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 350,
        system: systemPrompt,
        messages: [{role: 'user', content: userPrompt}]
      })
    });
    if(!res.ok) throw new Error('API error ' + res.status);
    const data = await res.json();
    return data.content?.find(b => b.type === 'text')?.text || 'No response.';
  }
};

// ============================================
// FLOATING AI BUTTON (FAB) — injected on load
// ============================================
(function injectFAB(){
  // CSS
  const style = document.createElement('style');
  style.textContent = `
    #en-ai-fab{
      position:fixed; bottom:90px; right:20px; z-index:500;
      display:flex; flex-direction:column; align-items:flex-end; gap:10px;
    }
    #en-ai-fab-btn{
      width:58px; height:58px; border-radius:50%; border:none; cursor:pointer;
      background:linear-gradient(135deg,#4A90D9,#7B5EA7);
      box-shadow:0 4px 20px rgba(74,144,217,0.45);
      display:flex; align-items:center; justify-content:center;
      font-size:26px; transition:transform 0.2s, box-shadow 0.2s;
      position:relative;
    }
    #en-ai-fab-btn:hover{ transform:scale(1.1); box-shadow:0 6px 28px rgba(74,144,217,0.6); }
    #en-ai-fab-badge{
      position:absolute; top:-4px; right:-4px;
      width:20px; height:20px; border-radius:50%;
      font-size:10px; font-weight:700; color:white; font-family:'Inter',sans-serif;
      display:flex; align-items:center; justify-content:center;
      border:2px solid white;
    }
    #en-ai-fab-label{
      background:#1B2A4A; color:white; padding:6px 14px; border-radius:20px;
      font-size:12px; font-weight:600; font-family:'Inter',sans-serif;
      white-space:nowrap; opacity:0; transform:translateX(10px);
      transition:opacity 0.2s, transform 0.2s; pointer-events:none;
    }
    #en-ai-fab-btn:hover + #en-ai-fab-label,
    #en-ai-fab:hover #en-ai-fab-label{ opacity:1; transform:translateX(0); }

    /* AI Chat Panel */
    #en-ai-panel{
      position:fixed; bottom:0; right:0; width:360px; height:100vh; max-height:100vh;
      background:#F7F4EC; border-left:2px solid #1B2A4A;
      z-index:600; display:flex; flex-direction:column;
      transform:translateX(100%); transition:transform 0.3s cubic-bezier(0.4,0,0.2,1);
      font-family:'Inter',sans-serif;
    }
    #en-ai-panel.open{ transform:translateX(0); }
    #en-ai-panel-header{
      background:#1B2A4A; color:white; padding:16px 18px;
      display:flex; align-items:center; justify-content:space-between; flex-shrink:0;
    }
    #en-ai-panel-header .title{ font-family:'Fraunces',serif; font-size:17px; font-weight:600; }
    #en-ai-panel-header .subtitle{ font-size:11px; opacity:0.65; margin-top:2px; }
    #en-ai-close{ background:none; border:none; color:white; font-size:22px; cursor:pointer; padding:0; line-height:1; }
    #en-ai-messages{
      flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:12px;
    }
    .ai-msg{ max-width:88%; padding:11px 14px; border-radius:14px; font-size:13.5px; line-height:1.65; }
    .ai-msg.user{ background:#1B2A4A; color:white; align-self:flex-end; border-radius:14px 14px 4px 14px; }
    .ai-msg.bot{ background:white; color:#1B2A4A; border:1.5px solid #E4DFD0; align-self:flex-start; border-radius:14px 14px 14px 4px; }
    .ai-msg.bot .sender{ font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:#4A90D9; margin-bottom:5px; }
    .ai-msg.typing{ opacity:0.6; }
    #en-ai-suggestions{
      padding:10px 14px; display:flex; gap:7px; flex-wrap:wrap; border-top:1px solid #E4DFD0;
      background:white; flex-shrink:0;
    }
    .ai-suggestion{
      font-size:11.5px; padding:5px 11px; border-radius:15px;
      border:1.5px solid #E4DFD0; background:#F7F4EC; cursor:pointer;
      font-family:'Inter',sans-serif; font-weight:500; color:#1B2A4A;
      transition:all 0.15s; white-space:nowrap;
    }
    .ai-suggestion:hover{ border-color:#4A90D9; color:#4A90D9; background:rgba(74,144,217,0.06); }
    #en-ai-input-row{
      padding:12px 14px; border-top:2px solid #1B2A4A; background:white;
      display:flex; gap:8px; flex-shrink:0;
    }
    #en-ai-input{
      flex:1; padding:10px 13px; border-radius:22px; border:1.5px solid #E4DFD0;
      font-family:'Inter',sans-serif; font-size:13.5px; background:#F7F4EC; color:#1B2A4A;
      outline:none;
    }
    #en-ai-input:focus{ border-color:#4A90D9; }
    #en-ai-send{
      width:42px; height:42px; border-radius:50%; border:none;
      background:linear-gradient(135deg,#4A90D9,#7B5EA7); color:white;
      font-size:18px; cursor:pointer; display:flex; align-items:center; justify-content:center;
      flex-shrink:0;
    }
    #en-ai-send:disabled{ opacity:0.5; cursor:not-allowed; }
    .ai-limit-bar{
      background:rgba(181,72,42,0.08); border-top:1px solid rgba(181,72,42,0.2);
      padding:10px 14px; font-size:12px; color:#B5482A; text-align:center;
      flex-shrink:0;
    }
    .ai-limit-bar a{ color:#B5482A; font-weight:700; }
    @media(max-width:400px){
      #en-ai-panel{ width:100%; }
    }
    @media(prefers-reduced-motion:reduce){
      #en-ai-panel{ transition:none; }
      #en-ai-fab-btn{ transition:none; }
    }
  `;
  document.head.appendChild(style);

  // HTML-escape helper to prevent XSS
  function esc(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

  // Get page context for smart suggestions
  function getPageContext(){
    const path = window.location.pathname;
    if(path.includes('tenses')) return {
      lesson: '12 Tenses',
      suggestions: ['Explain Present Perfect','Difference: Simple vs Perfect','When to use Past Continuous?','Give me an example sentence']
    };
    if(path.includes('noun')) return {
      lesson: 'Noun',
      suggestions: ['What is a collective noun?','Difference: Abstract vs Concrete','Give examples of proper nouns','What is material noun?']
    };
    if(path.includes('pronoun')) return {
      lesson: 'Pronoun',
      suggestions: ['Explain reflexive pronouns','When to use who vs whom?','Possessive pronoun examples','Difference: his vs him']
    };
    if(path.includes('verbforms')) return {
      lesson: 'Verb Forms',
      suggestions: ['What is 4th form used for?','Irregular verbs list tip','When do we add -es?','Explain past participle']
    };
    if(path.includes('conjunctions')) return {
      lesson: 'Conjunctions',
      suggestions: ['although vs though','since vs because','unless vs if not','as soon as usage']
    };
    if(path.includes('tensepairs')) return {
      lesson: 'Tense Pairs',
      suggestions: ['Explain Pair 4','When to use Past Perfect?','Simple + Simple examples','Future condition pattern']
    };
    if(path.includes('paragraph')) return {
      lesson: 'Paragraph & Conjunctions',
      suggestions: ['Explain "since" here','Difference: but vs however','When to use "as soon as"','What does "hence" mean?']
    };
    if(path.includes('modals')) return {
      lesson: 'Modal Verbs',
      suggestions: ['must vs have to','should vs ought to','Logical conclusion examples','can vs could difference']
    };
    if(path.includes('300verbs')) return {
      lesson: '300 Verbs Reference',
      suggestions: ['Tips to memorize irregular verbs','Explain past participle use','Regular verb pattern rule','Most common irregular verbs']
    };
    if(path.includes('dashboard')) return {
      lesson: 'Grammar General',
      suggestions: ['How to improve my English?','Most common grammar mistakes','Daily practice tips','Explain tense system simply']
    };
    return {
      lesson: 'English Grammar',
      suggestions: ['Explain tenses briefly','Common grammar mistakes','How to practice English?','Difference: has vs have']
    };
  }

  // FAB HTML
  const fab = document.createElement('div');
  fab.id = 'en-ai-fab';
  fab.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;flex-direction:row-reverse;">
      <button id="en-ai-fab-btn" onclick="ENAIPanel.toggle()" title="AI Grammar Coach">
        🤖
        <span id="en-ai-fab-badge"></span>
      </button>
      <span id="en-ai-fab-label">AI Grammar Coach</span>
    </div>
  `;
  document.body.appendChild(fab);

  // Panel HTML
  const ctx = getPageContext();
  const panel = document.createElement('div');
  panel.id = 'en-ai-panel';
  panel.innerHTML = `
    <div id="en-ai-panel-header">
      <div>
        <div class="title">🤖 AI Grammar Coach</div>
        <div class="subtitle">Powered by Groq + LLaMA 3 · ${ctx.lesson}</div>
      </div>
      <button id="en-ai-close" onclick="ENAIPanel.close()">✕</button>
    </div>
    <div id="en-ai-messages">
      <div class="ai-msg bot">
        <div class="sender">AI Coach</div>
        Hi! I'm your AI Grammar Coach powered by LLaMA 3. Ask me anything about <strong>${ctx.lesson}</strong> — grammar rules, examples, explanations, or corrections. I'll reply in clear, simple English! 😊
      </div>
    </div>
    <div id="en-ai-suggestions">
      ${ctx.suggestions.map(s => `<button class="ai-suggestion" onclick="ENAIPanel.sendSuggestion('${esc(s)}')">${esc(s)}</button>`).join('')}
    </div>
    <div id="en-ai-limit-bar" class="ai-limit-bar" style="display:none">
      ⚠️ Free AI checks used up — <a href="pricing.html">Upgrade to Pro for unlimited →</a>
    </div>
    <div id="en-ai-input-row">
      <input id="en-ai-input" placeholder="Ask anything about grammar..." 
             onkeydown="if(event.key==='Enter')ENAIPanel.send()">
      <button id="en-ai-send" onclick="ENAIPanel.send()">➤</button>
    </div>
  `;
  document.body.appendChild(panel);

  EN_AI.updateBadge();
})();

// ============================================
// PANEL CONTROLLER
// ============================================
const ENAIPanel = {
  open(){ 
    document.getElementById('en-ai-panel').classList.add('open');
    document.getElementById('en-ai-input').focus();
  },
  close(){ 
    document.getElementById('en-ai-panel').classList.remove('open');
  },
  toggle(){
    const panel = document.getElementById('en-ai-panel');
    if(panel.classList.contains('open')) this.close();
    else this.open();
  },
  sendSuggestion(text){
    document.getElementById('en-ai-input').value = text;
    this.send();
  },
  addMsg(text, type){
    const msgs = document.getElementById('en-ai-messages');
    const div = document.createElement('div');
    div.className = 'ai-msg ' + type;
    if(type === 'bot'){
      div.innerHTML = `<div class="sender">AI Coach</div>${text.replace(/\n/g,'<br>')}`;
    } else {
      div.textContent = text;
    }
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  },
  async send(){
    if(EN_AI.hasLimit()){
      document.getElementById('en-ai-limit-bar').style.display = 'block';
      return;
    }
    const input = document.getElementById('en-ai-input');
    const text = input.value.trim();
    if(!text) return;
    input.value = '';

    // Hide suggestions after first use
    document.getElementById('en-ai-suggestions').style.display = 'none';

    this.addMsg(text, 'user');
    const typingDiv = this.addMsg('Thinking...', 'bot typing');
    document.getElementById('en-ai-send').disabled = true;

    const path = window.location.pathname;
    const lessonCtx = path.includes('tenses') ? '12 English Tenses (Present/Past/Future Simple, Continuous, Perfect, Perfect Continuous)' :
                     path.includes('noun') ? 'English Nouns (8 kinds: Common, Proper, Collective, Material, Abstract, Concrete, Countable, Uncountable)' :
                     path.includes('pronoun') ? 'English Pronouns (Personal, Possessive, Self, Demonstrative, Interrogative)' :
                     path.includes('verbforms') ? 'English Verb Forms (1st, s/es, 2nd, 3rd, 4th form)' :
                     path.includes('conjunctions') ? 'English Conjunctions (Coordinating, Subordinating, Conditional, Time)' :
                     path.includes('modals') ? 'Modal Verbs (can, could, should, must, have to, logical conclusion)' :
                     'English Grammar';

    const sys = `You are an expert English grammar teacher for Pakistani students. The student is currently studying: ${lessonCtx}.
Answer entirely in simple, clear English — no Urdu or Roman Urdu.
Be concise (3-5 lines max), use examples, and be encouraging.
Format: explanation first, then 1 example sentence in English.`;

    try{
      const reply = await EN_AI.call(sys, text);
      typingDiv.classList.remove('typing');
      typingDiv.innerHTML = `<div class="sender">AI Coach</div>${reply.replace(/\n/g,'<br>')}`;
      EN_AI.addUsed();
      EN_AI.updateBadge();
      if(EN_AI.hasLimit()){
        document.getElementById('en-ai-limit-bar').style.display = 'block';
      }
    } catch(e){
      typingDiv.innerHTML = `<div class="sender">AI Coach</div>Sorry, could not connect. Please try again.`;
    }
    document.getElementById('en-ai-send').disabled = false;
    document.getElementById('en-ai-messages').scrollTop = 99999;
  }
};
