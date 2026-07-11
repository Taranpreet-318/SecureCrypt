const loginForm = document.getElementById('loginForm');
const formAlert = document.getElementById('formAlert');
const submitBtn = document.getElementById('submitBtn');

function showAlert(message){
  formAlert.textContent = message;
  formAlert.classList.add('show');
}
function hideAlert(){
  formAlert.classList.remove('show');
  formAlert.textContent = '';
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAlert();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  if (!username || !password){
    showAlert('Please fill in both fields.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Logging in…';

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (!res.ok){
      showAlert(data.error || 'Login failed. Please try again.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Log in';
      return;
    }

    window.location.href = data.redirect || '/dashboard';
  } catch (err){
    console.error(err);
    showAlert('Something went wrong. Please try again.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Log in';
  }
});
