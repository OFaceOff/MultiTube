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

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    
    if (streams.length > 0 && !focusedStreamId) {
        focusedStreamId = streams[0].uniqueId;
    }
    
    updateLayoutStyles(); 
    if(typeof updateEmptyState === 'function') updateEmptyState();

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
    if (Object.keys(players).length === 0) {
       updateLayoutStyles();
    }
}

function getCardWidthClass(layout, uniqueId, count) {
    let base = "aspect-video shadow-2xl relative flex-shrink-0 flex items-center justify-center";
    
    if (layout === 'focus') {
        if (count === 1) return `w-full max-w-[calc((100vh-130px)*16/9)] max-h-[calc(100vh-130px)] ${base}`; 
        
        if (uniqueId === focusedStreamId) {
            return `w-full max-w-[calc((65vh-100px)*16/9)] max-h-[65vh] ${base}`;
        } else {
            return `w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)] max-w-[calc((30vh-40px)*16/9)] max-h-[30vh] ${base}`;
        }
    }

    if (layout === 'auto' && count >= 5) {
        if (count <= 6) return `w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.66rem)] ${base}`;
        if (count <= 8) return `w-full sm:w-[calc(50%-0.5rem)] md:w-[calc(33.333%-0.66rem)] lg:w-[calc(25%-0.75rem)] ${base}`;
        return `w-full sm:w-[calc(50%-0.5rem)] md:w-[calc(33.333%-0.66rem)] lg:w-[calc(20%-0.8rem)] ${base}`;
    }

    if (count === 1) return `w-full max-w-[calc((100vh-130px)*16/9)] max-h-[calc(100vh-130px)] ${base}`;
    if (count === 2) return `w-full md:w-[calc(50%-0.5rem)] max-w-[calc((100vh-130px)*16/9)] max-h-[calc(100vh-130px)] ${base}`;
    if (count === 3 || count === 4) return `w-full sm:w-[calc(50%-0.5rem)] max-w-[calc((50vh-80px)*16/9)] max-h-[calc(50vh-80px)] ${base}`; 
    
    return `w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.66rem)] ${base}`;
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

function setFocus(uniqueId) {
    focusedStreamId = uniqueId;
    if (currentLayout !== 'focus') {
        setLayout('focus');
    } else {
        updateLayoutStyles(); 
    }
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

function getVisibleStreams() {
    if (currentLayout === 'focus') {
        const focused = streams.find(s => s.uniqueId === focusedStreamId);
        const others = streams.filter(s => s.uniqueId !== focusedStreamId);
        return focused ? [focused, ...others].slice(0, 5) : streams.slice(0, 5);
    }
    if (currentLayout !== 'auto') {
        const limit = parseInt(currentLayout);
        if (!isNaN(limit)) return streams.slice(0, limit);
    }
    return streams;
}

function updateLayoutStyles() {
    const container = document.getElementById('gridContainer');
    const visibleStreams = getVisibleStreams();

    const currentCards = Array.from(container.querySelectorAll('.stream-card'));
    const currentIds = currentCards.map(c => c.dataset.uniqueId).sort().join(',');
    const visibleIds = visibleStreams.map(s => s.uniqueId).sort().join(',');

    if (currentIds !== visibleIds) {
        renderDOM(visibleStreams);
    } else {
        currentCards.forEach((card, index) => {
            const uniqueId = card.dataset.uniqueId;
            card.className = `stream-card bg-slate-800 rounded-xl overflow-hidden shadow-xl relative group draggable transition-all duration-300 ${getCardWidthClass(currentLayout, uniqueId, visibleStreams.length)}`;
            
            if (currentLayout === 'focus') {
                card.style.order = uniqueId === focusedStreamId ? -2 : index;
            } else {
                card.style.order = index;
            }
        });

        let breakEl = container.querySelector('.break-element');
        if (currentLayout === 'focus') {
            if (!breakEl) {
                breakEl = document.createElement('div');
                breakEl.className = 'w-full h-0 basis-full flex-shrink-0 break-element m-0 p-0 transition-none';
                container.appendChild(breakEl);
            }
            breakEl.style.order = -1;
        } else {
            if (breakEl) breakEl.remove();
        }

        lucide.createIcons();
    }
    if(typeof updateEmptyState === 'function') updateEmptyState();
}

function updateEmptyState() {
    const emptyState = document.getElementById('emptyState');
    if (streams.length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
    }
}

function renderDOM(visibleStreams) {
    const container = document.getElementById('gridContainer');
    
    Object.values(players).forEach(p => { if(p.destroy) p.destroy(); });
    players = {};
    container.innerHTML = '';
    
    const fragment = document.createDocumentFragment();

    visibleStreams.forEach((stream, index) => {
        const card = document.createElement('div');
        card.dataset.uniqueId = stream.uniqueId;
        
        card.className = `stream-card bg-slate-800 rounded-xl overflow-hidden shadow-xl relative group draggable transition-all duration-300 ${getCardWidthClass(currentLayout, stream.uniqueId, visibleStreams.length)}`;
        
        if (currentLayout === 'focus') {
            card.style.order = stream.uniqueId === focusedStreamId ? -2 : index;
        } else {
            card.style.order = index;
        }

        card.setAttribute('draggable', 'true');
        
        let badge = stream.type === 'kick' 
            ? '<span class="kick-badge text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider">KICK</span>'
            : '<span class="yt-badge text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider">YT</span>';

        const focusBtn = `
            <button onclick="setFocus('${stream.uniqueId}')" class="text-white/70 hover:text-red-500 p-1 bg-slate-900/50 hover:bg-slate-900/80 rounded backdrop-blur-sm transition" title="Destacar Live">
                <i data-lucide="crosshair" class="w-3 h-3"></i>
            </button>
        `;

        card.innerHTML = `
            <div class="card-header absolute top-0 left-0 right-0 h-8 z-20 flex justify-between items-center px-2">
                <div class="flex items-center gap-2">
                    <div class="drag-handle cursor-move p-1 text-white/70 hover:text-white bg-slate-900/50 hover:bg-slate-900/80 rounded backdrop-blur-sm transition" title="Arrastar">
                        <i data-lucide="grip-horizontal" class="w-4 h-4"></i>
                    </div>
                    <span class="badge-container">${badge}</span>
                    ${focusBtn}
                    <button onclick="openChangeStreamModal('${stream.uniqueId}')" class="text-white/70 hover:text-white p-1 bg-slate-900/50 hover:bg-slate-900/80 rounded backdrop-blur-sm transition" title="Trocar Live">
                        <i data-lucide="replace" class="w-3 h-3"></i>
                    </button>
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
            <div class="w-full h-full bg-black stream-container absolute inset-0"></div>
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
            div.className = "w-full h-full";
            containerDiv.appendChild(div);
        }

        fragment.appendChild(card);
    });

    if (currentLayout === 'focus') {
        const breakEl = document.createElement('div');
        breakEl.className = 'w-full h-0 basis-full flex-shrink-0 break-element m-0 p-0 transition-none';
        breakEl.style.order = -1;
        fragment.appendChild(breakEl);
    }

    container.appendChild(fragment);
    setupDragEventsCard();
    lucide.createIcons();

    if (window.YT && window.YT.Player) {
        visibleStreams.forEach(stream => {
            if (stream.type !== 'kick') setTimeout(() => createPlayer(stream), 150);
        });
    }
}

function handleEnter(e) { if (e.key === 'Enter') addStream(); }

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
    if (!id) return null;
    return { id, type };
}

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
    updateLayoutStyles(); 
}

function showConfirmModal() { document.getElementById('confirmModal').classList.remove('hidden'); document.getElementById('confirmModal').classList.add('flex'); }
function closeConfirmModal() { document.getElementById('confirmModal').classList.add('hidden'); document.getElementById('confirmModal').classList.remove('flex'); }
function confirmAddStream() { if (pendingStream) { finalizeAddStream(pendingStream); pendingStream = null; } closeConfirmModal(); }
function cancelAddStream() { pendingStream = null; document.getElementById('channelInput').value = ''; closeConfirmModal(); }

function removeStream(uniqueId) {
    streams = streams.filter(s => s.uniqueId !== uniqueId);
    if (players[uniqueId]) delete players[uniqueId];
    if (focusedStreamId === uniqueId && streams.length > 0) {
        focusedStreamId = streams[0].uniqueId;
    }
    saveStreams();
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

function updateBadge(uniqueId, type) {
    const card = document.querySelector(`[data-unique-id="${uniqueId}"]`);
    if (card) {
        const badgeContainer = card.querySelector('.badge-container');
        if (badgeContainer) {
            if (type === 'kick') {
                badgeContainer.innerHTML = '<span class="kick-badge text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider">KICK</span>';
            } else {
                badgeContainer.innerHTML = '<span class="yt-badge text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider">YT</span>';
            }
        }
    }
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
        saveStreams();
        
        reloadStream(targetStreamUniqueId);
        updateBadge(targetStreamUniqueId, streamData.type);
        
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
        iframe.height = "100%"; iframe.width = "100%"; iframe.style.border = "none";
        iframe.setAttribute('allowfullscreen', 'true');
        iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write');
        containerDiv.appendChild(iframe);
     } else {
         const div = document.createElement('div');
         div.id = `player_${stream.uniqueId}`;
         div.className = "w-full h-full";
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

function saveStreams() {
    localStorage.setItem('multilive_streams', JSON.stringify(streams));
}

function createPlayer(stream) {
    if (players[stream.uniqueId]) return;
    const playerVars = { 'playsinline': 1, 'controls': 1, 'modestbranding': 1, 'rel': 0, 'fs': 1 };
    players[stream.uniqueId] = new YT.Player(`player_${stream.uniqueId}`, {
        height: '100%', width: '100%', videoId: stream.type === 'video' ? stream.id : '', playerVars: playerVars,
        events: {
            'onReady': (event) => {
                if (stream.type === 'channel') { event.target.loadVideoByUrl({ mediaContentUrl: `https://www.youtube.com/v/live_stream?channel=${stream.id}` }); }
                if (isGlobalMuted) { event.target.mute(); } else { event.target.setVolume(50); }
            },
            'onError': (e) => console.log('Erro Player:', e.data)
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
    const btn = document.querySelector('button[title*="Sincronizar"] svg') || document.querySelector('button[title*="Sincronizar"] i');
    if(btn) { btn.classList.add('animate-spin'); setTimeout(() => btn.classList.remove('animate-spin'), 1000); }
}

function toggleGlobalMute() {
    isGlobalMuted = !isGlobalMuted;
    const btnContainer = document.getElementById('globalMuteBtn');
    btnContainer.innerHTML = `<i data-lucide="${isGlobalMuted ? 'volume-x' : 'volume-2'}" class="w-5 h-5"></i>`;
    lucide.createIcons();
    
    Object.values(players).forEach(player => {
        if (player && typeof player.mute === 'function') { if (isGlobalMuted) { player.mute(); } else { player.unMute(); } }
    });
    
    streams.forEach(stream => {
        if (stream.type === 'kick') {
            const card = document.querySelector(`[data-unique-id="${stream.uniqueId}"]`);
            if (card) {
                const iframe = card.querySelector('iframe');
                if (iframe) {
                    const urlObj = new URL(iframe.src);
                    const currentMuted = urlObj.searchParams.get('muted') === 'true';
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
    let visibleStreams = getVisibleStreams();
    
    if (visibleStreams.length === 0) { list.innerHTML = '<p class="text-xs text-slate-500 text-center py-2">Nenhuma live ativa.</p>'; return; }
    
    visibleStreams.forEach(stream => {
        const item = document.createElement('div');
        item.className = 'flex flex-col gap-1 bg-slate-900/50 p-2 rounded-lg';
        const label = document.createElement('div');
        label.className = 'flex items-center gap-2 mb-1';
        
        let iconClass = stream.type === 'kick' ? 'text-green-500' : 'text-red-500';
        let iconName = stream.type === 'kick' ? 'square' : 'youtube'; 
        let name = stream.id;
        
        if(name.length > 10) name = name.substring(0,10) + '...';
        
        label.innerHTML = `<i data-lucide="${iconName}" class="w-3 h-3 ${iconClass}"></i><span class="text-xs font-semibold text-slate-300 truncate" title="${stream.id}">${name}</span>`;
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
            slider.type = 'range'; slider.min = '0'; slider.max = '100';
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
    if (player && typeof player.getVolume === 'function') return player.getVolume();
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

function handleDragStart(e) { this.style.opacity = '0.4'; dragSrcEl = this; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/html', this.dataset.uniqueId); document.body.classList.add('dragging-active'); }
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
            saveStreams();
            updateLayoutStyles(); 
        }
    }
    return false;
}
function handleDragEnd(e) { this.style.opacity = '1'; document.querySelectorAll('.stream-card').forEach(item => item.classList.remove('drag-over')); document.body.classList.remove('dragging-active'); }
function showHelp() { document.getElementById('helpModal').classList.remove('hidden'); document.getElementById('helpModal').classList.add('flex'); }
function closeHelp() { document.getElementById('helpModal').classList.add('hidden'); document.getElementById('helpModal').classList.remove('flex'); }