/// <reference path="./node_modules/openfin-adapter/fin.d.ts" />
import * as React from 'react';
import { WebRTCSignaling, SignalingEvent } from 'openfin-webrtc-client';
import * as randomString from "randomstring";

//import { ThemeProvider } from '@rmwc/theme';
import '@rmwc/theme/styles';

import { Button } from '@rmwc/button';
import '@rmwc/button/styles';

import { TextField } from '@rmwc/textfield';
import '@rmwc/textfield/styles';

import type ChannelClient   from 'openfin-adapter/src/api/interappbus/channel/client';
import type ChannelProvider from 'openfin-adapter/src/api/interappbus/channel/provider';

const kMaxQueuedSendDataBytes: number = 16 * 1024 * 1024;   // defined in chromium
const MessageSize = 1024;
const infoUpdateFreq = 1000;

interface Props {
    name: string;
    webRTCClient?:WebRTCSignaling;
}

type Metrics = {
    start: number;
    count: number;
    total: number;
    lastMps: number;
}
const defaultMetrics: Metrics = { start: 0, count: 0, total: 0, lastMps: 0};
let initiator:boolean = false;

export const Channel: React.FunctionComponent<Props> = ( (props) => {
    const [isWebRTCReady, setIsWebRTCReady] = React.useState(false);
    const mpsRef = React.useRef<number>(200);
    const [mps, setMps] = React.useState<number>(200);
    const [buttonText, setButtonText] = React.useState('Start');
    const [totalCount, setTotalCount] = React.useState(0);
    const dataChannelRef = React.useRef<RTCDataChannel>(null);
    const metricsRef = React.useRef<Metrics>(defaultMetrics);
    const messageIdRef = React.useRef<number>(-1);
    const messageTimerRef = React.useRef<ReturnType<typeof setInterval>>(null);
    const updUITimerRef = React.useRef<ReturnType<typeof setInterval>>(null);
    const messageRef = React.useRef({ id: 0, payload: randomString.generate(MessageSize)});
    const [infoText, setInfoText] = React.useState('');
        
    React.useEffect(() => {
        props.webRTCClient.on('webrtc', (data: SignalingEvent) => {
            if (data.action === 'ready') {
                onWebRTCReady();
            }
            else if (data.action === 'disconnect') {
                onWebRTCDisconnect();
            }
        });
        props.webRTCClient.on('channel', (ev: SignalingEvent) => {
            if (ev.channel.label === props.name) {
                if (ev.action === 'open') {
                    dataChannelRef.current = ev.channel;
                    ev.channel.addEventListener('message', (onChannelMessage));
                    ev.channel.addEventListener('close', (onChannelClose));
                    ev.channel.addEventListener('bufferedamountlow', onBufferedamountlow);
                    ev.channel.addEventListener('error', onChannelError);
                    if (initiator) {
                        generateMessages();
                    }
                }
                else if (ev.action === 'close') {
                    cleanup();
                }
            }
        });
        setupUpdateTimer();
    }, []);


    const onWebRTCReady = () => {
        setIsWebRTCReady(true);
    };
    const onWebRTCDisconnect = () => {
        setIsWebRTCReady(false);
        cleanup();
    };
    const cleanup = () => {
        dataChannelRef.current  = null;
        setButtonText('Start');
    }
    const onChannelMessage = (ev: MessageEvent) => {
        const m = JSON.parse(ev.data);
        messageIdRef.current = m.id;
        if (messageIdRef.current === 1) {
            metricsRef.current.count = 0;
            metricsRef.current.start = 0;
            metricsRef.current.lastMps = 0;
        }
        metricsRef.current.count++;
        const now = Date.now();
        if (metricsRef.current.start === 0) {
            metricsRef.current.start = now;
        } 
        else if ((now - metricsRef.current.start) >= 1000) {
            metricsRef.current.lastMps = metricsRef.current.count;
            metricsRef.current.count = 0;
            metricsRef.current.start = now;
        } 
    };
    const onChannelClose = (ev: MessageEvent) => {
        cleanup();
        if (messageIdRef.current) {
            clearInterval(messageTimerRef.current);
            messageTimerRef.current = undefined;
        }
    }
    const onBufferedamountlow = () => {
        setInfoText(`Low Buffer amount ${dataChannelRef.current.bufferedAmount}`);
        console.log(`Low Buffer amount ${dataChannelRef.current.bufferedAmount}`);
    }
    const onChannelError = (ev: RTCErrorEvent) => {
        if (messageTimerRef.current) {
            clearInterval(messageTimerRef.current);
            messageTimerRef.current = undefined;
        }
    }
    const onMPSChange = (value:string) => {
        setMps(parseInt(value))
        mpsRef.current = parseInt(value);
    };
    const toggleSend = () => {
        if (messageTimerRef.current) {
            clearInterval(messageTimerRef.current);
            messageTimerRef.current = undefined;
            dataChannelRef.current.close();
        } 
        else if (dataChannelRef.current) {
            generateMessages();
        }
        else {
            initiator = true;
            props.webRTCClient.createDataChannel(props.name);
        }
    }
    const generateMessages = () => {
        messageIdRef.current = 0;
        if (!messageTimerRef.current) {
            console.log('start at MPS', mpsRef.current);
            messageTimerRef.current = setInterval(spam, 1000);
            setButtonText('Stop');
        }
    }
    const spam = () => {
        const threshold = kMaxQueuedSendDataBytes - (2 * MessageSize);
        for (let i = 0; i < mpsRef.current; i++) {
            messageRef.current.id = ++messageIdRef.current;
            dataChannelRef.current.send(JSON.stringify(messageRef.current));
            if (dataChannelRef.current.bufferedAmount >= threshold) {
                setInfoText(`throttling ${dataChannelRef.current.bufferedAmount}`);
                break;
            }
        }
    }
    const setupUpdateTimer = () => {
        if (!updUITimerRef.current) {
            updUITimerRef.current = setInterval(() => {
                if (messageIdRef.current > 0) {
                    setTotalCount(messageIdRef.current);
                    if (!initiator) {
                        setMps(metricsRef.current.lastMps);
                    }
                }
                if (dataChannelRef.current) {
                    setInfoText(`Buffer Amount ${dataChannelRef.current.bufferedAmount}`);
                }
            }, infoUpdateFreq);
        }
    }

    return (
      <div> 
        <div>
            <TextField label="MPS" onChange={ (ev) => onMPSChange((ev.target as HTMLInputElement).value) } value={ mps} />
            <Button raised onClick={toggleSend} disabled={!isWebRTCReady}>{buttonText}</Button>
        </div>
        <div>
            <span>Total count:</span><span style={{margin: "0 0 0 10px"}}>{totalCount}</span>
        </div>
        <div>
            <span>Info:</span><span style={{margin: "0 0 0 10px"}}>{infoText}</span>
        </div>
      </div>
    );

})

export const OFChannel: React.FunctionComponent<Props> = ( (props) => {
    const [isChannelReady, setIsChannelReady] = React.useState(false);
    const mpsRef = React.useRef<number>(200);
    const [mps, setMps] = React.useState<number>(200);
    const [buttonText, setButtonText] = React.useState('Start');
    const [totalCount, setTotalCount] = React.useState(0);
    const providerRef = React.useRef<ChannelProvider.ChannelProvider>(null);
    const clientRef = React.useRef<ChannelClient>(null);
    const metricsRef = React.useRef<Metrics>(defaultMetrics);
    const messageIdRef = React.useRef<number>(-1);
    const messageTimerRef = React.useRef<ReturnType<typeof setInterval>>(null);
    const updUITimerRef = React.useRef<ReturnType<typeof setInterval>>(null);
    const messageRef = React.useRef({ id: 0, payload: randomString.generate(MessageSize)});

    React.useEffect(() => {
        setupUpdateTimer();
    }, []);

    const onChannelMessage = (m: any) => {
        messageIdRef.current = m.id;
        if (messageIdRef.current === 1) {
            metricsRef.current.count = 0;
            metricsRef.current.start = 0;
            metricsRef.current.lastMps = 0;
        }
        metricsRef.current.count++;
        const now = Date.now();
        if (metricsRef.current.start === 0) {
            metricsRef.current.start = now;
        } 
        else if ((now - metricsRef.current.start) >= 1000) {
            metricsRef.current.lastMps = metricsRef.current.count;
            metricsRef.current.count = 0;
            metricsRef.current.start = now;
        } 
    };
    const onMPSChange = (value:string) => {
        setMps(parseInt(value))
        mpsRef.current = parseInt(value);
    };
    const toggleSend = () => {
        if (messageTimerRef.current) {
            clearInterval(messageTimerRef.current);
            messageTimerRef.current = undefined;
            setButtonText('Start');
        } 
        else if (clientRef.current) {
            generateMessages();
        }
    }
    const generateMessages = () => {
        messageIdRef.current = 0;
        if (!messageTimerRef.current) {
            console.log('start at MPS', mpsRef.current);
            messageTimerRef.current = setInterval(spam, 1000);
            setButtonText('Stop');
        }
    }
    const spam = () => {
        for (let i = 0; i < mpsRef.current; i++) {
            messageRef.current.id = ++messageIdRef.current;
            clientRef.current.dispatch('ptest', messageRef.current);
        }
    }
    const setupUpdateTimer = () => {
        if (!updUITimerRef.current) {
            updUITimerRef.current = setInterval(() => {
                if (messageIdRef.current > 0) {
                    setTotalCount(messageIdRef.current);
                    if (providerRef.current) {
                        setMps(metricsRef.current.lastMps);
                    }
                }
            }, infoUpdateFreq);
        }
    }
    const createProvider = async () => {
        providerRef.current = await fin.InterApplicationBus.Channel.create(props.name);
        setIsChannelReady(true);
        providerRef.current.onConnection((identity) => {
            console.log('Client connection request identity: ', JSON.stringify(identity));
        });
        providerRef.current.onDisconnection((identity) => {
            console.log('Client disconnection request identity: ', JSON.stringify(identity));
        });
        providerRef.current.register('ptest', (payload: any) => {
            onChannelMessage(payload);
        });        
    }
    const createClient = async () => {
        clientRef.current = await fin.InterApplicationBus.Channel.connect(props.name);
        setIsChannelReady(true);
        clientRef.current.onDisconnection(() => {
            console.log('Disconnected from Provider');
        });
    }

    return (
      <div> 
        <div>
            <Button raised onClick={createProvider} disabled={isChannelReady}>Provider</Button>
            <Button raised onClick={createClient} disabled={isChannelReady}>Client</Button>
            <br></br>
            <TextField label="MPS" onChange={ (ev) => onMPSChange((ev.target as HTMLInputElement).value) } value={ mps} />
            <Button raised onClick={toggleSend}>{buttonText}</Button>
        </div>
        <div>
            <span>Total count:</span><span style={{margin: "0 0 0 10px"}}>{totalCount}</span>
        </div>
      </div>
    );

})
