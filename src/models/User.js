export default class User {
    constructor(id, ws) {
        this.id = id;
        this.ws = ws;

        this.username = ''
    }

    send(data) {
        this.ws.send(JSON.stringify(data));
    }

    error(message) {
        this.send({
            error: message
        })
    }

    kick(forceful = true) {
        this.send({
            command: 'leaveRoom',
            kick: forceful
        })
    }

    setRoom(room) {
        const users = []
        for (const user of room.users) {
            users.push({
                'id': user.id,
                'username': user.username
            })
        }

        const data = {
            command: 'setRoom',

            id: room.id,
            name: room.name,
            maxUsers: room.maxUsers,
            users: users
        }
        this.send(data)
    }
}
