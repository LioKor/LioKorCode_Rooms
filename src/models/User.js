import {performance} from "perf_hooks";

export default class User {
    constructor(id, ws) {
        this.id = id;
        this.ws = ws;

        this.uid = null
        this.username = null
        this.fullname = null
        this.avatarUrl = null

        this.pongAnswerTime = performance.now()
    }

    send(data) {
        this.ws.send(JSON.stringify(data));
    }

    error(message) {
        this.send({
            command: 'error',
            message: message
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
            ...user.toObject()
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

            room: room.toObject()
        }
        this.send(data)
    }

    toObject() {
        return {
            id: this.id,
            username: this.username,
            fullname: this.fullname,
            avatarUrl: this.avatarUrl
        }
    }
}
