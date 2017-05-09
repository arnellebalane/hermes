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
}
