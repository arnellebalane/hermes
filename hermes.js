if ('BroadcastChannel' in window) {
    /**
     *  The BroadcastChannel API allows simple communication between browsing
     *  contexts (including tabs), sort of like a PubSub that works across
     *  different tabs. This is the ideal solution for messaging between
     *  different tabs, but it is relatively new.
     *
     *  Support table for BroadcastChannel: http://caniuse.com/#feat=broadcastchannel
     **/

    window.hermes = (function broadcastChannelApiFactory() {
        const channels = {};

        function initialize(name) {
            channels[name] = {
                channel: new BroadcastChannel(name),
                callbacks: []
            };
            channels[name].channel.onmessage = (e) => {
                channels[name].callbacks.forEach((callback) => callback(e));
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
    })();

} else if ('SharedWorker' in window) {
    /**
     *  A SharedWorker is a script that is run by the browser in the background.
     *  Different browsing contexts (including tabs) from the same origin have
     *  shared accesss to the SharedWorker instance and can communicate with
     *  it. We are taking advantage of these features to use it as a messaging
     *  channel which simply forwards messages it receives to the other
     *  connected tabs.
     *
     *  Support table for SharedWorker: http://caniuse.com/#feat=sharedworkers
     **/

    window.hermes = (function sharedWorkerApiFactory() {
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
    })();

}
