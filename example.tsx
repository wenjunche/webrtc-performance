import { Configuration, WebRTCSignaling } from 'openfin-webrtc-client';
import queryString from 'query-string';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Channel, OFChannel } from './components';

// @ts-ignore
let blpClient:any;

const configuration: Configuration = {
    signalingBaseUrl: 'https://webrtc-signaling-dev.openfin.co',
    pairingCode: 'fastBus',
    debug: false
};

window.addEventListener("DOMContentLoaded",  async () => {
    const webRTCClient:WebRTCSignaling = new WebRTCSignaling(configuration);    
    await webRTCClient.init();

    const parsed = queryString.parse(location.search);
    if (parsed.blp === 'true') {
        await blpClientInit();
    }

    setupChannelUI(webRTCClient);

});

function setupChannelUI(webRTCClient: WebRTCSignaling ) {

    ReactDOM.render(
        <Channel name='channel1' webRTCClient={webRTCClient} />,
        document.getElementById('channel1')
    );

    ReactDOM.render(
        <OFChannel name='OFChannel' />,
        document.getElementById('ofchannel')
    );

}

async function blpClientInit()  {
    console.log('initializing blpApi client');
    try {
    // window.blpApi is set in index.html
    // @ts-ignore
        blpClient = await window.blpApi.getClient();        
    } catch (err) {
        console.error(err);
    }
}
