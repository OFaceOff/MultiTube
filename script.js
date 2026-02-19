let streams = [];
try {
    streams = JSON.parse(localStorage.getItem('multilive_streams')) || [];
} catch (e) {
    streams = [];
}

let players = {}; 
let isGlobalMuted = true; 
let currentLayout = localStorage.getItem('multilive_layout') || 'auto';
let pendingStream = null;
let targetStreamUniqueId = null;
let focusedStreamId = null;
let idleTimer;
const headerEl = document.getElementById('main-header');

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    if (streams.length > 0 && !focusedStreamId) {
        focusedStreamId = streams[0].uniqueId;
    }
    updateLayoutStyles(); 
    updateEmptyState();
    resetIdleTimer();

    // Eventos de mouse/teclado para esconder header
    document.addEventListener('mousemove', resetIdleTimer);
    document.addEventListener('mousedown', resetIdleTimer);
    document.addEventListener('keypress', resetIdleTimer);
});

function onYouTubeIframeAPIReady() {
    updateLayoutStyles();
}

function resetIdleTimer() {
    if (headerEl.classList.contains('-translate-y-full')) {
        headerEl.classList.remove('-translate-y-full', 'opacity-0');
    }
    clearTimeout(idleTimer);
    if (streams.length > 0) {
        idleTimer = setTimeout(() => {
            headerEl.classList.add('-translate-y-full', 'opacity-0');
        }, 3500); 
    }
}

// Lógica de Layout
function setLayout(mode) {
    currentLayout = mode;
    localStorage.setItem('multilive_layout', mode);
    if (mode === 'focus' && streams.length > 0 && !focusedStreamId) {
        focusedStreamId = streams[0].uniqueId;
    }
    updateLayoutStyles();
}

function updateLayoutStyles() {
    const container = document.getElementById('gridContainer');
    const visibleStreams = getVisibleStreams();
    renderDOM(visibleStreams);
    updateEmptyState();
}

function getVisibleStreams() {
    if (currentLayout === 'focus') return streams.slice(0, 5);
    if (currentLayout !== 'auto') {
        const limit = parseInt(currentLayout);
        return streams.slice(0, limit);
    }
    return streams;
}

// Renderização
function renderDOM(visibleStreams) {
    const container = document.getElementById('gridContainer');
    container.innerHTML = '';
    
    visibleStreams.forEach((stream, index) => {
        const card = document.createElement('div');
        card.dataset.uniqueId = stream.uniqueId;
        card.className = `stream-card bg-slate-800 rounded-xl overflow-hidden shadow-xl relative group transition-all duration-300 w-full md:w-[calc(50%-1rem)] aspect-video`;
        
        card.innerHTML = `
            <div class="card-header absolute top-0 left-0 right-0 h-10 z-20 flex justify-between items-center px-2">
                <div class="flex items-center gap-2">
                    <button onclick="removeStream('${stream.uniqueId}')" class="text-red-400 bg-slate-900/50 p-1 rounded">
                        <i data-lucide="x" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
            <div class="w-full h-full bg-black stream-container"></div>
        `;
        
        const containerDiv = card.querySelector('.stream-container');
        if (stream.type === 'kick') {
            containerDiv.innerHTML = `<iframe src="https://player.kick.com/${stream.id}?muted=${isGlobalMuted}" frameborder="0"></iframe>`;
        } else {
            const playerDiv = document.createElement('div');
            playerDiv.id = `player_${stream.uniqueId}`;
            containerDiv.appendChild(playerDiv);
            setTimeout(() => createYTPlayer(stream), 100);
        }
        container.appendChild(card);
    });
    lucide.createIcons();
}

function createYTPlayer(stream) {
    players[stream.uniqueId] = new YT.Player(`player_${stream.uniqueId}`, {
        videoId: stream.id,
        playerVars: { 'autoplay': 1, 'mute': isGlobalMuted ? 1 : 0 },
        height: '100%',
        width: '100%'
    });
}

// Funções de Interface
function addStream() {
    const input = document.getElementById('channelInput');
    const url = input.value.trim();
    if (!url) return;

    let id = url.includes('v=') ? url.split('v=')[1].split('&')[0] : url.split('/').pop();
    let type = url.includes('kick.com') ? 'kick' : 'video';

    const newStream = { id, type, uniqueId: 's_' + Date.now() };
    streams.push(newStream);
    saveStreams();
    input.value = '';
    updateLayoutStyles();
}

function removeStream(uid) {
    streams = streams.filter(s => s.uniqueId !== uid);
    saveStreams();
    updateLayoutStyles();
}

function saveStreams() {
    localStorage.setItem('multilive_streams', JSON.stringify(streams));
}

function updateEmptyState() {
    const empty = document.getElementById('emptyState');
    streams.length === 0 ? empty.classList.remove('hidden') : empty.classList.add('hidden');
}

function handleEnter(e) { if (e.key === 'Enter') addStream(); }