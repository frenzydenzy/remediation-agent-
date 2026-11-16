/**
 * Logging utility with multiple log levels
 */
export declare class Logger {
    private context;
    constructor(context: string);
    private formatMessage;
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
    debug(message: string): void;
}
//# sourceMappingURL=logger.d.ts.map