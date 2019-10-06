define(["require", "exports", "connection", "room"], function (require, exports, connection_1, room_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /** P2P audio connection */
    var RTCAudioConnection = /** @class */ (function () {
        function RTCAudioConnection(remoteId, myStream) {
            this.remoteId = remoteId;
            // Peer offer options
            this.offerOption = {
                offerToReceiveAudio: true
            };
            // WebRTC configuration
            this.rtcConfig = {
                iceServers: []
            };
            // Create connection
            this.connection = new RTCPeerConnection(this.rtcConfig);
            var iceHandler = this.onICECandidate.bind(this);
            this.connection.onicecandidate = iceHandler;
            var stateHandler = this.onStateChange.bind(this);
            this.connection.oniceconnectionstatechange = stateHandler;
            var trackHandler = this.onRemoteTrack.bind(this);
            this.connection.addEventListener("track", trackHandler);
            this.connection.addEventListener("addstream", trackHandler);
            // Add local audio stream
            this.connection.addTrack(myStream.getTracks()[0]);
        }
        /** Send offer to remote party */
        RTCAudioConnection.prototype.sendOffer = function () {
            var _this = this;
            this.connection.createOffer(this.offerOption)
                .then(function (sdp) {
                // Local descriptor created
                logMessage("Offer created!");
                _this.connection.setLocalDescription(sdp);
                // Send offer message
                var offerData = {
                    type: "offer",
                    payload: sdp,
                    targetId: _this.remoteId
                };
                connection_1.sendMessage(new connection_1.RTCMessage(offerData).ofCurrentPlayer());
            })
                .catch(function () { return logMessage("Failed to create offer!"); });
        };
        /**
         * Set received answer
         * @param answerData Answer SDP
         */
        RTCAudioConnection.prototype.setRemoteAnswer = function (answerData) {
            var remoteSdp = new RTCSessionDescription(answerData);
            this.connection.setRemoteDescription(remoteSdp)
                .then(function () { return logMessage("Remote description set!"); })
                .catch(function () { return logMessage("Remote description set error!"); });
        };
        /**
         * Set new ICE candidate data
         * @param iceData ICE data
         */
        RTCAudioConnection.prototype.setNewICECandidate = function (iceData) {
            this.connection.addIceCandidate(new RTCIceCandidate(iceData));
        };
        /**
         * Set remote offer data and send answer
         * @param offerData Remote offer
         */
        RTCAudioConnection.prototype.setRemoteOffer = function (offerData) {
            var _this = this;
            var remoteDesc = new RTCSessionDescription(offerData);
            this.connection.setRemoteDescription(remoteDesc)
                .then(function () { return logMessage("Remote description set!"); })
                .catch(function (e) { return logMessage("Remote descriptor error: " + e); });
            this.connection.createAnswer(this.offerOption)
                .then(function (answerSdp) {
                // Answer sdp created
                logMessage("Answer created!");
                _this.connection.setLocalDescription(answerSdp);
                var answerData = {
                    type: "answer",
                    payload: answerSdp,
                    targetId: _this.remoteId
                };
                connection_1.sendMessage(new connection_1.RTCMessage(answerData).ofCurrentPlayer());
            })
                .catch(function (e) { return logMessage("Answer error: " + e); });
        };
        /** Connection state changed */
        RTCAudioConnection.prototype.onStateChange = function (e) {
            var serverState = this.connection.signalingState;
            var connState = this.connection.iceConnectionState;
            logMessage("New state: " + serverState + ", " + connState);
            // Inform base platform
            if (connState == "connected") {
                callbacks.connected();
            }
            else if (connState == "failed" || connState == "disconnected") {
                callbacks.error();
            }
        };
        /** Got remote track */
        RTCAudioConnection.prototype.onRemoteTrack = function (e) {
            this.remoteAudioElem = addPeerAudio(this.remoteId);
            if (e.stream) {
                this.remoteAudioElem.srcObject = e.stream;
            }
            else {
                this.remoteAudioElem.srcObject = e.streams[0];
            }
            this.remoteAudioElem.play();
        };
        /** On ICE candidate */
        RTCAudioConnection.prototype.onICECandidate = function (e) {
            var iceData = {
                type: "ice",
                payload: e.candidate,
                targetId: this.remoteId
            };
            connection_1.sendMessage(new connection_1.RTCMessage(iceData).ofCurrentPlayer());
        };
        return RTCAudioConnection;
    }());
    // Event callbacks
    var callbacks;
    // All connected pairs
    var connectionPairs;
    /** My audio element */
    var myAudioElem;
    /** Local audio stream */
    var localStream;
    /** Is client can use WebRTC */
    var isCapable;
    /**
     * Add new paired peer's audio element
     * @param clientId Paired peer's identifier
     */
    function addPeerAudio(clientId) {
        var peerAudioElem = document.createElement("audio");
        peerAudioElem.setAttribute("id", "a_" + clientId);
        return peerAudioElem;
    }
    /**
     * Вывести сообщение в лог
     * @param text Текст сообщения
     */
    function logMessage(text) {
        console.log(text);
    }
    /**
     * Get pair by remote client's id
     * @param remoteId Remote client identifier
     */
    function getPairById(remoteId) {
        var found = connectionPairs.filter(function (p) { return p.remoteId == remoteId; });
        return found.length > 0 ? found[0] : null;
    }
    /**
     * Create connections with remote clients
     * @param remoteIds Remote clients' id
     */
    function createConnectionPairs(remoteIds) {
        for (var _i = 0, remoteIds_1 = remoteIds; _i < remoteIds_1.length; _i++) {
            var id = remoteIds_1[_i];
            var newConnection = new RTCAudioConnection(id, localStream);
            newConnection.sendOffer();
            connectionPairs.push(newConnection);
        }
    }
    /**
     * Got answer to sent offer
     * @param remoteId Remote peer's id
     * @param answer Answer SDP
     */
    function gotRemoteAnswer(remoteId, answer) {
        var pair = getPairById(remoteId);
        pair.setRemoteAnswer(answer);
    }
    /**
     * Got ICE candidate data
     * @param remoteId Remote peer's id
     * @param iceData New ICE candidate
     */
    function gotICECandidate(remoteId, iceData) {
        var pair = getPairById(remoteId);
        if (pair != null) {
            pair.setNewICECandidate(iceData);
        }
    }
    /**
     * Received connection offer
     * @param remoteId Remote peer's id
     * @param offerData Connection offer
     */
    function getOfferFromPeer(remoteId, offerData) {
        var newConnection = new RTCAudioConnection(remoteId, localStream);
        newConnection.setRemoteOffer(offerData);
        connectionPairs.push(newConnection);
    }
    /** Connect to other clients in session */
    function connectOtherPlayers() {
        var playerIds = room_1.loadedRoom.players.filter(function (p) {
            return p.id != room_1.currentPlayer.id;
        }).map(function (p) { return p.id; });
        createConnectionPairs(playerIds);
    }
    /**
     * Got local audio stream
     * @param audioStream Local audio stream
     */
    function gotLocalStream(audioStream) {
        localStream = audioStream;
        // Listen local stream
        myAudioElem.srcObject = localStream;
        myAudioElem.volume = 0.2;
        myAudioElem.play();
        // Try connect to other peers in session
        connectOtherPlayers();
    }
    /** Request client audio stream */
    function requestMediaStream() {
        navigator.mediaDevices.getUserMedia({
            audio: { sampleRate: 12000 },
            video: false
        }).then(gotLocalStream)
            .catch(function () { return logMessage("Cannot access microphone!"); });
    }
    /** Initialization */
    function initialize(cb) {
        callbacks = cb;
        connectionPairs = [];
        var audioElem = document.getElementById("myAudio");
        myAudioElem = audioElem;
    }
    exports.initialize = initialize;
    /** Start connection */
    function start() {
        if (navigator.mediaDevices != null) {
            isCapable = true;
            requestMediaStream();
        }
        else {
            callbacks.error();
        }
    }
    exports.start = start;
    // Process signalling server message
    function processMessage(msg) {
        if (!isCapable) {
            return;
        }
        if (msg.type == "offer") {
            getOfferFromPeer(msg.senderId, msg.payload);
        }
        else if (msg.type == "answer") {
            gotRemoteAnswer(msg.senderId, msg.payload);
        }
        else if (msg.type == "ice") {
            gotICECandidate(msg.senderId, msg.payload);
        }
    }
    exports.processMessage = processMessage;
});
//# sourceMappingURL=rtc.js.map