import { contextBridge } from 'electron';

// Expose protected methods that allow the renderer process
// to use the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  // Add secure IPC methods here as needed
  // Example:
  // send: (channel: string, data: any) => {
  //   const validChannels = ['toMain'];
  //   if (validChannels.includes(channel)) {
  //     ipcRenderer.send(channel, data);
  //   }
  // },
});
