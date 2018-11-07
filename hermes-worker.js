const connections = [];

self.onconnect = function(connectEvent) {
    const port = connectEvent.ports[0];
    port.start();

    port.onmessage = messageEvent => {
        connections.forEach(connection => {
            if (connection !== port) {
                connection.postMessage(messageEvent.data);
            }
        });
    };

    connections.push(port);
};
