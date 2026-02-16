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

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    applyActiveButtonState(currentLayout);
    renderGrid();
    updateEmptyState();

    const btnContainer = document.getElementById('globalMuteBtn');
    if(btnContainer) {
            btnContainer.innerHTML = `<i data-lucide="${isGlobalMuted ? 'volume-x' : 'volume-2'}" class="w-5 h-5"></i>`;
            lucide.createIcons();
    }

    document.addEventListener('click', function(event) {
        const audioDropdown = document.getElementById('audioMixerDropdown');
        const audioBtn = document.getElementById('audioMixerBtn');
        
        if (audioDropdown && !audioDropdown.classList.contains('hidden')) {
            if (!audioDropdown.contains(event.target) && !audioBtn.contains(event.target)) {
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
    renderGrid();
}

function getCardWidthClass(count) {
    // 1 Live: Responsivo, usa altura para limitar mas largura ajustavel
    // Mobile: w-full
    if (count <= 1) return 'w-full lg:w-[135vh] lg:max-w-[90vw] aspect-video shadow-2xl'; 
    
    // 2 Lives:
    // Mobile/Tablet: w-full (Empilhado)
    // Desktop (lg): w-[48%] (Lado a lado)
    if (count === 2) return 'w-full lg:w-[48%] lg:max-h-[calc(100vh-12rem)] aspect-video'; 
    
    // 3-4 Lives:
    // Mobile: w-full
    // Tablet (md): 2 colunas
    // Desktop (lg): 2 colunas menores para caber verticalmente
    if (count <= 4) return 'w-full md:w-[48%] lg:w-[40%] aspect-video'; 
    
    // 5-6 Lives:
    if (count <= 6) return 'w-full md:w-[48%] lg:w-[30%] aspect-video'; 
    
    // 7-8 Lives:
    if (count <= 8) return 'w-full md:w-[32%] lg:w-[23%] aspect-video'; 
    
    return 'w-full md:w-[32%] lg:w-[19%] aspect-video'; 
}

function setLayout(mode) {
    currentLayout = mode;
    localStorage.setItem('multilive_layout', mode);
    applyActiveButtonState(mode);
    renderGrid();
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

function handleEnter(e) { if (e.key === 'Enter') addStream(); }

function addStream() {
    const input = document.getElementById('channelInput');
    const rawInput = input.value.trim();

    if (!rawInput) return;
    if (rawInput.includes('@') && !rawInput.includes('kick.com')) {
        alert('O YouTube bloqueia buscar lives apenas pelo @Nome. Use o link do vídeo.');
        return;
    }

    let id = null;
    let type = 'video';
    
    const ytVideoRegex = /(?:v=|\/live\/|\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const ytChannelRegex = /(?:channel\/)(UC[a-zA-Z0-9_-]+)/;
    const kickRegex = /(?:kick\.com\/|player\.kick\.com\/)([a-zA-Z0-9_]+)/;

    const ytVideoMatch = rawInput.match(ytVideoRegex);
    const ytChannelMatch = rawInput.match(ytChannelRegex);
    const kickMatch = rawInput.match(kickRegex);

    if (kickMatch && kickMatch[1]) {
        id = kickMatch[1];
        type = 'kick';
    } else if (ytVideoMatch && ytVideoMatch[1]) {
        id = ytVideoMatch[1];
        type = 'video';
    } else if (ytChannelMatch && ytChannelMatch[1]) {
        id = ytChannelMatch[1];
        type = 'channel';
    } else if (rawInput.startsWith('UC') && rawInput.length > 20) {
        id = rawInput;
        type = 'channel';
    } else if (rawInput.length === 11) {
        id = rawInput;
        type = 'video';
    }

    if (!id) { alert('Link não reconhecido (YouTube ou Kick).'); return; }

    const newStreamObj = { id: id, type: type, uniqueId: 'stream_' + Date.now() };

    const isDuplicate = streams.some(s => s.id === id);

    if (isDuplicate) {
        pendingStream = newStreamObj;
        showConfirmModal();
    } else {
        finalizeAddStream(newStreamObj);
    }
}

function finalizeAddStream(streamObj) {
    streams.push(streamObj);
    saveStreams();
    document.getElementById('channelInput').value = '';
    renderGrid();
}

function showConfirmModal() {
    const modal = document.getElementById('confirmModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeConfirmModal() {
    const modal = document.getElementById('confirmModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function confirmAddStream() {
    if (pendingStream) {
        finalizeAddStream(pendingStream);
        pendingStream = null;
    }
    closeConfirmModal();
}

function cancelAddStream() {
    pendingStream = null;
    document.getElementById('channelInput').value = '';
    closeConfirmModal();
}

function removeStream(uniqueId) {
    streams = streams.filter(s => s.uniqueId !== uniqueId);
    if (players[uniqueId]) delete players[uniqueId]; 
    saveStreams();
    renderGrid();
    renderMixerItems(); 
}

function reloadStream(uniqueId) {
        const stream = streams.find(s => s.uniqueId === uniqueId);
        if (!stream) return;

        if (players[uniqueId]) {
            players[uniqueId].destroy();
            delete players[uniqueId];
        }
        
        const card = document.querySelector(`[data-unique-id="${uniqueId}"]`);
        if (!card) return;
        
        const containerDiv = card.querySelector('.stream-container');
        containerDiv.innerHTML = ''; 
        
        if (stream.type === 'kick') {
        const iframe = document.createElement('iframe');
        iframe.src = `https://player.kick.com/${stream.id}?autoplay=true&muted=${isGlobalMuted}`; 
        iframe.height = "100%";
        iframe.width = "100%";
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
        if (!card) return;
        const iframe = card.querySelector('iframe');
        if (iframe) {
            const currentSrc = iframe.src;
            const isMuted = currentSrc.includes('muted=true');
            const newMuted = !isMuted;
            
            const urlObj = new URL(currentSrc);
            urlObj.searchParams.set('muted', newMuted);
            iframe.src = urlObj.toString();
            
            updateMuteIcon(uniqueId, newMuted);
        }
    } else {
        const player = players[uniqueId];
        if (player && typeof player.isMuted === 'function') {
            if (player.isMuted()) {
                player.unMute();
                updateMuteIcon(uniqueId, false);
            } else {
                player.mute();
                updateMuteIcon(uniqueId, true);
            }
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

function saveStreams() {
    localStorage.setItem('multilive_streams', JSON.stringify(streams));
    updateEmptyState();
}

function updateEmptyState() {
    const emptyState = document.getElementById('emptyState');
    if (streams.length === 0) {
        emptyState.classList.remove('hidden');
        emptyState.classList.add('flex');
    } else {
        emptyState.classList.add('hidden');
        emptyState.classList.remove('flex');
    }
}

function renderGrid() {
    Object.values(players).forEach(player => {
        if (player && typeof player.destroy === 'function') {
            player.destroy();
        }
    });
    players = {}; 

    const container = document.getElementById('gridContainer');
    container.innerHTML = ''; 

    let visibleStreams = streams;
    if (currentLayout !== 'auto') {
        const limit = parseInt(currentLayout);
        if (!isNaN(limit)) {
            visibleStreams = streams.slice(0, limit);
        }
    }

    const widthClass = getCardWidthClass(visibleStreams.length);
    const fragment = document.createDocumentFragment();

    visibleStreams.forEach(stream => {
        const card = document.createElement('div');
        card.className = `stream-card bg-slate-800 rounded-xl overflow-hidden shadow-xl relative group draggable aspect-video border border-slate-700 ${widthClass}`;
        card.setAttribute('draggable', 'true');
        card.dataset.uniqueId = stream.uniqueId;
        
        let badge = '';
        if (stream.type === 'kick') {
            badge = '<span class="kick-badge text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider">KICK</span>';
        } else {
            badge = '<span class="yt-badge text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider">YT</span>';
        }

        card.innerHTML = `
            <div class="card-header absolute top-0 left-0 right-0 h-8 z-20 flex justify-between items-center px-2">
                <div class="flex items-center gap-2">
                    <div class="drag-handle cursor-move p-1 text-white/70 hover:text-white bg-slate-900/50 hover:bg-slate-900/80 rounded backdrop-blur-sm transition" title="Arrastar">
                        <i data-lucide="grip-horizontal" class="w-4 h-4"></i>
                    </div>
                    ${badge}
                    <button onclick="toggleMuteSingle('${stream.uniqueId}')" class="text-white/70 hover:text-white p-1 bg-slate-900/50 hover:bg-slate-900/80 rounded backdrop-blur-sm transition" title="Mutar/Desmutar">
                        <i data-lucide="${isGlobalMuted ? 'volume-x' : 'volume-2'}" class="w-3 h-3" id="mute-icon-${stream.uniqueId}"></i>
                    </button>
                    <button onclick="reloadStream('${stream.uniqueId}')" class="text-white/70 hover:text-white p-1 bg-slate-900/50 hover:bg-slate-900/80 rounded backdrop-blur-sm transition" title="Recarregar">
                        <i data-lucide="rotate-cw" class="w-3 h-3"></i>
                    </button>
                </div>
                <button onclick="removeStream('${stream.uniqueId}')" class="text-red-400 hover:text-red-200 p-1 bg-slate-900/50 hover:bg-red-900/80 rounded backdrop-blur-sm transition">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
            <div class="w-full h-full bg-slate-900 stream-container">
            </div>
        `;
        
        const containerDiv = card.querySelector('.stream-container');
        
        if (stream.type === 'kick') {
            const iframe = document.createElement('iframe');
            iframe.src = `https://player.kick.com/${stream.id}?autoplay=true&muted=${isGlobalMuted}`; 
            iframe.height = "100%";
            iframe.width = "100%";
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
    lucide.createIcons();

    if (window.YT && window.YT.Player) {
        visibleStreams.forEach(stream => {
            if (stream.type !== 'kick') {
                setTimeout(() => createPlayer(stream), 150);
            }
        });
    }
}

function createPlayer(stream) {
    if (players[stream.uniqueId]) return;

    const playerVars = {
        'playsinline': 1,
        'controls': 1,
        'modestbranding': 1,
        'rel': 0,
        'fs': 1
    };

    players[stream.uniqueId] = new YT.Player(`player_${stream.uniqueId}`, {
        height: '100%',
        width: '100%',
        videoId: stream.type === 'video' ? stream.id : '',
        playerVars: playerVars,
        events: {
            'onReady': (event) => {
                if (stream.type === 'channel') {
                    event.target.loadVideoByUrl({
                        mediaContentUrl: `https://www.youtube.com/v/live_stream?channel=${stream.id}`
                    });
                }
                if (isGlobalMuted) {
                    event.target.mute();
                } else {
                    event.target.setVolume(50);
                }
            },
            'onError': (e) => console.log('Erro Player:', e.data)
        }
    });
}

function syncAllStreams() {
    Object.values(players).forEach(player => {
        if (typeof player.seekTo === 'function') {
            const duration = player.getDuration();
            if (duration > 0) {
                player.seekTo(duration, true);
                player.playVideo(); 
            }
        }
    });
    const btn = document.querySelector('button[title*="Sincronizar"] svg') || document.querySelector('button[title*="Sincronizar"] i');
    if(btn) {
        btn.classList.add('animate-spin');
        setTimeout(() => btn.classList.remove('animate-spin'), 1000);
    }
}

function toggleGlobalMute() {
    isGlobalMuted = !isGlobalMuted;
    const btnContainer = document.getElementById('globalMuteBtn');
    btnContainer.innerHTML = `<i data-lucide="${isGlobalMuted ? 'volume-x' : 'volume-2'}" class="w-5 h-5"></i>`;
    lucide.createIcons();

    // Muta YouTube
    Object.values(players).forEach(player => {
        if (player && typeof player.mute === 'function') {
            if (isGlobalMuted) {
                player.mute();
            } else {
                player.unMute();
            }
        }
    });

    // Muta Kick (Recarregando)
    streams.forEach(stream => {
        if (stream.type === 'kick') {
            const card = document.querySelector(`[data-unique-id="${stream.uniqueId}"]`);
            if (card) {
                const iframe = card.querySelector('iframe');
                if (iframe) {
                    const urlObj = new URL(iframe.src);
                    const currentMuted = urlObj.searchParams.get('muted') === 'true';
                    // Só recarrega se o estado for diferente
                    if (currentMuted !== isGlobalMuted) {
                        urlObj.searchParams.set('muted', isGlobalMuted);
                        iframe.src = urlObj.toString();
                    }
                }
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
    if (currentLayout !== 'auto') {
        const limit = parseInt(currentLayout);
        if (!isNaN(limit)) {
            visibleStreams = streams.slice(0, limit);
        }
    }

    if (visibleStreams.length === 0) {
        list.innerHTML = '<p class="text-xs text-slate-500 text-center py-2">Nenhuma live ativa.</p>';
        return;
    }

    visibleStreams.forEach(stream => {
        const item = document.createElement('div');
        item.className = 'flex flex-col gap-1 bg-slate-900/50 p-2 rounded-lg';
        
        const label = document.createElement('div');
        label.className = 'flex items-center gap-2 mb-1';
        
        let iconClass = stream.type === 'kick' ? 'text-green-500' : 'text-red-500';
        let iconName = stream.type === 'kick' ? 'square' : 'youtube'; 
        
        let name = stream.id;
        if(name.length > 10) name = name.substring(0,10) + '...';

        label.innerHTML = `
            <i data-lucide="${iconName}" class="w-3 h-3 ${iconClass}"></i>
            <span class="text-xs font-semibold text-slate-300 truncate" title="${stream.id}">${name}</span>
        `;
        item.appendChild(label);

        if (stream.type === 'kick') {
                const info = document.createElement('div');
                info.className = 'text-[10px] text-slate-500 italic pl-5';
                info.innerText = 'Controle no Player';
                item.appendChild(info);
        } else {
            const controls = document.createElement('div');
            controls.className = 'flex items-center gap-2';
            
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = '0';
            slider.max = '100';
            slider.value = getVolume(stream.uniqueId);
            slider.className = 'volume-slider flex-1';
            slider.oninput = (e) => setStreamVolume(stream.uniqueId, e.target.value);
            
            controls.appendChild(slider);
            item.appendChild(controls);
        }

        list.appendChild(item);
    });
    lucide.createIcons();
}

function getVolume(uniqueId) {
    const player = players[uniqueId];
    if (player && typeof player.getVolume === 'function') {
        return player.getVolume();
    }
    return 50;
}

function setStreamVolume(uniqueId, val) {
    const player = players[uniqueId];
    if (player && typeof player.setVolume === 'function') {
        player.setVolume(val);
        if (val > 0 && typeof player.unMute === 'function') player.unMute();
    }
}

let dragSrcEl = null;

function setupDragEventsCard() {
        const items = document.querySelectorAll('.stream-card');
        items.forEach(item => {
        item.addEventListener('dragstart', handleDragStart, false);
        item.addEventListener('dragenter', handleDragEnter, false);
        item.addEventListener('dragover', handleDragOver, false);
        item.addEventListener('dragleave', handleDragLeave, false);
        item.addEventListener('drop', handleDrop, false);
        item.addEventListener('dragend', handleDragEnd, false);
        });
}

function handleDragStart(e) {
    this.style.opacity = '0.4';
    dragSrcEl = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.dataset.uniqueId);
    document.body.classList.add('dragging-active');
}

function handleDragOver(e) { 
    if (e.preventDefault) e.preventDefault(); 
    e.dataTransfer.dropEffect = 'move'; 
    return false; 
}

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
            renderGrid(); 
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