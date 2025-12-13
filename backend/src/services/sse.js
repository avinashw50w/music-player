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
        write: (data) => res.write(data)
    };
    clients.push(client);
    
    // Send immediate scan status on connection
    const initialData = JSON.stringify({ type: 'scan:status', payload: currentScanStatus });
    client.write(`data: ${initialData}\n\n`);
    
    return clientId;
};

export const removeClient = (clientId) => {
    clients = clients.filter(client => client.id !== clientId);
};

export const broadcast = (type, payload) => {
    const data = JSON.stringify({ type, payload });
    clients.forEach(client => {
        client.write(`data: ${data}\n\n`);
    });
};