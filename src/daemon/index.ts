/**
 * Daemon Module
 *
 * Background process management for Neura framework.
 * Provides daemon lifecycle management, PID tracking, and IPC infrastructure.
 */

// Execution mode detection
export { ExecutionModeDetector } from './execution-mode.detector';

// Home directory management
export { NeuraHomeService, getNeuraHomeService, resetNeuraHomeService } from './neura-home.service';

// PID file management
export { PidService, type PidFileContent } from './pid.service';

// Process management
export { ProcessService } from './process.service';

// Socket/IPC management (future)
export { SocketService } from './socket.service';

// Daemon lifecycle orchestration
export { DaemonManager } from './daemon.manager';
