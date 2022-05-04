import {createServer} from "http"
import { performance } from 'perf_hooks'
import {WebSocketServer} from "ws"
import {randomString} from "../utils.js"

import config from './../config.js'
import Room from './Room.js'
import User from './User.js'


export default class Server {
    constructor(port, pingIntervalTime = 10000) {
        const server = createServer()
        this.wsServer = new WebSocketServer({ server });
        this.rooms = {
            /*'DEMO_ROOM': new Room(
                'DEMO_ROOM',
                new User(-1, null, 'WOLF'),
                'DEMO_ROOM',
                15,
                'wolfqwer'
            )*/
        }

        this.uid = 0;
        this.users = {}

        this.init()

        const pingInterval = setInterval(function() {
            for (const uid in this.users) {
                const user = this.users[uid]
                const delta = performance.now() - user.pongAnswerTime
                if (delta >= pingIntervalTime * 3) {
                    this.userDisconnect(user)
                } else {
                    user.send({command: 'ping'})
                }
            }
        }.bind(this), pingIntervalTime)

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
            roomsArr.push(room.toObject());
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

    createRoom(owner, name, maxUsers, password) {
        const joinedRoom = this.getJoinedRoom(owner);
        if (joinedRoom) {
            if (joinedRoom.owner === owner) {
                owner.error('You already have a room!')
                return;
            }
        }

        const id = randomString();
        const room = new Room(id, owner, name, maxUsers, password);
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

    userLeaveRoom(user) {
        const room = this.getJoinedRoom(user);
        if (!room) {
            return
        }

        if (room.owner === user) {
            this.deleteRoom(room);
        } else {
            room.kick(user);
        }
    }

    userDisconnect(user) {
        // not authenticated
        if (!user.username) {
            return;
        }

        this.userLeaveRoom(user)

        delete this.users[user.id]

        user.ws.close()

        console.log(`${user.username} disconnected!`);
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
                    currentUser.setInfo(currentUser.id, config.iceServers)
                } else if (data.command === 'createRoom') {
                    this.createRoom(currentUser, data.name, data.maxUsers, data.password);
                } else if (data.command === 'getRooms') {
                    this.setRooms(currentUser);
                } else if (data.command === 'leaveRoom') {
                    this.userLeaveRoom(currentUser)
                } else if (data.command === 'pong') {
                    currentUser.pongAnswerTime = performance.now()
                } else if (data.command === 'joinRoom') {
                    const room = this.rooms[data.id]
                    if (!room) {
                        currentUser.error('Room does not exist!')
                        return
                    }
                    if (room.users.length >= room.maxUsers) {
                        currentUser.error('Room is full!')
                        return
                    }
                    if (room.password !== data.password) {
                        currentUser.error('Incorrect password!')
                        return
                    }
                    for (const user of room.users) {
                        console.log(user.username)
                        if (user.username === currentUser.username) {
                            currentUser.error('You are already in this room (maybe from another browser)!')
                            return
                        }
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
                this.userDisconnect(currentUser)
            });
        });
    }
}
