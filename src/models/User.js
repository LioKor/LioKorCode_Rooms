import {performance} from "perf_hooks";

export default class User {
    constructor(id, ws) {
        this.id = id;
        this.ws = ws;

        this.username = ''

        this.pongAnswerTime = performance.now()
    }

    send(data) {
        this.ws.send(JSON.stringify(data));
    }

    error(message) {
        this.send({
            error: message
        })
    }

    setInfo(id, iceServers) {
        this.send({
            command: 'setInfo',
            id: id,
            iceServers: iceServers
        })
    }

    kick(forceful = true) {
        this.send({
            command: 'leaveRoom',
            kick: forceful
        })
    }

    deleteRoomUser(user) {
        this.send({
            command: 'deleteRoomUser',
            id: user.id,
            username: user.username
        })
    }

    addRoomUser(user) {
        this.send({
            command: 'addRoomUser',
            id: user.id,
            username: user.username
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
