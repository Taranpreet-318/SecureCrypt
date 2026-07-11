const signupForm = document.getElementById('signupForm');
const formAlert = document.getElementById('formAlert');
const submitBtn = document.getElementById('submitBtn');
const passwordInput = document.getElementById('password');
const strengthFill = document.getElementById('strengthFill');
const usernameError = document.getElementById('usernameError');
const emailError = document.getElementById('emailError');

function showAlert(message){
  formAlert.textContent = message;
  formAlert.classList.add('show');
}
function hideAlert(){
  formAlert.classList.remove('show');
  formAlert.textContent = '';
}

function passwordStrength(pw){
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score; // 0-5
}

passwordInput.addEventListener('input', () => {
  const score = passwordStrength(passwordInput.value);
  const pct = Math.min(100, (score / 5) * 100);
  strengthFill.style.width = pct + '%';
  if (score <= 1) strengthFill.style.background = 'var(--bad)';
  else if (score <= 3) strengthFill.style.background = 'var(--gold)';
  else strengthFill.style.background = 'var(--good)';
});

const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAlert();
  usernameError.textContent = '';
  emailError.textContent = '';

  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = passwordInput.value;
  const terms = document.getElementById('terms').checked;

  let valid = true;
  if (username.length < 3){
    usernameError.textContent = 'Username must be at least 3 characters.';
    valid = false;
  }
  if (!emailRe.test(email)){
    emailError.textContent = 'Enter a valid email address.';
    valid = false;
  }
  if (password.length < 8){
    showAlert('Password must be at least 8 characters.');
    valid = false;
  }
  if (!terms){
    showAlert('Please agree to the Terms of Service to continue.');
    valid = false;
  }
  if (!valid) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating account…';

  try {
    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();

    if (!res.ok){
      showAlert(data.error || 'Could not create account. Please try again.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create account';
      return;
    }

    window.location.href = data.redirect || '/dashboard';
  } catch (err){
    console.error(err);
    showAlert('Something went wrong. Please try again.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create account';
  }
});
