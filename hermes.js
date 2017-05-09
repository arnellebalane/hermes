(function(global, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else {
        global.hermes = factory();
    }
})(this, function() {

    if ('BroadcastChannel' in window) {
        return broadcastChannelApiFactory();
    } else if ('SharedWorker' in window) {
        return sharedWorkerApiFactory();
    } else if ('localStorage' in window) {
        return localStorageApiFactory();
    } else {
        return emptyApiFactory();
    }

    function broadcastChannelApiFactory() {
        /**
         *  The BroadcastChannel API allows simple communication between
         *  browsing contexts (including tabs), sort of like a PubSub that
         *  works across different tabs. This is the ideal solution for
         *  messaging between different tabs, but it is relatively new.
         *
         *  Support table for BroadcastChannel: http://caniuse.com/#feat=broadcastchannel
         **/

        const channels = {};

        function initialize(name) {
            channels[name] = {
                channel: new BroadcastChannel(name),
                callbacks: []
            };
            channels[name].channel.onmessage = (e) => {
                channels[name].callbacks.forEach((callback) => callback(e.data));
            };
        }

        function on(name, callback) {
            if (!(name in channels)) {
                initialize(name);
            }
            channels[name].callbacks.push(callback);
        }

        function off(name, callback) {
            if (name in channels) {
                if (typeof callback === 'function') {
                    const index = channels[name].callbacks.indexOf(callback);
                    channels[name].callbacks.splice(index, 1);
                }
                if (typeof callback !== 'function'
                || channels[name].callbacks.length === 0) {
                    channels[name].channel.close();
                    delete channels[name];
                }
            }
        }

        function send(name, data) {
            if (!(name in channels)) {
                initialize(name);
            }
            channels[name].channel.postMessage(data);
        }

        return { on, off, send };
    }

    function sharedWorkerApiFactory() {
        /**
         *  A SharedWorker is a script that is run by the browser in the
         *  background. Different browsing contexts (including tabs) from the
         *  same origin have shared accesss to the SharedWorker instance and
         *  can communicate with it. We are taking advantage of these features
         *  to use it as a messaging channel which simply forwards messages it
         *  receives to the other connected tabs.
         *
         *  Support table for SharedWorker: http://caniuse.com/#feat=sharedworkers
         **/

        // TODO: calculate worker path based on this file's path
        const worker = new SharedWorker('hermes-worker.js', 'hermes');
        worker.port.start();

        const callbacks = {};
        worker.port.onmessage = (e) => {
            const data = e.data;
            if (data.name in callbacks) {
                callbacks[data.name].forEach((callback) => callback(data.data));
            }
        };

        function on(name, callback) {
            if (!(name in callbacks)) {
                callbacks[name] = [];
            }
            callbacks[name].push(callback);
        }

        function off(name, callback) {
            if (name in callbacks) {
                if (typeof callback === 'function') {
                    const index = callbacks[name].indexOf(callback);
                    callbacks[name].splice(index, 1);
                }
                if (typeof callback !== 'function'
                || callbacks[name].length === 0) {
                    delete callbacks[name];
                }
            }
        }

        function send(name, data) {
            worker.port.postMessage({ name, data });
        }

        return { on, off, send };
    }

    function localStorageApiFactory() {
        /**
         *  The localStorage is a key-value pair storage, and browser tabs from
         *  the same origin have shared access to it. Whenever something
         *  changes in the localStorage, the window object emits the `storage`
         *  event in the other tabs letting them know about the change.
         **/

        const callbacks = {};
        const storage = window.localStorage;

        window.onstorage = (e) => {
            const name = e.key.replace('__hermes:', '');
            if (name in callbacks && e.oldValue === null) {
                const data = JSON.parse(e.newValue);
                callbacks[name].forEach((callback) => callback(data));
            }
        };

        function on(name, callback) {
            if (!(name in callbacks)) {
                callbacks[name] = [];
            }
            callbacks[name].push(callback);
        }

        function off(name, callback) {
            if (name in callbacks) {
                if (typeof callback === 'function') {
                    const index = callbacks[name].indexOf(callback);
                    callbacks[name].splice(index, 1);
                }
                if (typeof callback !== 'function'
                || callbacks[name].length === 0) {
                    delete callbacks[name];
                }
            }
        }

        // TODO: check first if the key is already set in the storage, and if
        // so, queue the current message for sending later when the existing
        // key has already been unset
        function send(name, data) {
            const key = `__hermes:${name}`;
            storage.setItem(key, JSON.stringify(data));
            storage.removeItem(key);
        }

        return { on, off, send };
    }

    function emptyApiFactory() {
        /**
         *  When the browser does not support any of the APIs that we're using
         *  for messaging, just present an empty api that does just gives
         *  warnings regarding the lack of support.
         **/

        function noop() {
            console.warn('Hermes messaging is not supported.');
        }

        return { on: noop, off: noop, send: noop };
    }

});
