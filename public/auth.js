let tempSecret = "";

// GENERAR QR
async function configurar2FA() {
    const username = document.getElementById('username').value;

    const res = await fetch('/api/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
    });

    const data = await res.json();

    if (!res.ok) {
        alert(data.error);
        return;
    }

    tempSecret = data.secret;

    document.getElementById('qr').innerHTML =
        `<img src="${data.qrCode}" width="200">`;
}

// ACTIVAR 2FA
async function activar2FA() {
    const username = document.getElementById('username').value;
    const codigo = document.getElementById('codigo2fa').value;

    const res = await fetch('/api/2fa/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username,
            token: codigo,
            secret: tempSecret
        })
    });

    const data = await res.json();
    alert(data.success ? "✅ 2FA ACTIVADO" : data.error);
}

// LOGIN CON 2FA
async function login2FA() {
    const codigo = document.getElementById('codigo2fa').value;

    if (!tempUser) {
        alert("Primero haz login");
        return;
    }

    const res = await fetch('/api/2fa/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: tempUser,
            token: codigo
        })
    });

    const data = await res.json();

    if (data.token) {
        localStorage.setItem('token', data.token);
        alert("✅ ACCESO COMPLETO");
    } else {
        alert(data.error);
    }
}