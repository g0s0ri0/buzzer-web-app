// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// --- Lógica del Juego ---
let participantes = [];
let buzzerActivo = false;
let startTime = 0; 

function getScoreboard() {
    return participantes
        .filter(p => p.tiempoBuzzer !== null)
        .sort((a, b) => a.tiempoBuzzer - b.tiempoBuzzer);
}

// Sirve los archivos estáticos
app.use(express.static('public'));

// Manejo de conexiones de Socket.IO
io.on('connection', (socket) => {
    console.log(`Usuario conectado: ${socket.id}`);

    // 1. REGISTRO DE PARTICIPANTE
    socket.on('register:player', (name) => {
        if (name && !participantes.find(p => p.name === name)) {
            const player = {
                id: socket.id,
                name: name,
                tiempoBuzzer: null,
            };
            participantes.push(player);
            socket.join('participantes'); 
            
            io.emit('player:list:update', participantes.map(p => p.name));
            console.log(`Nuevo participante: ${name}`);
        } else {
            socket.emit('registration:error', 'El nombre ya está en uso o es inválido.');
        }
    });

    // 2. INICIO DEL BUZZER (Admin)
    socket.on('admin:start:buzzer', () => {
        if (!buzzerActivo) {
            buzzerActivo = true;
            startTime = Date.now();
            participantes = participantes.map(p => ({ ...p, tiempoBuzzer: null }));

            io.emit('buzzer:active', true);
            console.log('--- Buzzer INICIADO ---');
        }
    });

    // 3. PULSACIÓN DEL BUZZER
    socket.on('player:press:buzzer', () => {
        const playerIndex = participantes.findIndex(p => p.id === socket.id);
        
        if (buzzerActivo && playerIndex !== -1 && participantes[playerIndex].tiempoBuzzer === null) {
            const responseTime = Date.now() - startTime;
            participantes[playerIndex].tiempoBuzzer = responseTime;
            
            buzzerActivo = false;

            io.emit('buzzer:active', false);
            io.emit('score:update', getScoreboard());
            console.log(`${participantes[playerIndex].name} ha pulsado! Tiempo: ${responseTime}ms`);
        }
    });

    // 4. RESET DEL JUEGO
    socket.on('admin:reset:game', () => {
        buzzerActivo = false;
        startTime = 0;
        participantes = participantes.map(p => ({ ...p, tiempoBuzzer: null }));
        io.emit('buzzer:active', false);
        io.emit('score:update', getScoreboard());
        io.emit('player:list:update', participantes.map(p => p.name));
        console.log('--- Juego Reseteado ---');
    });

    // 5. DESCONEXIÓN
    socket.on('disconnect', () => {
        participantes = participantes.filter(p => p.id !== socket.id);
        io.emit('player:list:update', participantes.map(p => p.name));
        io.emit('score:update', getScoreboard());
        console.log(`Usuario desconectado: ${socket.id}`);
    });
});

// Inicia el servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor de Buzzer corriendo en http://localhost:${PORT}`);
});
