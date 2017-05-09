const connections = [];

self.onconnect = function(e) {
    const port = e.ports[0];
    port.start();

    port.onmessage = (e) => {
        connections.forEach((connection) => {
            if (connection !== port) {
                connection.postMessage(e.data)
            }
        });
    };

    connections.push(port);
};
