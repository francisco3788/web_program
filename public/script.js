let tempUser = "";

// REGISTER
async function register() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    alert(res.ok ? "✅ Usuario creado" : data.error);
}

// LOGIN
async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (data.requires2FA) {
        tempUser = data.username;
        alert("🔐 Ingresa el código 2FA");
    } else if (data.token) {
        localStorage.setItem('token', data.token);
        alert("✅ Login correcto");
    } else {
        alert(data.error);
    }
}