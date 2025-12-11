// Authentication Logic
document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.getElementById('btn-login');
  const logoutBtn = document.getElementById('btn-logout');
  const authError = document.getElementById('auth-error');
  const authSuccess = document.getElementById('auth-success');
  const authEmail = document.getElementById('auth-email');
  const authPassword = document.getElementById('auth-password');

  if (!loginBtn) return;

  const setMessages = (errorMsg, successMsg) => {
    if (authError) authError.textContent = errorMsg || '';
    if (authSuccess) authSuccess.textContent = successMsg || '';
  };

  const setLoggedIn = (loggedIn) => {
    if (logoutBtn) logoutBtn.classList.toggle('hidden', !loggedIn);
    if (loginBtn) loginBtn.disabled = loggedIn;
    if (authEmail) authEmail.disabled = loggedIn;
    if (authPassword) authPassword.disabled = loggedIn;
  };

  loginBtn.addEventListener('click', async () => {
    setMessages('', '');
    const email = (authEmail.value || '').trim();
    const password = authPassword.value;
    if (!email || !password) {
      setMessages('ایمیل و رمز عبور را وارد کنید.', '');
      return;
    }
    loginBtn.disabled = true;
    loginBtn.textContent = 'در حال ورود...';
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessages(error.message, '');
      loginBtn.disabled = false;
      loginBtn.textContent = 'ورود';
    }
  });

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await supabase.auth.signOut();
      if (authEmail) authEmail.value = '';
      if (authPassword) authPassword.value = '';
      setMessages('', '');
      window.location.href = 'index.html';
    });
  }

  supabase.auth.onAuthStateChange((_event, session) => {
    setLoggedIn(!!session);
    if (session) {
      setMessages('', 'وارد شدید.');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 500);
    } else {
      setLoggedIn(false);
    }
  });

  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      window.location.href = 'dashboard.html';
    } else {
      setLoggedIn(false);
    }
  });
});

