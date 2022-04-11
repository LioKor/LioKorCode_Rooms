export default {
    port: 9090,
    jwtToken: 'SUPER_SECRET_TOKEN_HERE!!!',
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
