const WebSocket = require('ws')

const PORT = 9090

function randomString(l = 10) {
    const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let res = '';
    for (let i = 0; i < l; i++) {
        const j = Math.floor(Math.random() * alphabet.length)
        res += alphabet[j]
    }
    return res;
}

class User {
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

class Room {
    constructor(id, name, maxUsers=12, owner) {
        this.id = id;
        this.name = name;
        this.maxUsers = 10
        this.owner = owner;

        this.users = [owner];
    }

    deleteUser(user) {
        for (let i = 0; i < this.users.length; i++) {
            if (this.users[i] === user) {
                this.users.splice(i, 1)
                return
            }
        }
    }

    kick(user) {
        user.kick(false);
        this.deleteUser(user);

        for (const user of this.users) {
            user.setRoom(this);
        }
    }

    kickAll() {
        for (const user of this.users) {
            user.kick(false);
        }
        this.users = [];
    }

    addUser(user) {
        this.users.push(user)

        for (const user of this.users) {
            user.setRoom(this);
        }
    }
}

class Server {
    constructor(port) {
        this.wsServer = new WebSocket.Server({ port });
        this.rooms = {}

        this.uid = 0;
        this.users = {}

        this.init()
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
            const user = new User(this.uid++, ws);

            ws.on('message', (message) => {
                const data = JSON.parse(message);

                if (data.command === 'setInfo') {
                    user.username = data.username;
                    this.users[user.id] = user;
                    console.log(`${user.username} connected!`);
                } else if (data.command === 'createRoom') {
                    const joinedRoom = this.getJoinedRoom(user);
                    if (joinedRoom) {
                        if (joinedRoom.owner === user) {
                            user.error('You already have a room!')
                            return;
                        }
                    }

                    const id = randomString();
                    const room = new Room(id, data.name, data.maxUsers, user);
                    this.rooms[id] = room
                    this.setRooms()
                    user.setRoom(room)
                } else if (data.command === 'getRooms') {
                    this.setRooms(user);
                } else if (data.command === 'leaveRoom') {
                    const room = this.getJoinedRoom(user);
                    if (!room) {
                        user.error('This room does not exist')
                        return
                    }

                    if (room.owner === user) {
                        this.deleteRoom(room);
                    } else {
                        room.kick(user);
                    }
                } else if (data.command === 'joinRoom') {
                    const room = this.rooms[data.id]
                    if (!room) {
                        user.error('Room does not exist!')
                    }

                    room.addUser(user);
                } else if (data.command === 'sendMessage') {
                    const room = this.getJoinedRoom(user);
                    if (!room) {
                        user.error('Join the room first!');
                    }

                    const newData = {
                        command: 'addMessage',
                        username: user.username,
                        content: data.content
                    }
                    for (const user of room.users) {
                        user.send(newData)
                    }
                }
            });

            ws.on('close', () => {
                if (user.username) {
                    const room = this.getJoinedRoom(user);
                    if (room) {
                        if (room.owner === user) {
                            this.deleteRoom(room);
                        }
                    }
                    delete this.users[user.id]
                    console.log(`${user.username} disconnected!`);
                }
            });
        });
    }
}

const server = new Server(PORT);
