import { RTCMessage, sendMessage } from "connection";
import { loadedRoom, currentPlayer } from "room";

// WebRTC connection handling

/** RTC callbacks */
export interface IRTCCallbacks {
    connected(): void;
    error(): void;
}

/** P2P audio connection */
class RTCAudioConnection {

    // Peer offer options
    private offerOption: RTCOfferOptions = {
        offerToReceiveAudio: true
    };

    // WebRTC configuration
    private rtcConfig: RTCConfiguration = {
        iceServers: []
    };

    // P2P connection
    private connection: RTCPeerConnection;

    // Remote peer audio output
    private remoteAudioElem: HTMLAudioElement;

    /** Send offer to remote party */
    public sendOffer(): void {
        this.connection.createOffer(this.offerOption)
            .then((sdp: RTCSessionDescription) => {
                // Local descriptor created
                logMessage("Offer created!");
                this.connection.setLocalDescription(sdp);

                // Send offer message
                let offerData = {
                    type: "offer",
                    payload: sdp,
                    targetId: this.remoteId
                };
                sendMessage(new RTCMessage(offerData).ofCurrentPlayer());
            })
            .catch(() => logMessage("Failed to create offer!"));
    }

    /**
     * Set received answer
     * @param answerData Answer SDP
     */
    public setRemoteAnswer(answerData: any): void {
        let remoteSdp = new RTCSessionDescription(answerData);
        this.connection.setRemoteDescription(remoteSdp)
            .then(() => logMessage("Remote description set!"))
            .catch(() => logMessage("Remote description set error!"));
    }

    /**
     * Set new ICE candidate data
     * @param iceData ICE data
     */
    public setNewICECandidate(iceData: any): void {
        this.connection.addIceCandidate(new RTCIceCandidate(iceData));
    }

    /**
     * Set remote offer data and send answer
     * @param offerData Remote offer
     */
    public setRemoteOffer(offerData: any): void {
        let remoteDesc = new RTCSessionDescription(offerData);
        this.connection.setRemoteDescription(remoteDesc)
            .then(() => logMessage("Remote description set!"))
            .catch(e => logMessage(`Remote descriptor error: ${e}`));
        this.connection.createAnswer(this.offerOption)
            .then(answerSdp => {
                // Answer sdp created
                logMessage("Answer created!");
                this.connection.setLocalDescription(answerSdp);

                let answerData = {
                    type: "answer",
                    payload: answerSdp,
                    targetId: this.remoteId
                };
                sendMessage(new RTCMessage(answerData).ofCurrentPlayer());
            })
            .catch(e => logMessage(`Answer error: ${e}`));
    }

    /** Connection state changed */
    private onStateChange(e: Event): void {
        let serverState = this.connection.signalingState;
        let connState = this.connection.iceConnectionState;
        logMessage(`New state: ${serverState}, ${connState}`);

        // Inform base platform
        if (connState == "connected") {
            callbacks.connected();
        } else if (connState == "failed" || connState == "disconnected") {
            callbacks.error();
        }
    }

    /** Got remote track */
    private onRemoteTrack(e: any): void {
        this.remoteAudioElem = addPeerAudio(this.remoteId);

        if (e.stream) {
            this.remoteAudioElem.srcObject = e.stream;
        } else {
            this.remoteAudioElem.srcObject = e.streams[0];
        }

        this.remoteAudioElem.play();
    }

    /** On ICE candidate */
    private onICECandidate(e: RTCPeerConnectionIceEvent): void {
        let iceData = {
            type: "ice",
            payload: e.candidate,
            targetId: this.remoteId
        };
        sendMessage(new RTCMessage(iceData).ofCurrentPlayer());
    }

    constructor(public remoteId: string, myStream: MediaStream) {
        // Create connection
        this.connection = new RTCPeerConnection(this.rtcConfig);

        let iceHandler = this.onICECandidate.bind(this);
        this.connection.onicecandidate = iceHandler;
        let stateHandler = this.onStateChange.bind(this);
        this.connection.oniceconnectionstatechange = stateHandler;
        let trackHandler = this.onRemoteTrack.bind(this);
        this.connection.addEventListener("track", trackHandler);
        this.connection.addEventListener("addstream", trackHandler);

        // Add local audio stream
        this.connection.addTrack(myStream.getTracks()[0]);
    }
}

// Event callbacks
var callbacks: IRTCCallbacks;

// All connected pairs
var connectionPairs: Array<RTCAudioConnection>;

/** My audio element */
var myAudioElem: HTMLAudioElement;

/** Local audio stream */
var localStream: MediaStream;

/** Is client can use WebRTC */
var isCapable: boolean;

/**
 * Add new paired peer's audio element
 * @param clientId Paired peer's identifier
 */
function addPeerAudio(clientId: string): HTMLAudioElement {
    let peerAudioElem = document.createElement("audio");
    peerAudioElem.setAttribute("id", `a_${clientId}`);

    return peerAudioElem;
}

/**
 * Вывести сообщение в лог
 * @param text Текст сообщения
 */
function logMessage(text: string): void {
    console.log(text);
}

/**
 * Get pair by remote client's id
 * @param remoteId Remote client identifier
 */
function getPairById(remoteId: string): RTCAudioConnection {
    let found = connectionPairs.filter(p => p.remoteId == remoteId);
    return found.length > 0 ? found[0] : null;
}

/**
 * Create connections with remote clients
 * @param remoteIds Remote clients' id
 */
function createConnectionPairs(remoteIds: string[]): void {
    for (let id of remoteIds) {
        let newConnection = new RTCAudioConnection(id, localStream);
        newConnection.sendOffer();
        connectionPairs.push(newConnection);
    }
}

/**
 * Got answer to sent offer
 * @param remoteId Remote peer's id
 * @param answer Answer SDP
 */
function gotRemoteAnswer(remoteId: string, answer: any): void {
    let pair = getPairById(remoteId);
    pair.setRemoteAnswer(answer);
}

/**
 * Got ICE candidate data
 * @param remoteId Remote peer's id
 * @param iceData New ICE candidate
 */
function gotICECandidate(remoteId: string, iceData: any): void {
    let pair = getPairById(remoteId);
    if (pair != null) {
        pair.setNewICECandidate(iceData);
    }
}

/**
 * Received connection offer
 * @param remoteId Remote peer's id
 * @param offerData Connection offer
 */
function getOfferFromPeer(remoteId: string, offerData: any): void {
    var newConnection = new RTCAudioConnection(remoteId, localStream);
    newConnection.setRemoteOffer(offerData);
    connectionPairs.push(newConnection);
}

/** Connect to other clients in session */
function connectOtherPlayers(): void {
    let playerIds = loadedRoom.players.filter(p => {
        return p.id != currentPlayer.id;
    }).map(p => p.id);
    createConnectionPairs(playerIds);
}

/**
 * Got local audio stream
 * @param audioStream Local audio stream
 */
function gotLocalStream(audioStream: MediaStream) {
    localStream = audioStream;
    // Listen local stream
    myAudioElem.srcObject = localStream;
    myAudioElem.volume = 0.2;
    myAudioElem.play();

    // Try connect to other peers in session
    connectOtherPlayers();
}

/** Request client audio stream */
function requestMediaStream(): void {
    navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 12000 },
        video: false
    }).then(gotLocalStream)
        .catch(() => logMessage("Cannot access microphone!"));
}

/** Initialization */
export function initialize(cb: IRTCCallbacks): void {
    callbacks = cb;
    connectionPairs = [];
    let audioElem = document.getElementById("myAudio");
    myAudioElem = <HTMLAudioElement>audioElem;
}

/** Start connection */
export function start(): void {
    if (navigator.mediaDevices != null) {
        isCapable = true;
        requestMediaStream();
    } else {
        callbacks.error();
    }
}

// Process signalling server message
export function processMessage(msg: RTCMessage): void {
    if (!isCapable) { return; }

    if (msg.type == "offer") {
        getOfferFromPeer(msg.senderId, msg.payload);
    } else if (msg.type == "answer") {
        gotRemoteAnswer(msg.senderId, msg.payload);
    } else if (msg.type == "ice") {
        gotICECandidate(msg.senderId, msg.payload);
    }
}