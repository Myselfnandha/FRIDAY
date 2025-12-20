import { Room, RoomEvent, VideoPresets, LocalParticipant } from 'livekit-client';
import { createIcons, icons } from 'lucide';

// Init Icons
createIcons({ icons });

const DEFAULT_BACKEND_URL = "https://nandhaalagesan248-friday.hf.space";

class FridaySystem {
    constructor() {
        this.room = null;
        this.token = null;
        this.url = null;
        this.isConnected = false;

        // DOM Elements
        this.ui = {
            chat: document.getElementById('chat-container'),
            input: document.getElementById('command-input'),
            sendBtn: document.getElementById('send-btn'),
            micBtn: document.getElementById('mic-btn'),
            camBtn: document.getElementById('cam-btn'),
            screenBtn: document.getElementById('screen-btn'),
            modulesBtn: document.getElementById('modules-btn'),
            disconnectBtn: document.getElementById('disconnect-btn'),
            systemStatus: document.getElementById('system-status-text'),
            reactor: document.querySelector('.reactor-wrapper'),
            moduleOverlay: document.getElementById('modules-overlay'),
            closeModulesBtn: document.getElementById('close-modules'),
            modulesContent: document.getElementById('modules-content'),
            tabs: document.querySelectorAll('.tab-btn')
        };

        // State
        this.micOn = true;
        this.camOn = false;
        this.screenOn = false;

        this.init();
    }

    async init() {
        this.logSystem("Initializing protocols...");
        this.bindEvents();

        // Auto Connect
        await this.connect();
    }

    bindEvents() {
        // Input Handling
        this.ui.sendBtn.addEventListener('click', () => this.sendMessage());
        this.ui.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        // Control Buttons
        this.ui.micBtn.addEventListener('click', () => this.toggleMic());
        this.ui.camBtn.addEventListener('click', () => this.toggleCam());
        this.ui.screenBtn.addEventListener('click', () => this.toggleScreen());
        this.ui.disconnectBtn.addEventListener('click', () => this.disconnect());

        // Modules
        this.ui.modulesBtn.addEventListener('click', () => this.toggleModules(true));
        this.ui.closeModulesBtn.addEventListener('click', () => this.toggleModules(false));

        // Tabs
        this.ui.tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelector('.tab-btn.active').classList.remove('active');
                e.target.classList.add('active');
                this.renderModules(e.target.dataset.tab);
            });
        });
    }

    async connect() {
        try {
            this.logSystem("Connecting to server...");

            const response = await fetch(`${DEFAULT_BACKEND_URL}/api/token`);
            if (!response.ok) throw new Error("Token fetch failed");

            const data = await response.json();
            this.token = data.token;
            this.url = data.url;

            this.room = new Room({
                adaptiveStream: true,
                dynacast: true,
            });

            this.setupRoomEvents();

            await this.room.connect(this.url, this.token);
            this.isConnected = true;
            this.logSystem("Uplink Established.");
            this.ui.systemStatus.innerText = "SYSTEM ONLINE";

            // Init Media
            await this.room.localParticipant.setMicrophoneEnabled(true);
            await this.room.localParticipant.setCameraEnabled(false);

        } catch (e) {
            console.error(e);
            this.logSystem("Connection Failed: " + e.message);
            this.ui.systemStatus.innerText = "OFFLINE";
        }
    }

    setupRoomEvents() {
        this.room
            .on(RoomEvent.CurrentSpeakersChanged, (speakers) => {
                // Visualizer Logic
                if (speakers.length > 0) {
                    // Check if it's the AI (usually identity is not me)
                    const isAI = speakers.some(s => !s.isLocal);
                    if (isAI) {
                        this.ui.reactor.classList.add('talking');
                        this.ui.systemStatus.innerText = "PROCESSING VOICE DATA...";
                    } else {
                        this.ui.reactor.classList.remove('talking');
                    }
                } else {
                    this.ui.reactor.classList.remove('talking');
                    this.ui.systemStatus.innerText = "IDLE";
                }
            })
            .on(RoomEvent.DataReceived, (payload, participant, kind, topic) => {
                const str = new TextDecoder().decode(payload);
                try {
                    const msg = JSON.parse(str);
                    if (msg.message) {
                        this.addChatMessage(msg.message, 'assistant');
                    }
                } catch (e) {
                    console.log("Raw message:", str);
                }
            })
            .on(RoomEvent.Disconnected, () => {
                this.logSystem("Disconnected from server.");
                this.isConnected = false;
                this.ui.systemStatus.innerText = "DISCONNECTED";
            });
    }

    async sendMessage() {
        const text = this.ui.input.value.trim();
        if (!text) return;

        if (!this.isConnected) {
            this.showToast("System Offline");
            return;
        }

        // Add to UI
        this.addChatMessage(text, 'user');
        this.ui.input.value = '';

        // Send to LiveKit
        try {
            const payload = JSON.stringify({ message: text });
            const encoded = new TextEncoder().encode(payload);
            await this.room.localParticipant.publishData(encoded, { reliable: true });
        } catch (e) {
            this.showToast("Transmission Error");
        }
    }

    addChatMessage(text, type) {
        const div = document.createElement('div');
        div.className = `message ${type}`;
        div.innerText = text;
        this.ui.chat.appendChild(div);
        this.ui.chat.scrollTop = this.ui.chat.scrollHeight;
    }

    logSystem(text) {
        const div = document.createElement('div');
        div.className = 'message system';
        div.innerText = `[SYS]: ${text}`;
        this.ui.chat.appendChild(div);
    }

    showToast(text) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerText = text;
        document.getElementById('toast-container').appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    async toggleMic() {
        if (!this.room) return;
        this.micOn = !this.micOn;
        await this.room.localParticipant.setMicrophoneEnabled(this.micOn);
        this.ui.micBtn.classList.toggle('active', this.micOn);

        // Update icon
        const iconName = this.micOn ? 'mic' : 'mic-off';
        this.ui.micBtn.innerHTML = `<i data-lucide="${iconName}"></i>`;
        createIcons({ icons, nameAttr: 'data-lucide', attrs: { class: "lucide" } });
    }

    async toggleCam() {
        if (!this.room) return;
        this.camOn = !this.camOn;
        await this.room.localParticipant.setCameraEnabled(this.camOn);
        this.ui.camBtn.classList.toggle('active', this.camOn);

        const iconName = this.camOn ? 'video' : 'video-off';
        this.ui.camBtn.innerHTML = `<i data-lucide="${iconName}"></i>`;
        createIcons({ icons, nameAttr: 'data-lucide', attrs: { class: "lucide" } });
    }

    async toggleScreen() {
        if (!this.room) return;
        this.screenOn = !this.screenOn;
        await this.room.localParticipant.setScreenShareEnabled(this.screenOn);
        this.ui.screenBtn.classList.toggle('active', this.screenOn);
    }

    disconnect() {
        if (this.room) this.room.disconnect();
    }

    toggleModules(show) {
        if (show) {
            this.ui.moduleOverlay.classList.remove('hidden');
            this.renderModules('windows'); // Default
        } else {
            this.ui.moduleOverlay.classList.add('hidden');
        }
    }

    renderModules(type) {
        const modules = {
            windows: [
                { label: 'Open Notepad', cmd: 'Open Notepad on Windows' },
                { label: 'Open Calculator', cmd: 'Open Calculator on Windows' },
                { label: 'Open Chrome', cmd: 'Open Chrome on Windows' },
                { label: 'Close Notepad', cmd: 'Close Notepad on Windows' },
            ],
            android: [
                { label: 'Open WhatsApp', cmd: 'Open package com.whatsapp on Android' },
                { label: 'Open YouTube', cmd: 'Open package com.google.android.youtube on Android' },
                { label: 'Google Assistant', cmd: 'Ask Android Assistant to listen' },
                { label: 'Kill WhatsApp', cmd: 'Close package com.whatsapp on Android' },
            ],
            memory: [
                { label: 'Save Context', cmd: 'Save current context to memory' },
                { label: 'Recall Deployment', cmd: 'Recall memory about deployment issues' },
                { label: 'Recall User Prefs', cmd: 'Recall user preferences' },
            ]
        };

        const container = this.ui.modulesContent;
        container.innerHTML = '';

        if (modules[type]) {
            modules[type].forEach(mod => {
                const btn = document.createElement('button');
                btn.className = 'module-action-btn';
                btn.innerText = mod.label;
                btn.onclick = () => {
                    this.sendMessageCommand(`Execute system command: ${mod.cmd}`);
                    this.showToast(`Sent: ${mod.label}`);
                };
                container.appendChild(btn);
            });
        }
    }

    sendMessageCommand(text) {
        if (!this.isConnected) return;
        const payload = JSON.stringify({ message: text });
        const encoded = new TextEncoder().encode(payload);
        this.room.localParticipant.publishData(encoded, { reliable: true });
    }
}

// Start
window.friday = new FridaySystem();
