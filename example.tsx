//import { Configuration, WebRTCSignaling } from 'openfin-webrtc-client';
import { Configuration, LocalWebRTC } from './local-webrtc';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { MessageConfig, Channel, OFChannel, OFBus } from './components';
import { store } from './store';

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
        <Provider store={store}>
            <MessageConfig name='config'/>
        </Provider>,
        document.getElementById('perfConfig')
    );

    ReactDOM.render(
        <Provider store={store}>
            <Channel name='channel1' webRTCClient={webRTCClient} />
        </Provider>,
        document.getElementById('channel1')
    );

    ReactDOM.render(
        <Provider store={store}>
            <OFChannel name='OFChannel' />
        </Provider>,
        document.getElementById('ofchannel')
    );

    ReactDOM.render(
        <Provider store={store}>
            <OFBus name='OFBus' />
        </Provider>,
        document.getElementById('ofbus')
    );

}

