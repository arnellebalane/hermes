declare function on(topic: string, callback: (data: any) => void): void;
declare function off(topic: string, callback?: (data: any) => void): void;
declare const hermes: {
    on: typeof on;
    off: typeof off;
    send: (topic: string, data: any, target?: "other" | "current" | "all") => void;
};
export default hermes;