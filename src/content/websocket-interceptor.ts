// IMMEDIATE TEST LOG - This should appear in console if script loads

/**
 * WebSocket Interceptor - Runs in page context
 * Intercepts WebSocket messages and forwards them to content script
 */

(function () {
    'use strict';

    const INTERCEPTOR_ID = 'rollercoin-ws-interceptor';

    // Already injected, exit
    if ((window as any)[INTERCEPTOR_ID]) {
        return;
    }
    (window as any)[INTERCEPTOR_ID] = true;

    // Store original WebSocket
    const OriginalWebSocket = window.WebSocket;

    // Proxy WebSocket to intercept messages
    (window as any).WebSocket = function (url: string | URL, protocols?: string | string[]) {
        const ws = protocols
            ? new OriginalWebSocket(url, protocols)
            : new OriginalWebSocket(url);

        const wsUrl = typeof url === 'string' ? url : url.toString();

        // Only intercept Rollercoin WebSockets
        if (wsUrl.includes('rollercoin.com')) {

            // Intercept messages using native listener
            ws.addEventListener('message', function (event: MessageEvent) {
                try {
                    const data = event.data;
                    const message = typeof data === 'string' ? JSON.parse(data) : data;

                    if (!message || !message.cmd) return;

                    // power - User power
                    if (message.cmd === 'power' && message.cmdval) {
                        window.postMessage({
                            type: 'ROLLERCOIN_WS_POWER',
                            data: {
                                total: message.cmdval.total,
                                penalty: message.cmdval.penalty || 0
                            }
                        }, '*');
                    }

                    // pool_power_response - League powers
                    if (message.cmd === 'pool_power_response' && message.cmdval) {
                        window.postMessage({
                            type: 'ROLLERCOIN_WS_POOL_POWER',
                            data: {
                                currency: message.cmdval.currency,
                                power: message.cmdval.power,
                                league_id: message.cmdval.league_id
                            }
                        }, '*');
                    }

                    // balance - User balances
                    if (message.cmd === 'balance' && message.cmdval) {
                        window.postMessage({
                            type: 'ROLLERCOIN_WS_BALANCE',
                            data: message.cmdval
                        }, '*');
                    }

                    // global_settings - League block rewards and pool powers
                    if (message.cmd === 'global_settings' && Array.isArray(message.cmdval)) {
                        window.postMessage({
                            type: 'ROLLERCOIN_WS_GLOBAL_SETTINGS',
                            data: message.cmdval
                        }, '*');
                    }

                } catch (e) {
                    // JSON parse error - not JSON, skip
                }
            });
        }

        return ws;
    } as any;

    // Copy static properties
    (window as any).WebSocket.prototype = OriginalWebSocket.prototype;
    (window as any).WebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
    (window as any).WebSocket.OPEN = OriginalWebSocket.OPEN;
    (window as any).WebSocket.CLOSING = OriginalWebSocket.CLOSING;
    (window as any).WebSocket.CLOSED = OriginalWebSocket.CLOSED;
})();
