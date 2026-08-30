// EnglishNotebook — Auth Guard (safe version, no document.write)
// Include this at the very top of <head> on every protected page.
// It hides the page via a style element, checks the Supabase session, and:
//   - redirects to auth.html if the user is NOT logged in
//   - reveals the page if they ARE (or have logged in before)

(function(){
  // Inject a <style> that hides the page — NO document.write
  var s = document.createElement('style');
  s.id = 'en-guard-style';
  s.textContent = 'html{visibility:hidden !important;}';
  document.head.appendChild(s);
})();

window.EN_GUARD_READY = new Promise(function(resolve){
  window.EN_GUARD_RESOLVE = resolve;
});

(function(){
  function reveal(){
    var s = document.getElementById('en-guard-style');
    if(s) s.remove();
    document.documentElement.style.visibility = '';
  }

  function loadSupabase(cb){
    if(window.supabase){ cb(); return; }
    var script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    script.onload = cb;
    script.onerror = cb; // fail open
    document.head.appendChild(script);
  }

  loadSupabase(async function(){
    try{
      var SUPABASE_URL = "https://dcjiwlncugqihnkjbncm.supabase.co";
      var SUPABASE_KEY = "sb_publishable_sQ-QfG_obdW1FN_js9_0ww_WqRGStRd";
      var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      window.EN_SB = sb;

      var result = await sb.auth.getSession();
      var session = result.data && result.data.session;

      if(!session){
        var hasLoggedIn = localStorage.getItem('en_logged_in');
        if(hasLoggedIn){
          reveal();
          if(window.EN_GUARD_RESOLVE) window.EN_GUARD_RESOLVE(null);
          return;
        }
        var here = window.location.pathname.split('/').pop();
        window.location.replace('auth.html?next=' + encodeURIComponent(here));
        return;
      }

      localStorage.setItem('en_logged_in', '1');

      var userResult = await sb.auth.getUser();
      var user = userResult.data && userResult.data.user;
      if(user){
        try{
          var profileResult = await sb.from('profiles').select('plan,full_name').eq('id',user.id).single();
          var profile = profileResult.data;
          var progress = JSON.parse(localStorage.getItem('englishnotebook_progress_v1')||'{}');
          progress.plan = (profile && profile.plan) || progress.plan || 'free';
          localStorage.setItem('englishnotebook_progress_v1', JSON.stringify(progress));
          if(profile && profile.full_name){
            localStorage.setItem('en_user_name', profile.full_name);
          }
        }catch(e){ /* profile row may not exist yet */ }
      }

      reveal();
      if(window.EN_GUARD_RESOLVE) window.EN_GUARD_RESOLVE(session);
    } catch(e){
      console.error('EN_GUARD error', e);
      reveal();
      if(window.EN_GUARD_RESOLVE) window.EN_GUARD_RESOLVE(null);
    }
  });
})();
