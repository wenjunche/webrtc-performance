
import * as React from 'react';
import { WebRTCSignaling, SignalingEvent } from 'openfin-webrtc-client';
import * as randomString from "randomstring";

//import { ThemeProvider } from '@rmwc/theme';
import '@rmwc/theme/styles';

import { Button } from '@rmwc/button';
import '@rmwc/button/styles';

import { TextField } from '@rmwc/textfield';
import '@rmwc/textfield/styles';

interface Props {
    name: string;
    webRTCClient:WebRTCSignaling;
}

type Metrics = {
    start: number;
    count: number;
    total: number;
    lastMps: number;
}
const currentMetrics: Metrics = { start: 0, count: 0, total: 0, lastMps: 0};
const message = { id: 0, payload: randomString.generate(1024)};
let messageTimer: ReturnType<typeof setInterval>;
let updUITimer: ReturnType<typeof setInterval>;
let initiator:boolean = false;
let messageId: number = -1;

export const Channel: React.FunctionComponent<Props> = ( (props) => {
    const [isWebRTCReady, setIsWebRTCReady] = React.useState(false);
    const mpsRef = React.useRef<number>(200);
    const [mps, setMps] = React.useState<number>(200);
    const [buttonText, setButtonText] = React.useState('Start');
    const [totalCount, setTotalCount] = React.useState(0);
    const dataChannelRef = React.useRef<RTCDataChannel>(null);

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
        messageId = m.id;
        if (messageId === 1) {
            currentMetrics.count = 0;
            currentMetrics.start = 0;
            currentMetrics.lastMps = 0;
        }
        currentMetrics.count++;
        const now = Date.now();
        if (currentMetrics.start === 0) {
            currentMetrics.start = now;
        } 
        else if ((now - currentMetrics.start) >= 1000) {
            currentMetrics.lastMps = currentMetrics.count;
            currentMetrics.count = 0;
            currentMetrics.start = now;
        } 
    };
    const onChannelClose = (ev: MessageEvent) => {
        cleanup();
    }
    const onMPSChange = (value:string) => {
        setMps(parseInt(value))
        mpsRef.current = parseInt(value);
    };
    const toggleSend = () => {
        if (messageTimer) {
            clearInterval(messageTimer);
            messageTimer = undefined;
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
        messageId = 0;
        if (!messageTimer) {
            console.log('start at MPS', mps);
            messageTimer = setInterval(spam, 1000);
            setButtonText('Stop');
        }
    }
    const spam = () => {
        for (let i = 0; i < mpsRef.current; i++) {
            message.id = ++messageId;
            dataChannelRef.current.send(JSON.stringify(message));
        }
    }
    const setupUpdateTimer = () => {
        if (!updUITimer) {
            updUITimer = setInterval(() => {
                if (messageId > 0) {
                    setTotalCount(messageId);
                    if (!initiator) {
                        setMps(currentMetrics.lastMps);
                    }
                }
            }, 5000);
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
      </div>
    );

})
