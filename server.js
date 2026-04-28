const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const bcrypt = require('bcryptjs');
const { setupDB } = require('./database');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const SECRET_KEY = "clave_super_segura";

let db;

setupDB().then(database => {
    db = database;
    console.log("🗄️ DB lista");
});

// -------- REGISTER --------
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;

    try {
        const hash = await bcrypt.hash(password, 10);

        await db.run(
            'INSERT INTO users (username, password_hash) VALUES (?, ?)',
            [username, hash]
        );

        res.json({ ok: true });
    } catch {
        res.status(400).json({ error: "Usuario ya existe" });
    }
});

// -------- LOGIN --------
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    const user = await db.get(
        'SELECT * FROM users WHERE username = ?',
        [username]
    );

    if (!user) return res.status(401).json({ error: "Usuario no existe" });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Contraseña incorrecta" });

    // 🔐 Si tiene 2FA → NO entra aún
    if (user.twofa_secret) {
        return res.json({
            requires2FA: true,
            username: user.username
        });
    }

    // ✔ Login normal
    const token = jwt.sign({ name: user.username }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token });
});

// -------- GENERAR QR (NO guarda aún) --------
app.post('/api/2fa/setup', async (req, res) => {
    const { username } = req.body;

    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) return res.status(400).json({ error: "Usuario no existe" });

    const secret = speakeasy.generateSecret({
        name: `App (${username})`
    });

    qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
        if (err) return res.status(500).json({ error: "Error generando QR" });

        res.json({
            qrCode: data_url,
            secret: secret.base32
        });
    });
});

// -------- ACTIVAR 2FA (aquí sí guarda) --------
app.post('/api/2fa/activate', async (req, res) => {
    const { username, token, secret } = req.body;

    const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 1
    });

    if (!verified) {
        return res.status(400).json({ error: "Código incorrecto" });
    }

    await db.run(
        'UPDATE users SET twofa_secret = ? WHERE username = ?',
        [secret, username]
    );

    res.json({ success: true });
});

// -------- LOGIN CON 2FA --------
app.post('/api/2fa/login', async (req, res) => {
    const { username, token } = req.body;

    const user = await db.get(
        'SELECT * FROM users WHERE username = ?',
        [username]
    );

    if (!user || !user.twofa_secret) {
        return res.status(400).json({ error: "2FA no configurado" });
    }

    const verified = speakeasy.totp.verify({
        secret: user.twofa_secret,
        encoding: 'base32',
        token,
        window: 1
    });

    if (!verified) {
        return res.status(401).json({ error: "Código incorrecto" });
    }

    const jwtToken = jwt.sign({ name: user.username }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token: jwtToken });
});

app.listen(3000, '127.0.0.1');