// Type declarations for modules without type definitions
declare module '@modelcontextprotocol/sdk/server/stdio.js' {
    export interface Transport {
        start(): Promise<void>;
        send(data: any): Promise<void>;
        close(): Promise<void>;
        onData(handler: (data: any) => void): void;
    }

    export class StdioServerTransport implements Transport {
        constructor();
        start(): Promise<void>;
        send(data: any): Promise<void>;
        close(): Promise<void>;
        onData(handler: (data: any) => void): void;
    }
}

declare module '@azure/identity' {
    export class ClientSecretCredential {
        constructor(tenantId: string, clientId: string, clientSecret: string);
        getToken(scopes: string | string[], options?: any): Promise<{ token: string }>;
    }
}

declare module '@microsoft/microsoft-graph-client' {
    export class Client {
        static init(options: any): Client;
        static initWithMiddleware(authProvider: any): Client;
        api(path: string): {
            get(): Promise<any>;
            post(body: any): Promise<any>;
            patch(body: any): Promise<any>;
            delete(): Promise<void>;
            header(name: string, value: string): any;
            headers(headers: Record<string, string>): any;
            query(params: Record<string, any>): any;
        };
    }
}
