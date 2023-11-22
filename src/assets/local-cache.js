class LocalCache {
    constructor(identifier) {
        this.identifier = identifier;
        this._cache = JSON.parse(localStorage.getItem(this.identifier) || '{}');
    }

    get(key) {
        return this._cache[key];
    }

    set(key, value) {
        this._cache[key] = value;
    }

    save() {
        localStorage.setItem(this.identifier, JSON.stringify(this._cache));
    }

    keys() {
        return Object.keys(this._cache);
    }

    remove(key) {
        delete this._cache[key];
    }

    data() {
        return JSON.parse(JSON.stringify(this._cache));
    }

    clear() {
        this._cache = {};
        localStorage.removeItem(this.identifier);
    }
}


module.exports = {
    LocalCache
}