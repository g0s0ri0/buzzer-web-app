// public/client.js
const socket = io();
let isAdministrator = false;
let playerName = '';

// --- Elementos de la UI ---
const setupView = document.getElementById('setup-view');
const playerView = document.getElementById('player-view');
const adminView = document.getElementById('admin-view');
const nameInput = document.getElementById('name-input');
const playerNameDisplay = document.getElementById('player-name-display');
const errorMessage = document.getElementById('error-message');
const buzzerButton = document.getElementById('buzzer-button');
const scoreboardBody = document.querySelector('#scoreboard tbody');
const playerList = document.getElementById('playerList');

// --- Funciones de la Aplicación ---
function joinGame() {
    playerName = nameInput.value.trim();
    if (playerName.toUpperCase() === 'ADMIN') {
        isAdministrator = true;
        setupView.style.display = 'none';
        adminView.style.display = 'block';
    } else if (playerName) {
        socket.emit('register:player', playerName);
    } else {
        errorMessage.textContent = 'Por favor, ingresa un nombre.';
    }
}

function pressBuzzer() {
    buzzerButton.disabled = true;
    buzzerButton.textContent = '¡PULSADO!';
    socket.emit('player:press:buzzer');
}

function startGame() {
    if (isAdministrator) {
        socket.emit('admin:start:buzzer');
    }
}

function resetGame() {
    if (isAdministrator) {
        socket.emit('admin:reset:game');
    }
}

// --- Manejo de Eventos de Socket.IO ---
socket.on('player:list:update', (names) => {
    if (!isAdministrator && playerName) {
        setupView.style.display = 'none';
        playerView.style.display = 'block';
        playerNameDisplay.textContent = playerName;
        errorMessage.textContent = '';
    }
    playerList.innerHTML = names.map(name => `<li>${name}</li>`).join('');
});

socket.on('registration:error', (message) => {
    errorMessage.textContent = message;
    playerName = '';
});

socket.on('buzzer:active', (isActive) => {
    if (!isAdministrator) {
        buzzerButton.disabled = !isActive;
        buzzerButton.textContent = isActive ? '¡OPRIME AQUÍ!' : 'Esperando...';
    }
    if (isAdministrator) {
        document.querySelector('#admin-view h2').textContent = isActive ? '⭐ Buzzer Activo' : '⭐ Panel de Administrador';
    }
});

socket.on('score:update', (scoreboard) => {
    scoreboardBody.innerHTML = '';

    if (scoreboard.length > 0) {
        scoreboard.forEach((player, index) => {
            const row = scoreboardBody.insertRow();
            row.insertCell().textContent = index + 1;
            row.insertCell().textContent = player.name;
            row.insertCell().textContent = `${player.tiempoBuzzer} ms`;
            
            if (index === 0) {
                row.style.fontWeight = 'bold';
                row.style.backgroundColor = '#ecf0f1';
            }
        });
    } else {
        const row = scoreboardBody.insertRow();
        row.insertCell().colSpan = 3;
        row.insertCell().textContent = 'Esperando la primera pulsación...';
    }
});
