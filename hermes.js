(function(global, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else {
        global.hermes = factory();
    }
})(window, () => {
    const callbacks = {};

    function on(topic, callback) {
        if (!(topic in callbacks)) {
            callbacks[topic] = [];
        }
        callbacks[topic].push(callback);
    }

    function off(topic, callback) {
        if (topic in callbacks) {
            if (typeof callback === 'function') {
                const index = callbacks[topic].indexOf(callback);
                callbacks[topic].splice(index, 1);
            }
            if (typeof callback !== 'function' || callbacks[topic].length === 0) {
                delete callbacks[topic];
            }
        }
    }

    function broadcast(topic, data) {
        if (topic in callbacks) {
            callbacks[topic].forEach(callback => callback(data));
        }
    }

    function broadcastChannelApiFactory() {
        /*
         *  The BroadcastChannel API allows simple communication between
         *  browsing contexts (including tabs), sort of like a PubSub that
         *  works across different tabs. This is the ideal solution for
         *  messaging between different tabs, but it is relatively new.
         *
         *  Support table for BroadcastChannel: http://caniuse.com/#feat=broadcastchannel
         */

        const channel = new BroadcastChannel('hermes');
        channel.onmessage = e => broadcast(e.data.topic, e.data.data);

        function send(topic, data, target = 'other') {
            if (target === 'all' || target === 'other') {
                channel.postMessage({topic, data});
            }

            if (target === 'all' || target === 'current') {
                broadcast(topic, data);
            }
        }

        return {on, off, send};
    }

    function sharedWorkerApiFactory() {
        /*
         *  A SharedWorker is a script that is run by the browser in the
         *  background. Different browsing contexts (including tabs) from the
         *  same origin have shared accesss to the SharedWorker instance and
         *  can communicate with it. We are taking advantage of these features
         *  to use it as a messaging channel which simply forwards messages it
         *  receives to the other connected tabs.
         *
         *  Support table for SharedWorker: http://caniuse.com/#feat=sharedworkers
         */

        const selector = '[src$="hermes.js"],[src$="hermes.min.js"]';
        const script = document.querySelector(selector);
        const scriptUrl = new URL(script.src);
        const workerPath = scriptUrl.pathname
            .replace(/hermes(\.min)?\.js/, 'hermes-worker$1.js');

        const worker = new SharedWorker(workerPath, 'hermes');

        worker.port.start();
        worker.port.onmessage = e => broadcast(e.data.topic, e.data.data);

        function send(topic, data, target = 'other') {
            if (target === 'all' || target === 'other') {
                worker.port.postMessage({topic, data});
            }

            if (target === 'all' || target === 'current') {
                broadcast(topic, data);
            }
        }

        return {on, off, send};
    }

    function localStorageApiFactory() {
        /*
         *  The localStorage is a key-value pair storage, and browser tabs from
         *  the same origin have shared access to it. Whenever something
         *  changes in the localStorage, the window object emits the `storage`
         *  event in the other tabs letting them know about the change.
         *
         *  Support table for localStorage: http://caniuse.com/#search=webstorage
         */

        const storage = window.localStorage;
        const prefix = '__hermes:';
        const queue = {};

        function send(topic, data, target= 'other') {
            const key = prefix + topic;
            if (storage.getItem(key) === null || storage.getItem(key) === '') {
                if (target === 'all' || target === 'other') {
                    storage.setItem(key, JSON.stringify(data));
                    storage.removeItem(key);
                }

                if (target === 'all' || target === 'current') {
                    broadcast(topic, data);
                }
            } else {
                /*
                 * The queueing system ensures that multiple calls to the send
                 * function using the same name does not override each other's
                 * values and makes sure that the next value is sent only when
                 * the previous one has already been deleted from the storage.
                 * NOTE: This could just be trying to solve a problem that is
                 * very unlikely to occur.
                 */
                if (!((key) in queue)) {
                    queue[key] = [];
                }
                queue[key].push(data);
            }
        }

        window.addEventListener('storage', e => {
            if (!e.key) { return; }
            if (e.key.indexOf(prefix) === 0 && (e.oldValue === null || e.oldValue === '')) {
                const topic = e.key.replace(prefix, '');
                const data = JSON.parse(e.newValue);
                broadcast(topic, data);
            }
        });

        window.addEventListener('storage', e => {
            if (!e.key) { return; }
            if (e.key.indexOf(prefix) === 0 && (e.newValue === null || e.newValue === '')) {
                const topic = e.key.replace(prefix, '');
                if (topic in queue) {
                    send(topic, queue[topic].shift());
                    if (queue[topic].length === 0) {
                        delete queue[topic];
                    }
                }
            }
        });

        return {on, off, send};
    }

    function emptyApiFactory() {
        /*
         *  When the browser does not support any of the APIs that we're using
         *  for messaging, just present an empty api that does just gives
         *  warnings regarding the lack of support.
         */

        function noop() {
            console.warn('Hermes messaging is not supported.');
        }

        return {on: noop, off: noop, send: noop};
    }

    if ('BroadcastChannel' in window) {
        return broadcastChannelApiFactory();
    } else if ('SharedWorker' in window) {
        return sharedWorkerApiFactory();
    } else if ('localStorage' in window) {
        return localStorageApiFactory();
    }
    return emptyApiFactory();
});
