export default class Room {
    constructor(id, name, maxUsers=12, owner) {
        this.id = id;
        this.name = name;
        this.maxUsers = 10
        this.owner = owner;

        this.users = [owner];
    }

    sendMessage(fromUser, content) {
        const newData = {
            command: 'addMessage',
            username: fromUser.username,
            content: content
        }
        for (const user of this.users) {
            user.send(newData)
        }
    }

    deleteUser(user) {
        for (let i = 0; i < this.users.length; i++) {
            if (this.users[i] === user) {
                this.users.splice(i, 1)
                return
            }
        }
    }

    kick(kickedUser) {
        kickedUser.kick(false);
        this.deleteUser(kickedUser);

        for (const user of this.users) {
            if (user !== kickedUser) {
                user.deleteRoomUser(kickedUser);
            }
        }
    }

    kickAll() {
        for (const user of this.users) {
            user.kick(false);
        }
        this.users = [];
    }

    addUser(newUser) {
        this.users.push(newUser)
        newUser.setRoom(this)

        for (const user of this.users) {
            if (user !== newUser) {
                user.addRoomUser(newUser)
            }
        }
    }
}
