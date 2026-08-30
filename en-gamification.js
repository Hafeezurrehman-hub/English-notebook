
// ============================================
// EnglishNotebook — Gamification System
// Phase 2: Streaks, Badges, Completion
// ============================================

const EN_GAME = {

  // ── Streak System ──
  getStreak(){
    const data = JSON.parse(localStorage.getItem('en_streak') || '{"count":0,"lastDate":""}');
    return data;
  },
  updateStreak(){
    const today = new Date().toDateString();
    const streak = this.getStreak();
    if(streak.lastDate === today) return streak.count; // already visited today
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if(streak.lastDate === yesterday){
      streak.count += 1; // continuing streak
    } else if(streak.lastDate !== today){
      streak.count = 1; // reset streak
    }
    streak.lastDate = today;
    localStorage.setItem('en_streak', JSON.stringify(streak));
    return streak.count;
  },

  // ── Badge System ──
  BADGES: [
    { id:'first_lesson',   icon:'🎯', name:'First Step',      desc:'Completed your first lesson',          check:(stats)=> stats.totalAttempted >= 1 },
    { id:'streak_3',       icon:'🔥', name:'On Fire',         desc:'3 day learning streak',                check:()=> EN_GAME.getStreak().count >= 3 },
    { id:'streak_7',       icon:'⚡', name:'Week Warrior',    desc:'7 day learning streak',                check:()=> EN_GAME.getStreak().count >= 7 },
    { id:'noun_master',    icon:'📝', name:'Noun Master',     desc:'100% on Noun lesson',                  check:(s)=> s.lessons.l1_noun >= 100 },
    { id:'tense_master',   icon:'⏰', name:'Tense Master',    desc:'80%+ on 12 Tenses',                   check:(s)=> s.lessons.l4_5_tenses >= 80 },
    { id:'verb_master',    icon:'💪', name:'Verb Champion',   desc:'100% on Verb Forms',                  check:(s)=> s.lessons.l3_verbforms >= 100 },
    { id:'halfway',        icon:'🌟', name:'Halfway There',   desc:'Completed 5 lessons',                  check:(s)=> s.completedLessons >= 5 },
    { id:'scholar',        icon:'🎓', name:'Grammar Scholar', desc:'Completed all 9 lessons',              check:(s)=> s.completedLessons >= 9 },
    { id:'ai_user',        icon:'🤖', name:'AI Explorer',     desc:'Used AI Coach for the first time',     check:()=> parseInt(localStorage.getItem('en_ai_used')||0) >= 1 },
    { id:'perfect_score',  icon:'💯', name:'Perfect Score',   desc:'Got 100% on any lesson',              check:(s)=> Object.values(s.lessons).some(p=>p>=100) },
    { id:'early_bird',     icon:'🌅', name:'Early Bird',      desc:'Studied before 8 AM',                 check:()=> { const h=new Date().getHours(); return h>=5&&h<8; } },
    { id:'night_owl',      icon:'🦉', name:'Night Owl',       desc:'Studied after 10 PM',                 check:()=> { const h=new Date().getHours(); return h>=22||h<2; } },
  ],

  getEarnedBadges(){
    return JSON.parse(localStorage.getItem('en_badges') || '[]');
  },

  checkBadges(stats){
    const earned = this.getEarnedBadges();
    const newBadges = [];
    this.BADGES.forEach(badge=>{
      if(!earned.includes(badge.id) && badge.check(stats)){
        earned.push(badge.id);
        newBadges.push(badge);
      }
    });
    if(newBadges.length > 0){
      localStorage.setItem('en_badges', JSON.stringify(earned));
      newBadges.forEach(b => this.showBadgePopup(b));
    }
    return earned;
  },

  getLessonStats(){
    const TOTALS = {l1_noun:45,l2_pronoun:27,l3_verbforms:15,l4_5_tenses:84,
                   l6_conjunctions:20,l7_tensepairs:14,l8_paragraph:13,l9_13_modals:23,v300:30};
    const progress = JSON.parse(localStorage.getItem('englishnotebook_progress_v1')||'{}');
    const lessons = {};
    let totalCorrect=0, totalAttempted=0, completedLessons=0;

    Object.entries(TOTALS).forEach(([lid, total])=>{
      const l = progress.lessons?.[lid];
      const correct = l ? Object.values(l.questions||{}).filter(q=>q.correct).length : 0;
      const pct = total > 0 ? Math.round((correct/total)*100) : 0;
      lessons[lid] = pct;
      totalCorrect += correct;
      totalAttempted += Object.values(l?.questions||{}).filter(q=>q.attempted).length;
      if(pct >= 80) completedLessons++;
    });

    return { lessons, totalCorrect, totalAttempted, completedLessons };
  },

  // ── Trophy/Badge Popup ──
  showBadgePopup(badge){
    const popup = document.createElement('div');
    popup.style.cssText = `
      position:fixed; top:50%; left:50%; transform:translate(-50%,-50%) scale(0.5);
      z-index:9999; background:#F7F4EC; border:3px solid #1B2A4A;
      border-radius:24px; padding:32px 36px; text-align:center;
      box-shadow:8px 8px 0 #1B2A4A; max-width:320px; width:90%;
      transition:transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s;
      opacity:0; font-family:'Inter',sans-serif;
    `;
    popup.innerHTML = `
      <div style="font-size:60px;margin-bottom:12px;">${badge.icon}</div>
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#2F6F5E;font-weight:700;margin-bottom:8px;">Badge Earned! 🎉</div>
      <div style="font-family:'Fraunces',serif;font-size:22px;font-weight:600;margin-bottom:8px;">${badge.name}</div>
      <div style="font-size:13.5px;color:#8A8370;margin-bottom:20px;">${badge.desc}</div>
      <button onclick="this.parentElement.remove();document.getElementById('en-overlay-bg')?.remove();" style="
        background:#1B2A4A;color:white;border:none;padding:10px 28px;
        border-radius:25px;font-family:'Inter',sans-serif;font-size:14px;
        font-weight:700;cursor:pointer;
      ">Awesome! 🚀</button>
    `;
    const overlay = document.createElement('div');
    overlay.id = 'en-overlay-bg';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(27,42,74,0.5);z-index:9998;';
    overlay.onclick = ()=>{ popup.remove(); overlay.remove(); };
    document.body.appendChild(overlay);
    document.body.appendChild(popup);
    // Animate in
    setTimeout(()=>{ popup.style.transform='translate(-50%,-50%) scale(1)'; popup.style.opacity='1'; }, 50);
    // Confetti
    this.confetti();
  },

  // ── Simple Confetti ──
  confetti(){
    const colors = ['#2F6F5E','#4A90D9','#D48C00','#B5482A','#7B5EA7'];
    for(let i=0;i<40;i++){
      const el = document.createElement('div');
      el.style.cssText = `
        position:fixed; top:-10px; z-index:10000; pointer-events:none;
        width:${6+Math.random()*8}px; height:${6+Math.random()*8}px;
        background:${colors[Math.floor(Math.random()*colors.length)]};
        border-radius:${Math.random()>0.5?'50%':'2px'};
        left:${Math.random()*100}vw;
        animation: confettiFall ${1.5+Math.random()*2}s ease-out forwards;
      `;
      document.body.appendChild(el);
      setTimeout(()=>el.remove(), 4000);
    }
    if(!document.getElementById('confetti-style')){
      const s=document.createElement('style');
      s.id='confetti-style';
      s.textContent=`@keyframes confettiFall{
        0%{transform:translateY(0) rotate(0deg);opacity:1}
        100%{transform:translateY(100vh) rotate(720deg);opacity:0}
      }`;
      document.head.appendChild(s);
    }
  },

  // ── Lesson Complete Animation ──
  showLessonComplete(pct, lessonName){
    const popup = document.createElement('div');
    const emoji = pct>=100?'🏆':pct>=80?'⭐':pct>=50?'👍':'💪';
    const msg = pct>=100?'Perfect Score!':pct>=80?'Excellent Work!':pct>=50?'Good Progress!':'Keep Going!';
    popup.style.cssText = `
      position:fixed; bottom:100px; left:50%; transform:translateX(-50%) translateY(20px);
      z-index:888; background:#1B2A4A; color:white;
      border-radius:16px; padding:16px 24px; text-align:center;
      box-shadow:0 8px 30px rgba(0,0,0,0.3); opacity:0;
      transition:all 0.4s cubic-bezier(0.34,1.56,0.64,1);
      font-family:'Inter',sans-serif; white-space:nowrap;
    `;
    popup.innerHTML = `
      <span style="font-size:24px;">${emoji}</span>
      <strong style="font-family:'Fraunces',serif;font-size:16px;margin:0 10px;">${msg}</strong>
      <span style="font-size:14px;opacity:0.8;">${pct}% on ${lessonName}</span>
    `;
    document.body.appendChild(popup);
    setTimeout(()=>{ popup.style.opacity='1'; popup.style.transform='translateX(-50%) translateY(0)'; },50);
    setTimeout(()=>{ popup.style.opacity='0'; popup.style.transform='translateX(-50%) translateY(20px)'; },4000);
    setTimeout(()=>popup.remove(), 4500);
    if(pct >= 100) this.confetti();
  },

  // ── Streak Widget (injected on home page) ──
  injectStreakWidget(){
    const count = this.updateStreak();
    const stats = this.getLessonStats();
    this.checkBadges(stats);
    const earned = this.getEarnedBadges();

    const widget = document.createElement('div');
    widget.style.cssText = `
      max-width:960px; margin:0 auto; padding:0 24px 20px;
      display:grid; grid-template-columns:1fr 1fr; gap:14px;
    `;

    // Streak card
    const flameColor = count>=7?'#E07055':count>=3?'#D48C00':'#4A90D9';
    widget.innerHTML = `
      <div style="background:white;border:1.5px solid #E4DFD0;border-radius:14px;padding:16px 20px;display:flex;align-items:center;gap:16px;">
        <div style="font-size:40px;">🔥</div>
        <div>
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#8A8370;font-weight:700;">Learning Streak</div>
          <div style="font-family:'Fraunces',serif;font-size:28px;font-weight:700;color:${flameColor};">${count} Day${count!==1?'s':''}</div>
          <div style="font-size:12px;color:#8A8370;">${count>=7?'Amazing! Keep it up! 🏆':count>=3?'On fire! Don't stop! ⚡':'Study daily to build streak'}</div>
        </div>
      </div>
      <div style="background:white;border:1.5px solid #E4DFD0;border-radius:14px;padding:16px 20px;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#8A8370;font-weight:700;margin-bottom:10px;">Badges Earned (${earned.length}/${EN_GAME.BADGES.length})</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${EN_GAME.BADGES.map(b=>`
            <span title="${b.name}: ${b.desc}" style="font-size:22px;${earned.includes(b.id)?'opacity:1':'opacity:0.2;filter:grayscale(1)'};cursor:default;">
              ${b.icon}
            </span>
          `).join('')}
        </div>
      </div>
    `;

    // Insert after AI banner
    const overall = document.querySelector('.overall');
    if(overall) overall.after(widget);
  }
};

// Auto-init on home page
if(window.location.pathname.includes('index') || 
   window.location.pathname.endsWith('/') ||
   window.location.pathname.endsWith('EnglishNotebook-Home.html')){
  document.addEventListener('DOMContentLoaded', ()=>{
    setTimeout(()=> EN_GAME.injectStreakWidget(), 100);
  });
  // Also run immediately if DOM already loaded
  if(document.readyState !== 'loading') EN_GAME.injectStreakWidget();
}

