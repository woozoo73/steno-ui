const app = new Vue({
    el: '#app',
    data: {
        id: '',
        invocation: {},
        json: {},
        mermaidSequence: '',
        request: {},
        response: {},
        invocations: [],
        participants: new Set(),
        mermaidTheme: '',
        linkBaseUrl: '',
        currentCallInvocation: {},
        currentReturnInvocation: {}
    },
    mounted: function () {
        let params = new URLSearchParams(window.location.search);
        this.id = params.get('id');
        this.mermaidTheme = this.getMermaidTheme();
        this.linkBaseUrl = this.getLinkBaseUrl();
        this.getInvocation();
    },
    computed: {
        sequences: function() {
            return this.invocations.filter(invocation => (invocation['type'] === 'Call' || invocation['type'] === 'Return'));
        },
        events: function() {
            return this.invocations.filter(invocation => invocation['type'] === 'Event');
        }
    },
    methods: {
        clear: function () {
            this.invocation = {};
            this.json = {};
            this.mermaidSequence = '';
            this.request = {};
            this.response = {};
            this.invocations = [];
            this.participants = new Set();
            this.mermaidTheme = '';
            this.linkBaseUrl = '';
        },
        makeMermaidSequence: function(json) {
            let text = '';

            text += this.line('sequenceDiagram');
            text += this.line();

            text += this.tab() + this.line('actor Client');
            text += this.tab() + this.line('participant Handler');

            const participants = this.getParticipants(json, new Set());
            if (participants) {
                for (const participant of participants) {
                    text += this.tab() + this.line('participant ' + participant + ' as ' + this.afterDot(participant));
                }
            }

            text += this.line();

            const calls = this.makeInvocaitons(json);

            console.log("calls.length=" + calls.length);

            if (calls) {
                for (const call of calls) {
                    if (call['type'] == 'Call') {
                        text += this.tab() + this.line(call['from'] + '->>' + call['to'] + ': ' + call['message']);
                    }
                    if (call['type'] == 'Return') {
                        text += this.tab() + this.line(call['from'] + '-->>' + call['to'] + ': ' + call['message']);
                    }
                    if (call['type'] == 'Event') {
                        text += this.tab() + this.line('note over ' + call['from'] + ':' + call['message']);
                    }
                }
            }

            console.log(text);

            return text;
        },
        makeInvocaitons: function(json) {
            const requestEvent = this.getRequest(json);
            const responseEvent = this.getResponse(json);

            let calls = [];

            if (requestEvent) {
                calls.push(this.getRequestCall(requestEvent));
            }

            if (json['childInvocationList']) {
                const methodCalls = this.getCalls('Handler', json['childInvocationList'][0], []);
                for (const call of methodCalls) {
                    calls.push(call);
                }
            }

            if (responseEvent) {
                calls.push(this.getResponseReturn(responseEvent));
            }

            return calls;
        },
        line: function(v) {
            if (!v) {
                return '\n';
            }
            return v + '\n';
        },
        space: function(v) {
            if (v) {
                return ' ' + v;
            }
            return v;
        },
        tab: function() {
            return '    ';
        },
        afterDot: function(v) {
            if (!v) {
                return v;
            }
            const index = v.lastIndexOf('.');
            if (index <= 0 && index > v.length - 1) {
                return v;
            }
            return v.substr(index + 1);
        },
        dotToSlash: function(v) {
            if (!v) {
                return v;
            }
            return v.replace(/\./g, '/');
        },
        beforeDollar: function(v) {
            if (!v) {
                return v;
            }
            const index = v.indexOf('$');
            if (index <= 0) {
                return v;
            }
            return v.substr(0, index);
        },
        targetClassSimpleName: function(v) {
            return this.afterDot(this.beforeDollar(v));
        },
        getParticipants: function(invocation, participants) {
            console.log('----getParticipants');

            const participant = this.getParticipant(invocation);
            if (participant) {
                participants.add(this.getParticipant(invocation));
            }

            const childInvocationList = this.getChildInvocationList(invocation);
            if (childInvocationList) {
                for (const childInvocation of childInvocationList) {
                    this.getParticipants(childInvocation, participants);
                }
            }

            console.log(participants);
            return participants;
        },
        getParticipant: function(invocation) {
            console.log('----getParticipant');

            const target = this.getTarget(invocation);
            if (!target) {
                return null;
            }

            const declaringType = target['declaringTypeString'];
            const proxyTarget = target['proxyTargetString'];

            console.log(declaringType);
            console.log(proxyTarget);

            let participant = proxyTarget ? proxyTarget : declaringType;
            if (!participant) {
                const signatureInfo = this.getSignatureInfo(invocation);
                participant = signatureInfo['declaringType'];
            }

            return participant;
        },
        getCalls: function(parent, invocation, calls) {
            console.log('----getCalls');

            const call = this.getCall(parent, invocation);
            if (call) {
                calls.push(call);
            }

            const childInvocationList = this.getChildInvocationList(invocation);

            const eventList = this.getEventList(invocation);
            if (eventList) {
                for (const event of eventList) {
                    const eventCall = this.getEventCall(invocation, event);
                    calls.push(eventCall);
                }
            }

            if (childInvocationList) {
                const parent = this.getParticipant(invocation);
                for (const childInvocation of childInvocationList) {
                    this.getCalls(parent, childInvocation, calls);
                }
            }

            const rtn = this.getReturn(parent, invocation);
            if (rtn) {
                calls.push(rtn);
            }

            calls.sort(function(c0, c1) {
                const t0 = c0['type'];
                const t1 = c1['type'];

                let seq0 = c0['seq'];
                let s0 = c0['start'];
                if (t0 == 'Return') {
                    s0 = c0['end'];
                }
                let seq1 = c1['seq'];
                let s1 = c1['start'];
                if (t1 == 'Return') {
                    s1 = c1['end'];
                }

                if (seq0 && seq1 && seq0 != seq1) {
                    return seq0 - seq1;
                }

                return s0 - s1;
            });

            console.log(calls);

            return calls;
        },
        getCall: function(parent, invocation) {
            const id = this.getId(invocation);
            const from = parent;
            const to = this.getParticipant(invocation);
            const method = this.getCallMethod(invocation);
            const valueType = this.getCallValueType(invocation);
            const value = this.getCallValue(invocation);
            const start = this.getStart(invocation);
            const end = this.getEnd(invocation);
            const seq = this.getStartSeq(invocation);
            const duration = this.getDuration(invocation);
            const message = this.getCallMessage(invocation);

            return {
                type: 'Call',
                id: id,
                from: from,
                to: to,
                method: method,
                valueType: valueType,
                value: value,
                start: start,
                end: end,
                seq: seq,
                duration: duration,
                message: message
            };
        },
        getReturn: function(parent, invocation) {
            const id = this.getId(invocation);
            const from = this.getParticipant(invocation);
            const to = parent;
            const method = this.getCallMethod(invocation);
            const valueType = this.getReturnValueType(invocation);
            const value = this.getReturnValue(invocation);

            // error
            const throwableType = this.getThrowableType(invocation);
            const throwable = this.getThrowable(invocation);

            const start = this.getStart(invocation);
            const end = this.getEnd(invocation);
            const seq = this.getEndSeq(invocation);
            const duration = this.getDuration(invocation);
            const message = this.getReturnMessage(invocation);

            console.log('throwableType=' + throwableType);
            console.log('message=' + message);

            return {
                type: 'Return',
                id: id,
                from: from,
                to: to,
                method: method,
                valueType: valueType,
                value: value,

                // error
                throwableType: throwableType,
                throwable: throwable,

                start: start,
                end: end,
                seq: seq,
                duration: duration,
                message: message
            };
        },
        getEventCall: function(invocation, event) {
            const from = this.getParticipant(invocation);
            const to = this.getParticipant(invocation);
            const method = null;
            const valueType = event['type'];
            const value = null;
            const start = this.getEventStart(event);
            const end = null;
            const seq = this.getEventSeq(event);
            const duration = null;
            const message = this.getEventMessage(event);
            const eventValue = this.getEventValue(event);

            return {
                type: 'Event',
                from: from,
                to: to,
                method: method,
                valueType: valueType,
                value: value,
                start: start,
                end: end,
                seq: seq,
                duration: duration,
                message: message,
                eventValue: eventValue
            };
        },
        getRequestCall: function(event) {
            if (!event) {
                return null;
            }

            const from = 'Client';
            const to = 'Handler';

            let message = '';
            const method = event['method'];
            const requestURI = event['requestURI'];
            const queryString = event['queryString'];
            let value = '';

            if (method) {
                message += method;
            }
            if (requestURI) {
                message += this.space(requestURI);
                value += requestURI;
            }
            if (queryString) {
                value += '?' + queryString;
            }

            return {
                type: 'Call',
                id: 'Request / Response',
                from: from,
                to: to,
                method: method,
                valueType: '',
                value: value,
                duration: null,
                message: message
            };
        },
        getResponseReturn: function(event) {
            if (!event) {
                return '';
            }

            const from = 'Handler';
            const to = 'Client';

            let message = '';
            const status = event['status'];
            const reasonPhrase = event['reasonPhrase'];

            if (status) {
                message += status;
            }
            if (reasonPhrase) {
                message += this.space(reasonPhrase);
            }

            return {
                type: 'Return',
                id: 'Request / Response',
                from: from,
                to: to,
                method: '',
                valueType: '',
                value: status,
                duration: null,
                message: message
            };
        },
        getCallMethod: function(invocation) {
            const signatureInfo = this.getSignatureInfo(invocation);
            if (signatureInfo) {
                const message = signatureInfo['name'];
                if (message) {
                    return message;
                }
            }

            return "[Unknown]";
        },
        getCallValueType: function(invocation) {
            const argsInfoInfo = this.getArgsInfoInfo(invocation);
            if (!argsInfoInfo) {
                return [];
            }

            const v = [];
            for (const arg of argsInfoInfo) {
                v.push(arg['declaringTypeString']);
            }

            return v;
        },
        getCallValue: function(invocation) {
            const argsInfoInfo = this.getArgsInfoInfo(invocation);
            if (!argsInfoInfo) {
                return [];
            }

            const v = [];
            for (const arg of argsInfoInfo) {
                v.push(arg['toStringValue']);
            }

            return v;
        },
        getReturnValueType: function(invocation) {
            const returnValueInfo = this.getReturnValueInfo(invocation);
            if (!returnValueInfo) {
                return null;
            }

            return returnValueInfo['declaringTypeString'];
        },
        getReturnValue: function(invocation) {
            const returnValueInfo = this.getReturnValueInfo(invocation);
            if (!returnValueInfo) {
                return null;
            }

            return returnValueInfo['toStringValue'];
        },
        getThrowableType: function(invocation) {
            const throwableInfo = this.getThrowableInfo(invocation);
            if (!throwableInfo) {
                return null;
            }

            return throwableInfo['declaringTypeString'];
        },
        getThrowable: function(invocation) {
            const throwableInfo = this.getThrowableInfo(invocation);
            if (!throwableInfo) {
                return null;
            }

            return throwableInfo['toStringValue'];
        },
        getCallMessage: function(invocation) {
            const signatureInfo = this.getSignatureInfo(invocation);
            if (signatureInfo) {
                const message = signatureInfo['name'];
                if (message) {
                    return message;
                }
            }

            return "[Unknown]";
        },
        getEventMessage: function(event) {
            const type = event['type'];
            const value = event['value'];
            if (!type || !value) {
                return null;
            }

            return value['message'];
        },
        getReturnMessage: function(invocation) {
            const throwableType = this.getThrowableType(invocation);
            if (throwableType) {
                return this.targetClassSimpleName(throwableType);
            }

            const returnValueType = this.getReturnValueType(invocation);
            if (returnValueType) {
                return this.targetClassSimpleName(returnValueType);
            }

            return null;
        },
        getRequestMessage: function(invocation) {
            const event = this.getRequest(invocation);
            if (!event) {
                return '';
            }

            let message = '';
            const method = event['method'];
            const requestURI = event['requestURI'];

            if (method) {
                message += method;
            }
            if (requestURI) {
                message += this.space(requestURI);
            }

            return message;
        },
        getResponseMessage: function(invocation) {
            const event = this.getResponse(invocation);
            if (!event) {
                return '';
            }

            let message = '';
            const status = event['status'];
            const reasonPhrase = event['reasonPhrase'];

            if (status) {
                message += status;
            }
            if (reasonPhrase) {
                message += this.space(reasonPhrase);
            }

            return message;
        },
        getRequest: function(invocation) {
            const eventList = this.getEventList(invocation);
            for (const event of eventList) {
                const type = event['type'];
                if (!type) {
                    continue;
                }
                if (type == 'REQUEST') {
                    return event['value'];
                }
            }
            return {};
        },
        getResponse: function(invocation) {
            const eventList = this.getEventList(invocation);
            for (const event of eventList) {
                const type = event['type'];
                if (!type) {
                    continue;
                }
                if (type == 'RESPONSE') {
                    return event['value'];
                }
            }
            return {};
        },
        getChildInvocationList: function(invocation) {
            return invocation['childInvocationList'];
        },
        getJoinPointInfo: function(invocation) {
            return invocation['joinPointInfo'];
        },
        getTarget: function(invocation) {
            const joinPointInfo = this.getJoinPointInfo(invocation);
            if (!joinPointInfo) {
                return null;
            }

            return joinPointInfo['target'];
        },
        getSignatureInfo: function(invocation) {
            const joinPointInfo = this.getJoinPointInfo(invocation);
            if (!joinPointInfo) {
                return null;
            }

            return joinPointInfo['signatureInfo'];
        },
        getArgsInfoInfo: function(invocation) {
            const joinPointInfo = this.getJoinPointInfo(invocation);
            if (!joinPointInfo) {
                return null;
            }

            return joinPointInfo['argsInfo'];
        },
        getReturnValueInfo: function(invocation) {
            console.log('----getReturnValueInfo');

            return invocation['returnValueInfo'];
        },
        getThrowableInfo: function(invocation) {
            console.log('----getThrowableInfo');

            return invocation['throwableInfo'];
        },
        getEventList: function(invocation) {
            return invocation['eventList'];
        },
        getId: function(invocation) {
            return invocation['id'];
        },
        getStart: function(invocation) {
            return invocation['start'];
        },
        getEnd: function(invocation) {
            return invocation['end'];
        },
        getStartSeq: function(invocation) {
            return invocation['startSeq'];
        },
        getEndSeq: function(invocation) {
            return invocation['endSeq'];
        },
        getEventStart: function(event) {
            const eventValue = this.getEventValue(event);
            if (!eventValue) {
                return null;
            }

            return eventValue['start'];
        },
        getEventSeq: function(event) {
            if (!event) {
                return null;
            }

            return event['seq'];
        },
        getEventValue: function(event) {
            return event['value'];
        },
        getDuration: function(invocation) {
            return invocation['duration'];
        },
        getInvocation: function () {
            this.clear();
            this.loading = true;

            const data = new AdonisTrack().getInvocation(this.id);
            console.log(data);

            this.json = data;

            this.mermaidSequence = this.makeMermaidSequence(data);
            console.log(this.mermaidSequence);

            this.invocations = this.makeInvocaitons(data);
            console.log(this.invocations);

            this.request = this.getRequest(data);
            console.log(this.request);

            this.response = this.getResponse(data);
            console.log(this.response);

            this.participants = this.getParticipants(data, new Set());
            console.log(this.participants);

            this.loading = false;
        },
        getSessionStorage: function() {
            const sessionStorage = window.sessionStorage;
            return sessionStorage;
        },
        getMermaidTheme: function() {
            const sessionStorage = this.getSessionStorage()
            const mermaidTheme = sessionStorage.getItem('mermaidTheme');
            if (mermaidTheme) {
                return mermaidTheme;
            }
            return 'forest';
        },
        getLinkBaseUrl: function() {
            const sessionStorage = this.getSessionStorage();
            const linkBaseUrl = sessionStorage.getItem('linkBaseUrl');
            if (linkBaseUrl) {
                return linkBaseUrl;
            }
            return 'http://localhost:63342/api/file/src/main/java/';
        },
        getLinkType: function() {
            const sessionStorage = this.getSessionStorage();
            const linkType = sessionStorage.getItem('linkType');
            if (linkType) {
                return linkType;
            }
            return 'IntelliJ';
        },
        getInvocationByIdAndType: function(id, type) {
            if (!id || !type) {
                return null;
            }

            for (const invocation of this.invocations) {
                if (id == invocation['id'] && type == invocation['type']) {
                    return invocation;
                }
            }

            return null;
        },
        setCurrentInvocationsBySequenceIndex: function(index) {
            const currentSequence = this.sequences[index];
            if (!currentSequence) {
                return;
            }

            this.currentCallInvocation = this.getInvocationByIdAndType(currentSequence['id'], 'Call');
            this.currentReturnInvocation = this.getInvocationByIdAndType(currentSequence['id'], 'Return');
        },
        linkToSource: function(participantAlias) {
            let participant = null;
            for (const p of this.participants) {
                if (participantAlias == this.afterDot(p)) {
                    participant = p;
                    break;
                }
            }
            if (!participant) {
                return;
            }
            this.linkToSourceByFqn(participant);
        },
        linkToSourceByFqn: function(fqn) {
            if (!fqn) {
                return;
            }
            const url = this.dotToSlash(fqn);
            if (!this.getLinkBaseUrl()) {
                return;
            }
            if (!this.getLinkType()) {
                return;
            }

            if (this.getLinkType() == 'IntelliJ') {
                $.ajax({
                    url: this.getLinkBaseUrl() + url + '.java',
                    method: "GET",
                    async: false,
                    success: function(data) {
                        console.log(data);
                        return true;
                    },
                    error: function(error) {
                        console.log(error);
                        return false;
                    },
                    complete: function() {
                        console.log('complete');
                    }
                })
            } else {
                window.open(this.getLinkBaseUrl() + url + '.java', '_blank');
            }
        }
    }
});
