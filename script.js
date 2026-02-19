let streams = [];
try {
    streams = JSON.parse(localStorage.getItem('multilive_streams')) || [];
} catch (e) {
    console.error("Erro ao carregar streams:", e);
    streams = [];
}

let players = {}; 
let isGlobalMuted = true; 
let currentLayout = localStorage.getItem('multilive_layout') || 'auto';
let pendingStream = null;
let targetStreamUniqueId = null;
let focusedStreamId = null;
let dragSrcEl = null;

if (streams.length > 0 && !focusedStreamId) {
    focusedStreamId = streams[0].uniqueId;
}

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    if (currentLayout === 'focus' && streams.length > 0 && !focusedStreamId) {
        focusedStreamId = streams[0].uniqueId;
    }
    
    updateLayoutStyles();
    updateEmptyState();

    const btnContainer = document.getElementById('globalMuteBtn');
    if(btnContainer) {
         btnContainer.innerHTML = `<i data-lucide="${isGlobalMuted ? 'volume-x' : 'volume-2'}" class="w-5 h-5"></i>`;
         lucide.createIcons();
    }

    document.addEventListener('click', function(event) {
        const dropdown = document.getElementById('audioMixerDropdown');
        const btn = document.getElementById('audioMixerBtn');
        
        if (dropdown && !dropdown.classList.contains('hidden')) {
            if (!dropdown.contains(event.target) && !btn.contains(event.target)) {
                toggleAudioMixer();
            }
        }

        const helpModal = document.getElementById('helpModal');
        if (helpModal && helpModal.classList.contains('flex') && event.target === helpModal) {
            closeHelp();
        }
    });
});

function onYouTubeIframeAPIReady() {
    if (Object.keys(players).length === 0) {
       updateLayoutStyles();
    }
}

function updateEmptyState() {
    const emptyState = document.getElementById('emptyState');
    if (streams.length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
    }
}

function saveStreams() {
    localStorage.setItem('multilive_streams', JSON.stringify(streams));
    updateEmptyState();
}

function setLayout(mode) {
    currentLayout = mode;
    localStorage.setItem('multilive_layout', mode);
    
    if (mode === 'focus' && streams.length > 0 && !focusedStreamId) {
        focusedStreamId = streams[0].uniqueId;
    }

    applyActiveButtonState(mode);
    updateLayoutStyles();
}

function applyActiveButtonState(mode) {
    document.querySelectorAll('.layout-btn').forEach(btn => {
        btn.classList.remove('bg-slate-800', 'text-slate-200');
        btn.classList.add('text-slate-400');
    });
    const activeBtn = document.getElementById(`btn-layout-${mode}`);
    if (activeBtn) {
        activeBtn.classList.add('bg-slate-800', 'text-slate-200');
        activeBtn.classList.remove('text-slate-400');
    }
}

function updateLayoutStyles() {
    const container = document.getElementById('gridContainer');
    let visibleStreams = streams;
    let limit = streams.length;
    
    if (currentLayout !== 'auto' && currentLayout !== 'focus') {
        limit = parseInt(currentLayout);
        if (!isNaN(limit)) {
            visibleStreams = streams.slice(0, limit);
        }
    }

    const currentElements = container.children.length;
    if (currentElements !== visibleStreams.length || (currentElements === 0 && visibleStreams.length > 0)) {
        Object.values(players).forEach(p => { if(p.destroy) p.destroy(); });
        players = {};
        renderDOM(visibleStreams);
    } else {
        const cards = Array.from(container.children);
        cards.forEach(card => {
            const uniqueId = card.dataset.uniqueId;
            const stream = streams.find(s => s.uniqueId === uniqueId);
            if (!stream) return;

            card.className = `stream-card bg-slate-800 rounded-xl overflow-hidden shadow-xl relative group draggable aspect-video border border-slate-700 transition-all duration-300 ${getCardClasses(currentLayout, uniqueId, visibleStreams.length)}`;
            
            if (currentLayout === 'focus') {
                card.style.order = (uniqueId === focusedStreamId) ? -1 : 0;
            } else {
                card.style.order = 0;
            }
        });
    }
    lucide.createIcons();
}

function renderDOM(visibleStreams) {
    const container = document.getElementById('gridContainer');
    container.innerHTML = '';
    const fragment = document.createDocumentFragment();

    visibleStreams.forEach(stream => {
        const card = document.createElement('div');
        card.dataset.uniqueId = stream.uniqueId;
        card.className = `stream-card bg-slate-800 rounded-xl overflow-hidden shadow-xl relative group draggable aspect-video border border-slate-700 transition-all duration-300 ${getCardClasses(currentLayout, stream.uniqueId, visibleStreams.length)}`;
        
        if (currentLayout === 'focus' && stream.uniqueId === focusedStreamId) {
            card.style.order = -1;
        }

        card.setAttribute('draggable', 'true');
        
        let badge = stream.type === 'kick' 
            ? '<span class="kick-badge text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider">KICK</span>'
            : '<span class="yt-badge text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider">YT</span>';

        card.innerHTML = `
            <div class="card-header absolute top-0 left-0 right-0 h-8 z-20 flex justify-between items-center px-2">
                <div class="flex items-center gap-2">
                    <div class="drag-handle cursor-move p-1 text-white/70 hover:text-white bg-slate-900/50 hover:bg-slate-900/80 rounded backdrop-blur-sm transition">
                        <i data-lucide="grip-horizontal" class="w-4 h-4"></i>
                    </div>
                    ${badge}
                    <button onclick="setFocus('${stream.uniqueId}')" class="text-white/70 hover:text-red-500 p-1 bg-slate-900/50 hover:bg-slate-900/80 rounded backdrop-blur-sm transition">
                        <i data-lucide="crosshair" class="w-3 h-3"></i>
                    </button>
                    <button onclick="openChangeStreamModal('${stream.uniqueId}')" class="text-white/70 hover:text-white p-1 bg-slate-900/50 hover:bg-slate-900/80 rounded backdrop-blur-sm transition">
                        <i data-lucide="replace" class="w-3 h-3"></i>
                    </button>
                    <button onclick="toggleMuteSingle('${stream.uniqueId}')" class="text-white/70 hover:text-white p-1 bg-slate-900/50 hover:bg-slate-900/80 rounded backdrop-blur-sm transition">
                        <i data-lucide="${isGlobalMuted ? 'volume-x' : 'volume-2'}" class="w-3 h-3" id="mute-icon-${stream.uniqueId}"></i>
                    </button>
                    <button onclick="reloadStream('${stream.uniqueId}')" class="text-white/70 hover:text-white p-1 bg-slate-900/50 hover:bg-slate-900/80 rounded backdrop-blur-sm transition">
                        <i data-lucide="rotate-cw" class="w-3 h-3"></i>
                    </button>
                </div>
                <button onclick="removeStream('${stream.uniqueId}')" class="text-red-400 hover:text-red-200 p-1 bg-slate-900/50 hover:bg-red-900/80 rounded backdrop-blur-sm transition">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
            <div class="w-full h-full bg-slate-900 stream-container"></div>
        `;
        
        const containerDiv = card.querySelector('.stream-container');
        if (stream.type === 'kick') {
            const iframe = document.createElement('iframe');
            iframe.src = `https://player.kick.com/${stream.id}?autoplay=true&muted=${isGlobalMuted}`; 
            iframe.style.border = "none";
            iframe.setAttribute('allowfullscreen', 'true');
            iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write');
            containerDiv.appendChild(iframe);
        } else {
            const div = document.createElement('div');
            div.id = `player_${stream.uniqueId}`;
            containerDiv.appendChild(div);
        }

        fragment.appendChild(card);
    });

    container.appendChild(fragment);
    setupDragEventsCard();
    
    if (window.YT && window.YT.Player) {
        visibleStreams.forEach(stream => {
            if (stream.type !== 'kick') setTimeout(() => createPlayer(stream), 150);
        });
    }
}

function getCardClasses(layout, uniqueId, count) {
    if (layout === 'focus') {
        return (uniqueId === focusedStreamId) ? 'w-full h-[65vh] order-first' : 'w-[23%] h-[20vh]';
    }
    if (layout === 'auto') {
        if (count <= 1) return 'w-[135vh] max-w-[90vw] h-[70vh] shadow-2xl'; 
        if (count === 2) return 'w-[48%] h-[60vh]'; 
        if (count === 3 || count === 4) return 'w-[38%] aspect-video'; 
        if (count <= 6) return 'w-[30%] aspect-video'; 
        if (count <= 8) return 'w-[23%] aspect-video'; 
        return 'w-[19%] aspect-video'; 
    }
    if (count === 1) return 'w-[135vh] max-w-[90vw] h-[70vh] shadow-2xl';
    if (count === 2) return 'w-[48%] h-[60vh]';
    if (count === 3) return 'w-[32%] aspect-video';
    if (count === 4) return 'w-[45%] aspect-video'; 
    return 'w-full aspect-video';
}

function setFocus(uniqueId) {
    focusedStreamId = uniqueId;
    if (currentLayout !== 'focus') {
        setLayout('focus');
    } else {
        updateLayoutStyles();
    }
}

function handleEnter(e) { if (e.key === 'Enter') addStream(); }

function addStream() {
    const input = document.getElementById('channelInput');
    const rawInput = input.value.trim();
    if (!rawInput) return;
    if (rawInput.includes('@') && !rawInput.includes('kick.com')) {
        alert('O YouTube bloqueia buscar lives apenas pelo @Nome. Use o link do vídeo.');
        return;
    }
    const streamData = getStreamDataFromUrl(rawInput);
    if (!streamData) {
         alert('Link não reconhecido (YouTube ou Kick).'); 
         return; 
    }
    const newStreamObj = { id: streamData.id, type: streamData.type, uniqueId: 'stream_' + Date.now() };
    const isDuplicate = streams.some(s => s.id === streamData.id);
    if (isDuplicate) {
        pendingStream = newStreamObj;
        showConfirmModal();
    } else {
        finalizeAddStream(newStreamObj);
    }
}

function finalizeAddStream(streamObj) {
    streams.push(streamObj);
    if (streams.length === 1) focusedStreamId = streamObj.uniqueId;
    saveStreams();
    document.getElementById('channelInput').value = '';
    Object.values(players).forEach(p => { if(p.destroy) p.destroy(); });
    players = {};
    renderDOM(streams);
    updateLayoutStyles();
}

function getStreamDataFromUrl(rawInput) {
    if (!rawInput) return null;
    let id = null;
    let type = 'video';
    const ytVideoRegex = /(?:v=|\/live\/|\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const ytChannelRegex = /(?:channel\/)(UC[a-zA-Z0-9_-]+)/;
    const kickRegex = /(?:kick\.com\/|player\.kick\.com\/)([a-zA-Z0-9_]+)/;
    const ytVideoMatch = rawInput.match(ytVideoRegex);
    const ytChannelMatch = rawInput.match(ytChannelRegex);
    const kickMatch = rawInput.match(kickRegex);
    if (kickMatch && kickMatch[1]) { id = kickMatch[1]; type = 'kick'; } 
    else if (ytVideoMatch && ytVideoMatch[1]) { id = ytVideoMatch[1]; type = 'video'; } 
    else if (ytChannelMatch && ytChannelMatch[1]) { id = ytChannelMatch[1]; type = 'channel'; } 
    else if (rawInput.startsWith('UC') && rawInput.length > 20) { id = rawInput; type = 'channel'; } 
    else if (rawInput.length === 11) { id = rawInput; type = 'video'; }
    return id ? { id, type } : null;
}

function showConfirmModal() { 
    document.getElementById('confirmModal').classList.remove('hidden'); 
    document.getElementById('confirmModal').classList.add('flex'); 
}
function closeConfirmModal() { 
    document.getElementById('confirmModal').classList.add('hidden'); 
    document.getElementById('confirmModal').classList.remove('flex'); 
}
function confirmAddStream() { if (pendingStream) { finalizeAddStream(pendingStream); pendingStream = null; } closeConfirmModal(); }
function cancelAddStream() { pendingStream = null; document.getElementById('channelInput').value = ''; closeConfirmModal(); }

function removeStream(uniqueId) {
    streams = streams.filter(s => s.uniqueId !== uniqueId);
    if (players[uniqueId]) delete players[uniqueId];
    if (focusedStreamId === uniqueId && streams.length > 0) {
        focusedStreamId = streams[0].uniqueId;
    }
    saveStreams();
    Object.values(players).forEach(p => { if(p.destroy) p.destroy(); });
    players = {};
    renderDOM(streams);
    updateLayoutStyles();
    renderMixerItems();
}

function openChangeStreamModal(uniqueId) {
    targetStreamUniqueId = uniqueId;
    const modal = document.getElementById('changeStreamModal');
    document.getElementById('changeStreamInput').value = '';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.getElementById('changeStreamInput').focus();
}

function closeChangeStreamModal() {
    const modal = document.getElementById('changeStreamModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    targetStreamUniqueId = null;
}

function confirmChangeStream() {
    const input = document.getElementById('changeStreamInput');
    const rawInput = input.value.trim();
    if(!rawInput || !targetStreamUniqueId) return;
    const streamData = getStreamDataFromUrl(rawInput);
    if(!streamData) { alert('Link inválido.'); return; }
    const index = streams.findIndex(s => s.uniqueId === targetStreamUniqueId);
    if (index !== -1) {
        streams[index].id = streamData.id;
        streams[index].type = streamData.type;
        if (players[targetStreamUniqueId]) {
            if (typeof players[targetStreamUniqueId].destroy === 'function') players[targetStreamUniqueId].destroy();
            delete players[targetStreamUniqueId];
        }
        saveStreams();
        reloadStream(targetStreamUniqueId);
        renderDOM(streams);
        updateLayoutStyles();
        closeChangeStreamModal();
    }
}

function reloadStream(uniqueId) {
     const stream = streams.find(s => s.uniqueId === uniqueId);
     if (!stream) return;
     if (players[uniqueId]) { players[uniqueId].destroy(); delete players[uniqueId]; }
     const card = document.querySelector(`[data-unique-id="${uniqueId}"]`);
     if (!card) return;
     const containerDiv = card.querySelector('.stream-container');
     containerDiv.innerHTML = ''; 
     if (stream.type === 'kick') {
        const iframe = document.createElement('iframe');
        iframe.src = `https://player.kick.com/${stream.id}?autoplay=true&muted=${isGlobalMuted}`; 
        iframe.style.border = "none";
        iframe.setAttribute('allowfullscreen', 'true');
        iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write');
        containerDiv.appendChild(iframe);
     } else {
         const div = document.createElement('div');
         div.id = `player_${stream.uniqueId}`;
         containerDiv.appendChild(div);
         createPlayer(stream);
     }
}

function toggleMuteSingle(uniqueId) {
    const stream = streams.find(s => s.uniqueId === uniqueId);
    if (!stream) return;
    if (stream.type === 'kick') {
        const card = document.querySelector(`[data-unique-id="${uniqueId}"]`);
        const iframe = card?.querySelector('iframe');
        if (iframe) {
            const urlObj = new URL(iframe.src);
            const isMuted = urlObj.searchParams.get('muted') === 'true';
            urlObj.searchParams.set('muted', !isMuted);
            iframe.src = urlObj.toString();
            updateMuteIcon(uniqueId, !isMuted);
        }
    } else {
        const player = players[uniqueId];
        if (player && typeof player.isMuted === 'function') {
            if (player.isMuted()) { player.unMute(); updateMuteIcon(uniqueId, false); } 
            else { player.mute(); updateMuteIcon(uniqueId, true); }
        }
    }
}

function updateMuteIcon(uniqueId, isMuted) {
     const icon = document.getElementById(`mute-icon-${uniqueId}`);
     if(icon) {
         icon.setAttribute('data-lucide', isMuted ? 'volume-x' : 'volume-2');
         lucide.createIcons();
     }
}

function createPlayer(stream) {
    if (players[stream.uniqueId]) return;
    players[stream.uniqueId] = new YT.Player(`player_${stream.uniqueId}`, {
        height: '100%', width: '100%', videoId: stream.type === 'video' ? stream.id : '', 
        playerVars: { 'playsinline': 1, 'controls': 1, 'modestbranding': 1, 'rel': 0, 'fs': 1 },
        events: {
            'onReady': (event) => {
                if (stream.type === 'channel') event.target.loadVideoByUrl({ mediaContentUrl: `https://www.youtube.com/v/live_stream?channel=${stream.id}` });
                if (isGlobalMuted) { event.target.mute(); } else { event.target.setVolume(50); }
            }
        }
    });
}

function syncAllStreams() {
    Object.values(players).forEach(player => {
        if (typeof player.seekTo === 'function') {
            const duration = player.getDuration();
            if (duration > 0) { player.seekTo(duration, true); player.playVideo(); }
        }
    });
}

function toggleGlobalMute() {
    isGlobalMuted = !isGlobalMuted;
    const btnContainer = document.getElementById('globalMuteBtn');
    btnContainer.innerHTML = `<i data-lucide="${isGlobalMuted ? 'volume-x' : 'volume-2'}" class="w-5 h-5"></i>`;
    lucide.createIcons();
    Object.values(players).forEach(player => {
        if (player && typeof player.mute === 'function') isGlobalMuted ? player.mute() : player.unMute();
    });
    streams.forEach(stream => {
        if (stream.type === 'kick') {
            const iframe = document.querySelector(`[data-unique-id="${stream.uniqueId}"] iframe`);
            if (iframe) {
                const urlObj = new URL(iframe.src);
                urlObj.searchParams.set('muted', isGlobalMuted);
                iframe.src = urlObj.toString();
            }
        }
        updateMuteIcon(stream.uniqueId, isGlobalMuted);
    });
}

function toggleAudioMixer() {
    const dropdown = document.getElementById('audioMixerDropdown');
    const btn = document.getElementById('audioMixerBtn');
    if (dropdown.classList.contains('hidden')) {
        dropdown.classList.remove('hidden');
        btn.classList.add('bg-slate-800', 'text-white');
        renderMixerItems();
    } else {
        dropdown.classList.add('hidden');
        btn.classList.remove('bg-slate-800', 'text-white');
    }
}

function renderMixerItems() {
    const list = document.getElementById('mixerList');
    list.innerHTML = '';
    let visibleStreams = streams;
    if (currentLayout !== 'auto' && currentLayout !== 'focus') {
        const limit = parseInt(currentLayout);
        if (!isNaN(limit)) visibleStreams = streams.slice(0, limit);
    }
    if (visibleStreams.length === 0) { list.innerHTML = '<p class="text-xs text-slate-500 text-center py-2">Nenhuma live ativa.</p>'; return; }
    visibleStreams.forEach(stream => {
        const item = document.createElement('div');
        item.className = 'flex flex-col gap-1 bg-slate-900/50 p-2 rounded-lg';
        const label = document.createElement('div');
        label.className = 'flex items-center gap-2 mb-1';
        let iconName = stream.type === 'kick' ? 'square' : 'youtube'; 
        let name = stream.id.length > 10 ? stream.id.substring(0,10) + '...' : stream.id;
        label.innerHTML = `<i data-lucide="${iconName}" class="w-3 h-3 ${stream.type === 'kick' ? 'text-green-500' : 'text-red-500'}"></i><span class="text-xs font-semibold text-slate-300 truncate">${name}</span>`;
        item.appendChild(label);
        if (stream.type === 'kick') {
             const info = document.createElement('div');
             info.className = 'text-[10px] text-slate-500 italic pl-5';
             info.innerText = 'Controle no Player';
             item.appendChild(info);
        } else {
            const slider = document.createElement('input');
            slider.type = 'range'; slider.min = '0'; slider.max = '100';
            slider.value = getVolume(stream.uniqueId);
            slider.className = 'volume-slider flex-1';
            slider.oninput = (e) => setStreamVolume(stream.uniqueId, e.target.value);
            item.appendChild(slider);
        }
        list.appendChild(item);
    });
    lucide.createIcons();
}

function getVolume(uniqueId) {
    const player = players[uniqueId];
    return (player && typeof player.getVolume === 'function') ? player.getVolume() : 50;
}

function setStreamVolume(uniqueId, val) {
    const player = players[uniqueId];
    if (player && typeof player.setVolume === 'function') {
        player.setVolume(val);
        if (val > 0 && typeof player.unMute === 'function') player.unMute();
    }
}

function setupDragEventsCard() {
     document.querySelectorAll('.stream-card').forEach(item => {
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragenter', handleDragEnter);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('dragleave', handleDragLeave);
        item.addEventListener('drop', handleDrop);
        item.addEventListener('dragend', handleDragEnd);
     });
}

function handleDragStart(e) { 
    this.style.opacity = '0.4'; 
    dragSrcEl = this; 
    e.dataTransfer.effectAllowed = 'move'; 
    e.dataTransfer.setData('text/html', this.dataset.uniqueId); 
    document.body.classList.add('dragging-active'); 
}
function handleDragOver(e) { if (e.preventDefault) e.preventDefault(); e.dataTransfer.dropEffect = 'move'; return false; }
function handleDragEnter(e) { this.classList.add('drag-over'); }
function handleDragLeave(e) { this.classList.remove('drag-over'); }
function handleDrop(e) {
    if (e.stopPropagation) e.stopPropagation();
    if (dragSrcEl !== this) {
        const sourceId = dragSrcEl.dataset.uniqueId;
        const targetId = this.dataset.uniqueId;
        const sourceIndex = streams.findIndex(s => s.uniqueId === sourceId);
        const targetIndex = streams.findIndex(s => s.uniqueId === targetId);
        if (sourceIndex > -1 && targetIndex > -1) {
            const temp = streams[sourceIndex];
            streams.splice(sourceIndex, 1);
            streams.splice(targetIndex, 0, temp);
            players = {}; 
            saveStreams();
            renderDOM(streams); 
            updateLayoutStyles();
        }
    }
    return false;
}
function handleDragEnd(e) { 
    this.style.opacity = '1'; 
    document.querySelectorAll('.stream-card').forEach(item => item.classList.remove('drag-over')); 
    document.body.classList.remove('dragging-active'); 
}
function showHelp() { document.getElementById('helpModal').classList.remove('hidden'); document.getElementById('helpModal').classList.add('flex'); }
function closeHelp() { document.getElementById('helpModal').classList.add('hidden'); document.getElementById('helpModal').classList.remove('flex'); }