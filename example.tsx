//import { Configuration, WebRTCSignaling } from 'openfin-webrtc-client';
import { Configuration, LocalWebRTC } from './local-webrtc';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Channel, OFChannel, OFBus } from './components';

// @ts-ignore
let blpClient:any;

const configuration: Configuration = {
//    signalingBaseUrl: 'https://webrtc-signaling-dev.openfin.co',
    pairingCode: 'fastBus',
    debug: false
};

// window.addEventListener("DOMContentLoadedxx",  async () => {
//     const webRTCClient:WebRTCSignaling = new WebRTCSignaling(configuration);    
//     await webRTCClient.init();

//     setupChannelUI(webRTCClient);

// });

window.addEventListener("DOMContentLoaded",  async () => {
    const localWebRTC: LocalWebRTC = new LocalWebRTC(configuration);    
    await localWebRTC.init();

    setupChannelUI(localWebRTC);

});

function setupChannelUI(webRTCClient: LocalWebRTC ) {

    ReactDOM.render(
        <Channel name='channel1' webRTCClient={webRTCClient} />,
        document.getElementById('channel1')
    );

    ReactDOM.render(
        <OFChannel name='OFChannel' />,
        document.getElementById('ofchannel')
    );

    ReactDOM.render(
        <OFBus name='OFBus' />,
        document.getElementById('ofbus')
    );

}

