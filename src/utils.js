export function randomString(l = 10) {
    const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let res = '';
    for (let i = 0; i < l; i++) {
        const j = Math.floor(Math.random() * alphabet.length)
        res += alphabet[j]
    }
    return res;
}
