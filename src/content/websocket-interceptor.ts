/**
 * WebSocket Interceptor - Sayfa context'inde çalışır
 * WebSocket mesajlarını yakalayıp content script'e iletir
 * JWT token kullanmaz, sadece gelen mesajları okur
 */

(function () {
    'use strict';

    const INTERCEPTOR_ID = 'rollercoin-ws-interceptor';

    // Zaten inject edildiyse çık
    if ((window as any)[INTERCEPTOR_ID]) {
        return;
    }
    (window as any)[INTERCEPTOR_ID] = true;

    console.log('Rollercoin WS Interceptor: Initializing...');

    // Orijinal WebSocket'i sakla
    const OriginalWebSocket = window.WebSocket;

    // WebSocket wrapper class
    class InterceptedWebSocket extends OriginalWebSocket {
        constructor(url: string | URL, protocols?: string | string[]) {
            super(url, protocols);

            const wsUrl = typeof url === 'string' ? url : url.toString();

            // Sadece rollercoin WebSocket'lerini dinle
            if (wsUrl.includes('ws.rollercoin.com')) {
                console.log('Rollercoin WS Interceptor: Connected to', wsUrl);
                this.setupMessageInterceptor();
            }
        }

        private setupMessageInterceptor() {
            // onmessage için getter/setter override
            let originalOnMessage: ((this: WebSocket, ev: MessageEvent) => any) | null = null;

            Object.defineProperty(this, 'onmessage', {
                get: () => originalOnMessage,
                set: (handler: ((this: WebSocket, ev: MessageEvent) => any) | null) => {
                    originalOnMessage = handler;

                    // Wrap the handler
                    const wrappedHandler = (event: MessageEvent) => {
                        this.interceptMessage(event.data);
                        if (handler) {
                            handler.call(this, event);
                        }
                    };

                    // addEventListener kullanarak dinle
                    this.addEventListener('message', wrappedHandler as EventListener);
                },
                configurable: true
            });

            // addEventListener için de intercept
            const originalAddEventListener = this.addEventListener.bind(this);
            this.addEventListener = (
                type: string,
                listener: EventListenerOrEventListenerObject | null,
                options?: boolean | AddEventListenerOptions
            ) => {
                if (type === 'message' && listener) {
                    const wrappedListener = (event: Event) => {
                        if (event instanceof MessageEvent) {
                            this.interceptMessage(event.data);
                        }
                        if (typeof listener === 'function') {
                            listener.call(this, event);
                        } else if (listener && typeof listener.handleEvent === 'function') {
                            listener.handleEvent(event);
                        }
                    };
                    originalAddEventListener(type, wrappedListener as EventListener, options);
                } else if (listener) {
                    originalAddEventListener(type, listener, options);
                }
            };
        }

        private interceptMessage(data: any) {
            try {
                const message = typeof data === 'string' ? JSON.parse(data) : data;

                if (!message || !message.cmd) return;

                // power - Kullanıcı gücü
                if (message.cmd === 'power' && message.cmdval) {
                    console.log('Rollercoin WS Interceptor: power =', message.cmdval.total);
                    window.postMessage({
                        type: 'ROLLERCOIN_WS_POWER',
                        data: {
                            total: message.cmdval.total,
                            penalty: message.cmdval.penalty || 0
                        }
                    }, '*');
                }

                // pool_power_response - Lig güçleri
                if (message.cmd === 'pool_power_response' && message.cmdval) {
                    console.log('Rollercoin WS Interceptor: pool_power =', message.cmdval.currency, message.cmdval.power);
                    window.postMessage({
                        type: 'ROLLERCOIN_WS_POOL_POWER',
                        data: {
                            currency: message.cmdval.currency,
                            power: message.cmdval.power,
                            league_id: message.cmdval.league_id
                        }
                    }, '*');
                }

                // balance - Kullanıcı bakiyeleri
                if (message.cmd === 'balance' && message.cmdval) {
                    console.log('Rollercoin WS Interceptor: balance received');
                    window.postMessage({
                        type: 'ROLLERCOIN_WS_BALANCE',
                        data: message.cmdval
                    }, '*');
                }

                // global_settings - Lig blok ödülleri ve havuz güçleri
                if (message.cmd === 'global_settings' && Array.isArray(message.cmdval)) {
                    console.log('Rollercoin WS Interceptor: global_settings received -', message.cmdval.length, 'currencies');
                    window.postMessage({
                        type: 'ROLLERCOIN_WS_GLOBAL_SETTINGS',
                        data: message.cmdval
                    }, '*');
                }

            } catch (e) {
                // JSON parse hatası - mesaj JSON değil, atla
            }
        }
    }

    // WebSocket'i override et
    (window as any).WebSocket = InterceptedWebSocket;

    console.log('Rollercoin WS Interceptor: Ready');
})();
