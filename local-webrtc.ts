/// <reference path="./node_modules/openfin-adapter/fin.d.ts" />

import { EventEmitter } from 'events';
import { Identity } from 'openfin-adapter';

import type ChannelClient   from 'openfin-adapter/src/api/interappbus/channel/client';
import type { ChannelProvider } from 'openfin-adapter/src/api/interappbus/channel/provider';

export interface Configuration  {
    pairingCode: string;
    debug?: boolean;
};

export interface SignalingEvent {
    type: 'webrtc' | 'channel'; 
    action: 'ready' | 'disconnect' | 'open' | 'close';
    channel?: RTCDataChannel;
}

const OFFER_ACTION: string  = 'offer-description';
const ANSWER_ACTION: string = 'answer-description';
interface OfferPayload {
    description?: RTCSessionDescription;
    status?: number;
}

export class LocalWebRTC extends EventEmitter {
    private configuration: Configuration;
    private peerConn: RTCPeerConnection;
    // @ts-ignore noUnusedLocals set to false
    private defaultDataChannel:RTCDataChannel;
    private defaultChannelName:string;
    private channelMap:Map<string, RTCDataChannel>;
    // OF channel for exchanging offer and anwser
    private channelClient:ChannelClient;
    private channelProvider:ChannelProvider;
    private channelClientId: Identity;
    private channelName:string;

    constructor(configuration: Configuration) {
        super();
        this.configuration = configuration;
        this.defaultChannelName = `${this.configuration.pairingCode}:default`;
        this.channelName = `webrtc:${this.configuration.pairingCode}:offer:answer`;
        this.channelMap = new Map();
    }

    async init() {
        await this.createPeerConnection();
        this.defaultDataChannel = this.createDataChannel(this.defaultChannelName);
        try {
            this.channelProvider = await fin.InterApplicationBus.Channel.create(this.channelName);
            this.channelProvider.onConnection(this.onClientConnect.bind(this));
            this.channelProvider.onDisconnection(this.onClientDisconnect.bind(this));
            this.channelProvider.register(OFFER_ACTION, this.onOffer.bind(this));
            console.log(`started channel provider ${this.channelName}`);
        } catch (ex) {
            this.channelClient = await fin.InterApplicationBus.Channel.connect(this.channelName);
            this.channelClient.register(ANSWER_ACTION, this.onAnswer.bind(this))
            console.log(`connected to channel provider ${this.channelName}`);
            await this.makeOffer();
        }
    }

    private async createPeerConnection() {
        this.peerConn = new RTCPeerConnection();
        this.peerConn.addEventListener('icecandidate', (event) => {
            if (event.candidate) {
                console.log('new candidate event:', event);
            } else {
                console.log('End of candidates.', this.peerConn.localDescription);
                this.lastCandidate();
            }
        });
        this.peerConn.addEventListener('icegatheringstatechange', event => {
            console.log('icegatheringstatechange event:', event);
        });
        this.peerConn.ondatachannel = (event) => {
            console.log('ondatachannel:', event.channel);
            const channel = event.channel;
            this.onDataChannelCreated(channel);
        };
    }

    private onClientConnect(identity: Identity, payload: any) {
        console.log(`Channel client connected ${JSON.stringify(identity)}`);
        if (this.channelClientId) {
            console.error(`Channel client already connected ${identity}`);
            throw new Error('Connection Rejected');
        } else {
            this.channelClientId = identity;
        }
    }

    private onClientDisconnect(identity: Identity) {
        console.log(`Channel client disconnected ${identity}`);
        if (this.channelClientId && this.channelClientId.uuid === identity.uuid && this.channelClientId.name === identity.name) {
            console.error(`Channel client already connected ${identity}`);
            this.channelClientId = null;
        }
    }

    private async makeOffer() {
        console.log('Creating an offer');
        const desc: RTCSessionDescriptionInit = await this.peerConn.createOffer();
        console.log('local session created:', desc);
        await this.peerConn.setLocalDescription(desc);
    }

    private async lastCandidate() {
        if (this.peerConn.localDescription) {
            console.log('iceGatheringState:', this.peerConn.iceGatheringState);
            console.log('sending local desc:', this.peerConn.localDescription);
            const localDescription: RTCSessionDescription = this.peerConn.localDescription;
            try {
                let resp: OfferPayload;
                if (this.channelProvider) {
                    console.log('Sending answer', this.channelClientId, localDescription);
                    resp = await this.channelProvider.dispatch({uuid: this.channelClientId.uuid, name: this.channelClientId.name }, ANSWER_ACTION, {description: localDescription});
                } else {
                    console.log('Sending offer', localDescription);
                    resp = await this.channelClient.dispatch(OFFER_ACTION, {description: localDescription});
                }
                if (resp.status !== 200) {
                    console.error('Error sending chaneel request', resp);
                }
            } catch (ex) {
                console.error(ex);
            }
        } else {
            console.warn('null local desc');
        }

    }

    private async onOffer(offer: OfferPayload, identity: Identity): Promise<OfferPayload> {
        console.log('Got offer', offer.description);
        await this.peerConn.setRemoteDescription(offer.description);
        const answer: RTCSessionDescriptionInit = await this.peerConn.createAnswer();
        await this.peerConn.setLocalDescription(answer);
        if (this.peerConn.localDescription) {
            console.log('iceGatheringState:', this.peerConn.iceGatheringState);
            console.log('sending local desc:', this.peerConn.localDescription);
            return { status: 200};
        } else {
            console.warn('null local desc');
        }
    }

    private async onAnswer(anwser: OfferPayload, identity: Identity): Promise<OfferPayload> {
        console.log('Got answer', anwser.description);
        await this.peerConn.setRemoteDescription(anwser.description);
        if (this.peerConn.localDescription) {
            console.log('iceGatheringState:', this.peerConn.iceGatheringState);
            console.log('sending local desc:', this.peerConn.localDescription);
            return { status: 200};
        } else {
            console.warn('null local desc');
        }
    }

    createDataChannel(name: string): RTCDataChannel {
        console.log(`Creating Data Channel ${name}`);
        const channel = this.peerConn.createDataChannel(name);
        this.onDataChannelCreated(channel);
        return channel; 
    }

    private onDataChannelCreated(channel: RTCDataChannel) {
        console.log(`onDataChannelCreated: ${channel.label}`);
        this.channelMap.set(channel.label, channel);

        channel.addEventListener('open', () => {
            console.log(`channel open: ${channel.label}`);
            if (channel.label !== this.defaultChannelName) {
                this.emit('channel', {type: 'channel', action: 'open', channel});
            } else {
                this.emit('webrtc', {action: 'ready'});
            }
        });
    
        channel.addEventListener('close', () => {
            console.log(`channel closed: ${channel.label}`);
            if (channel.label === this.defaultChannelName) {
                console.log('default channel closed.  need to re-init');
                this.emit('webrtc', {action: 'disconnect'});
            }
        });

        channel.addEventListener('closing', () => {
            console.log(`channel closing: ${channel.label}`);
        });

        channel.addEventListener('error', (err) => {            
            console.error(`channel error: ${channel.label}`, err);
            if (channel.label === this.defaultChannelName) {
                this.cleanup();
                this.emit('webrtc', {action: 'error', error: err});
            }
        });
        
        channel.addEventListener('message', (event) => {
            if (typeof event.data === 'string' && this.configuration.debug) {
                console.log(`channel receiving data: ${event.data}`);
            }    
        });        
    }

    private cleanup() {
        console.log('webrtc client cleanup');
        this.channelMap.forEach( (c, key) => {
            console.log('trying to close channel', key);
            c.close();
        });
        this.channelMap.clear();
        if (this.peerConn.connectionState === 'connected') {
            console.log('trying to peer connection');
            this.peerConn.close();
        }
    }    

}