export default {
    port: 9090,
    jwtKey: 'SUPER_SECRET_KEY_HERE!!!',
    iceServers: [
        {
            urls: "stun:url",
            username: '',
            credential: ''
        },
        {
            urls: 'turn:url',
            username: 'wowl',
            credential: 'qwerty123'
        }
    ]
}
