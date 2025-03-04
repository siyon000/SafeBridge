// config/webTorrentConfig.js

// List of reliable WebTorrent trackers
export const TRACKERS = [
    'wss://tracker.openwebtorrent.com',
    'wss://tracker.btorrent.xyz',
    'wss://tracker.fastcast.nz',
    'wss://tracker.webtorrent.dev',
    'wss://tracker.files.fm:7073/announce',
    'wss://spacetradersapi-chatbox.herokuapp.com:443/announce'
];

// Comprehensive list of STUN/TURN servers
export const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    { urls: 'stun:stun.stunprotocol.org:3478' }
];

// Generate different connection configurations for retry attempts
export const getConnectionConfigs = () => {
    return [
        {
            iceServers: ICE_SERVERS.slice(0, 3),
            trackers: TRACKERS.slice(0, 3)
        },
        {
            iceServers: [ICE_SERVERS[3], ICE_SERVERS[4], ICE_SERVERS[6]],
            trackers: TRACKERS.slice(3)
        },
        {
            iceServers: ICE_SERVERS,
            trackers: TRACKERS
        }
    ];
};