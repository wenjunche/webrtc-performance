# webrtc-performance

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

