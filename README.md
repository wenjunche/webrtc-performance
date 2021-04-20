# openfin-webrtc-example

A sample WebRTC app that uses signaling and STUN servers hosted by OpenFin.

## Build the example

Clone this repository and execute the following commands to build the project and start webpack dev server.

```sh
   npm install
   npm run build
   npm run start
```

## Run the example

Two instances of the example app need to be started so WebRTC can be established.

```sh
   npm run start:example
   npm run start:example
```

Once the two instances are connected,  Use "CREATE CHANNEL" buttons to create data channels with names enterd in "channel name".  For each data channel, text message can be sent and received with SEND button.

## Run the example with Bloomberg service

Check out [bloomberg service repo](git@github.com:openfin/bloomberg-service.git) and start the serice in emulator mode.  Then start one instance of the example with:

```sh
   npm run start:example:blp
```

Once two instances are connected, create a data channel first.  Then click on "Send ReferenceDataRequest" to send a Bloomberg request to the peer.

## Code in the example

1. Dependency in package.json

```sh
    "openfin-webrtc-client": "1.0.2",
```

2. Intializing WebRTC Signaling service

```javascript
   import { Configuration, WebRTCSignaling } from 'openfin-webrtc-client';

   const configuration: Configuration = {
      signalingBaseUrl: 'https://webrtc-signaling-dev.openfin.co',
      pairingCode: 'myWebrtcExample'  // both peers need to use the same code
   };

    const webRTCClient:WebRTCSignaling = new WebRTCSignaling(configuration);    
    await webRTCClient.init();

```

3. Listen to WebRTC Signaling events

```javascript
   webRTCClient.on('webrtc', (data: SignalingEvent) => {
      if (data.action === 'ready') {
         // WebRTC connection is open
      }
      else if (data.action === 'disconnect') {
         // WebRTC connection and all data chanels are closed.
      }
   });

   webRTCClient.on('channel', (ev: SignalingEvent) => {
      if (ev.action === 'open') {
         newChannel: RTCDataChannel = ev.channel;
         // newChannel is open and ready to receive messages
      }
      else if (ev.action === 'close') {
         channel: RTCDataChannel = ev.channel;
         // channel is closed
      }
   });    

```

5. Create WebRTC Data Channel

```javascript
   webRTCClient.createDataChannel("chanelName");
```
