
let clients = [];

// Store last scan status to send to new clients immediately
export let currentScanStatus = {
    isScanning: false,
    progress: 0,
    currentFile: '',
    totalFound: 0,
    processed: 0,
    error: null
};

export const updateScanStatus = (status) => {
    currentScanStatus = { ...currentScanStatus, ...status };
};

export const addClient = (res) => {
    const clientId = Date.now();
    const client = {
        id: clientId,
        res // Store response object
    };
    clients.push(client);
    
    // Send immediate scan status on connection
    const initialData = JSON.stringify({ type: 'scan:status', payload: currentScanStatus });
    client.res.write(`data: ${initialData}\n\n`);
    
    return clientId;
};

export const removeClient = (clientId) => {
    clients = clients.filter(client => client.id !== clientId);
};

export const broadcast = (type, payload) => {
    const data = JSON.stringify({ type, payload });
    clients.forEach(client => {
        // Check if connection is writable before writing
        if (!client.res.writableEnded) {
            client.res.write(`data: ${data}\n\n`);
        }
    });
};

export const closeAllClients = () => {
    clients.forEach(client => {
        try {
            client.res.end();
        } catch (e) {
            console.error('Error closing SSE client', e);
        }
    });
    clients = [];
};
