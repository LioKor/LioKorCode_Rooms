export default class Room {
    constructor(id, owner, name, maxUsers = 12, password = '') {
        this.id = id
        this.owner = owner
        this.name = name
        this.maxUsers = maxUsers
        this.password = password

        this.users = [owner]
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

    toObject() {
        const users = []
        for (const user of this.users) {
            users.push(user.toObject())
        }

        return {
            id: this.id,
            name: this.name,
            owner: {
                id: this.owner.id,
                username: this.owner.username
            },
            usersMax: this.maxUsers,
            hasPassword: this.password.length > 0,

            users: users
        }
    }
}
