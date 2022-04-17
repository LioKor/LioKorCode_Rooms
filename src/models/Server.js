import {createServer} from "http"
import {WebSocketServer} from "ws"
import {randomString} from "../utils.js"

import config from './../config.js'
import Room from './Room.js'
import User from './User.js'


export default class Server {
    constructor(port) {
        const server = createServer()
        this.wsServer = new WebSocketServer({ server });
        this.rooms = {}

        this.uid = 0;
        this.users = {}

        this.init()

        server.listen(port);
    }

    getJoinedRoom(user) {
        for (const roomId in this.rooms) {
            const room = this.rooms[roomId];
            if (room.users.some(u => u.id === user.id)) {
                return room;
            }
        }
        return null
    }

    setRooms(user = null) {
        const roomsArr = [];
        for (const roomId in this.rooms) {
            const room = this.rooms[roomId];
            roomsArr.push({
                id: room.id,
                name: room.name,
                usersMax: room.maxUsers,
                usersAmount: room.users.length
            });
        }

        const data = {
            command: 'setRooms',
            rooms: roomsArr
        }

        if (user) {
            user.send(data);
        } else {
            for (const uid in this.users) {
                const user = this.users[uid];
                user.send(data);
            }
        }
    }

    createRoom(owner, name, maxUsers) {
        const joinedRoom = this.getJoinedRoom(owner);
        if (joinedRoom) {
            if (joinedRoom.owner === owner) {
                owner.error('You already have a room!')
                return;
            }
        }

        const id = randomString();
        const room = new Room(id, name, maxUsers, owner);
        this.rooms[id] = room
        this.setRooms()
        owner.setRoom(room)
    }

    deleteRoom(room) {
        console.log(`Deleting room ${room.name}, because owner disconnected`);
        room.kickAll();
        delete this.rooms[room.id]
        this.setRooms()
    }

    init() {
        this.wsServer.on('listening', () => {
            const addr = this.wsServer.address();
            console.log(`WS server is listening at ${addr.address}:${addr.port}`);
        });

        this.wsServer.on('connection', (ws) => {
            const currentUser = new User(this.uid++, ws);

            ws.on('message', (message) => {
                const data = JSON.parse(message);

                if (data.to) {
                    const user = this.users[data.to]
                    if (user) {
                        data.from = currentUser.id
                        user.send(data)
                    }
                    return
                }

                if (data.command === 'setInfo') {
                    currentUser.username = data.username;
                    this.users[currentUser.id] = currentUser;
                    console.log(`${currentUser.username} connected!`);
                    currentUser.setInfo(config.iceServers)
                } else if (data.command === 'createRoom') {
                    this.createRoom(currentUser, data.name, data.maxUsers);
                } else if (data.command === 'getRooms') {
                    this.setRooms(currentUser);
                } else if (data.command === 'leaveRoom') {
                    const room = this.getJoinedRoom(currentUser);
                    if (!room) {
                        currentUser.error('This room does not exist')
                        return
                    }

                    if (room.owner === currentUser) {
                        this.deleteRoom(room);
                    } else {
                        room.kick(currentUser);
                    }
                } else if (data.command === 'joinRoom') {
                    const room = this.rooms[data.id]
                    if (!room) {
                        currentUser.error('Room does not exist!')
                    }

                    room.addUser(currentUser);
                } else if (data.command === 'sendMessage') {
                    const room = this.getJoinedRoom(currentUser);
                    if (!room) {
                        currentUser.error('Join the room first!')
                        return;
                    }

                    room.sendMessage(currentUser, data.content)
                }
            });

            ws.on('close', () => {
                if (!currentUser.username) {
                    return;
                }

                const room = this.getJoinedRoom(currentUser);
                if (room) {
                    if (room.owner === currentUser) {
                        this.deleteRoom(room);
                    }
                }
                delete this.users[currentUser.id]
                console.log(`${currentUser.username} disconnected!`);
            });
        });
    }
}
