/**
 * Confirmation level for sensitive tasks.
 */
export enum ConfirmationLevel {
  /** No confirmation needed */
  NONE = 'none',

  /** Simple yes/no confirmation */
  SIMPLE = 'simple',

  /** Require explicit type confirmation (e.g., type "DELETE" to confirm) */
  EXPLICIT = 'explicit',

  /** Require password or authentication */
  AUTHENTICATED = 'authenticated',
}

/**
 * Security classification for query intents.
 */
export enum SecurityClassification {
  /** Safe operations that require no special handling */
  SAFE = 'safe',

  /** Sensitive operations requiring user confirmation */
  SENSITIVE = 'sensitive',

  /** Restricted operations that are completely blocked */
  RESTRICTED = 'restricted',
}

/**
 * QueryIntent - Enumeration of all known query types for Neura
 *
 * This enum defines the different categories of user intents that
 * Neura can understand and act upon. Each intent represents a
 * specific type of task or request the system can handle.
 */
export enum QueryIntent {
  // === SAFE OPERATIONS ===

  /** Search for information or query data stores */
  INFORMATION_RETRIEVAL = 'information_retrieval',

  /** Access or query memory/conversation history */
  MEMORY_QUERY = 'memory_query',

  /** Read-only file operations */
  FILE_READ = 'file_read',

  // === SENSITIVE OPERATIONS (Require Confirmation) ===

  /** Execute a shell command or system operation */
  SYSTEM_COMMAND = 'system_command',

  /** Install, update, or manage packages/dependencies */
  PACKAGE_MANAGEMENT = 'package_management',

  /** Create, update, or delete files/directories */
  FILE_WRITE = 'file_write',

  /** Operations that affect running processes */
  PROCESS_MANAGEMENT = 'process_management',

  /** Modifying environment variables or system paths */
  ENVIRONMENT_MODIFICATION = 'environment_modification',

  /** Network operations that could expose sensitive data */
  SENSITIVE_NETWORK_OPERATION = 'sensitive_network_operation',

  // === RESTRICTED OPERATIONS (Completely Blocked) ===

  /** Commands that modify user permissions or ownership */
  PERMISSION_MODIFICATION = 'permission_modification',

  /** Commands that access or modify SSH keys */
  SSH_KEY_ACCESS = 'ssh_key_access',

  /** Commands that access password files or secrets */
  PASSWORD_ACCESS = 'password_access',

  /** Commands that could be used for crypto mining */
  CRYPTO_MINING = 'crypto_mining',

  /** Commands that send data to external servers suspiciously */
  SUSPICIOUS_NETWORK = 'suspicious_network',

  /** Commands that disable security features */
  SECURITY_DISABLE = 'security_disable',

  /** Commands that attempt to access browser stored passwords */
  BROWSER_PASSWORD_ACCESS = 'browser_password_access',

  /** Commands that modify firewall rules */
  FIREWALL_MODIFICATION = 'firewall_modification',

  // === UNKNOWN ===

  /** Unknown or unsupported intent */
  UNKNOWN = 'unknown',
}

/**
 * Metadata for each query intent including description, classification,
 * confirmation level, and examples.
 */
export interface IQueryIntentMetadata {
  /** Human-readable description */
  description: string;

  /** Security classification */
  classification: SecurityClassification;

  /** Required confirmation level (only for SENSITIVE) */
  confirmationLevel: ConfirmationLevel;

  /** Example queries for this intent */
  examples: string[];

  /** Keywords that help identify this intent */
  keywords: string[];
}

/**
 * Centralized metadata for all query intents.
 * This is the single source of truth for intent information.
 */
export const QueryIntentMetadata: Record<QueryIntent, IQueryIntentMetadata> = {
  // === SAFE OPERATIONS ===
  [QueryIntent.INFORMATION_RETRIEVAL]: {
    description: 'Search and retrieve information of system only',
    classification: SecurityClassification.SAFE,
    confirmationLevel: ConfirmationLevel.NONE,
    examples: ['Get CPU Utilization', 'Check if nginx is running', 'Check if docker is installed'],
    keywords: ['search', 'find', 'get', 'check', 'status', 'information'],
  },

  [QueryIntent.MEMORY_QUERY]: {
    description: 'Access conversation history, previous context, or stored memories',
    classification: SecurityClassification.SAFE,
    confirmationLevel: ConfirmationLevel.NONE,
    examples: [
      'Fetch all the memory that we have spoke',
      'What did we discuss earlier?',
      'Show me our previous conversation',
    ],
    keywords: ['memory', 'discuss', 'earlier', 'previous', 'conversation', 'spoke'],
  },

  [QueryIntent.FILE_READ]: {
    description: 'Read files and directories without modification',
    classification: SecurityClassification.SAFE,
    confirmationLevel: ConfirmationLevel.NONE,
    examples: [
      'Read the package.json file',
      'Show me the contents of src/',
      'List files in the current directory',
    ],
    keywords: ['read', 'show', 'list', 'cat', 'view', 'display'],
  },

  // === SENSITIVE OPERATIONS ===
  [QueryIntent.SYSTEM_COMMAND]: {
    description:
      'Execute system commands like creating directories, running scripts, or managing processes',
    classification: SecurityClassification.SENSITIVE,
    confirmationLevel: ConfirmationLevel.SIMPLE,
    examples: ['Create a directory named projects', 'Run the build script', 'Execute npm test'],
    keywords: ['create', 'run', 'execute', 'mkdir', 'touch'],
  },

  [QueryIntent.PACKAGE_MANAGEMENT]: {
    description: 'Install, update, or remove packages and dependencies',
    classification: SecurityClassification.SENSITIVE,
    confirmationLevel: ConfirmationLevel.SIMPLE,
    examples: ['Install puppeteer', 'Update all dependencies', 'Remove lodash from the project'],
    keywords: ['install', 'update', 'remove', 'uninstall', 'add', 'npm', 'pnpm', 'yarn'],
  },

  [QueryIntent.FILE_WRITE]: {
    description: 'Create, update, or delete files and directories',
    classification: SecurityClassification.SENSITIVE,
    confirmationLevel: ConfirmationLevel.SIMPLE,
    examples: [
      'Create a new file called config.ts',
      'Delete the temp folder',
      'Update the README.md',
    ],
    keywords: ['create', 'delete', 'remove', 'update', 'write', 'rm', 'mv'],
  },

  [QueryIntent.PROCESS_MANAGEMENT]: {
    description: 'Starting, stopping, or killing system processes',
    classification: SecurityClassification.SENSITIVE,
    confirmationLevel: ConfirmationLevel.EXPLICIT,
    examples: ['Kill process on port 3000', 'Stop the running server', 'Restart the daemon'],
    keywords: ['kill', 'stop', 'restart', 'terminate', 'process', 'port'],
  },

  [QueryIntent.ENVIRONMENT_MODIFICATION]: {
    description: 'Modifying environment variables or system paths',
    classification: SecurityClassification.SENSITIVE,
    confirmationLevel: ConfirmationLevel.EXPLICIT,
    examples: [
      'Set NODE_ENV to production',
      'Add /usr/local/bin to PATH',
      'Update the environment configuration',
    ],
    keywords: ['env', 'path', 'export', 'set', 'variable', 'PATH'],
  },

  [QueryIntent.SENSITIVE_NETWORK_OPERATION]: {
    description: 'Network operations that may expose sensitive data',
    classification: SecurityClassification.SENSITIVE,
    confirmationLevel: ConfirmationLevel.SIMPLE,
    examples: [
      'Send a POST request with this data',
      'Download a file from this URL',
      'Connect to the remote server',
    ],
    keywords: ['curl', 'wget', 'post', 'download', 'upload', 'request'],
  },

  // === RESTRICTED OPERATIONS ===
  [QueryIntent.PERMISSION_MODIFICATION]: {
    description: 'Modifying file permissions or user privileges is restricted',
    classification: SecurityClassification.RESTRICTED,
    confirmationLevel: ConfirmationLevel.NONE,
    examples: ['chmod 777', 'chown root', 'sudo chown'],
    keywords: ['chmod 777', 'chmod -R 777', 'chown root', 'sudo chown'],
  },

  [QueryIntent.SSH_KEY_ACCESS]: {
    description: 'Accessing or modifying SSH keys is not allowed',
    classification: SecurityClassification.RESTRICTED,
    confirmationLevel: ConfirmationLevel.NONE,
    examples: ['cat ~/.ssh/id_rsa', 'ssh-keygen', 'copy my ssh key'],
    keywords: ['~/.ssh/id_rsa', '~/.ssh/id_ed25519', 'cat .ssh/', 'ssh-keygen'],
  },

  [QueryIntent.PASSWORD_ACCESS]: {
    description: 'Accessing password files or secret stores is prohibited',
    classification: SecurityClassification.RESTRICTED,
    confirmationLevel: ConfirmationLevel.NONE,
    examples: ['cat /etc/passwd', 'show me .env', 'read the shadow file'],
    keywords: ['/etc/passwd', '/etc/shadow', '.env', 'cat .env'],
  },

  [QueryIntent.CRYPTO_MINING]: {
    description: 'Cryptocurrency mining operations are not permitted',
    classification: SecurityClassification.RESTRICTED,
    confirmationLevel: ConfirmationLevel.NONE,
    examples: ['run xmrig', 'start mining', 'crypto miner'],
    keywords: ['xmrig', 'minerd', 'cpuminer', 'ethminer'],
  },

  [QueryIntent.SUSPICIOUS_NETWORK]: {
    description: 'Suspicious network operations are blocked for security',
    classification: SecurityClassification.RESTRICTED,
    confirmationLevel: ConfirmationLevel.NONE,
    examples: ['nc -e /bin/bash', 'reverse shell', 'bash -i >& /dev/tcp/'],
    keywords: ['nc -e', 'netcat -e', 'bash -i', '/dev/tcp/', 'python -c "import socket"'],
  },

  [QueryIntent.SECURITY_DISABLE]: {
    description: 'Disabling security features is not allowed',
    classification: SecurityClassification.RESTRICTED,
    confirmationLevel: ConfirmationLevel.NONE,
    examples: ['disable selinux', 'stop firewall', 'turn off antivirus'],
    keywords: ['selinux=0', 'apparmor=disable', 'systemctl stop firewall'],
  },

  [QueryIntent.BROWSER_PASSWORD_ACCESS]: {
    description: 'Accessing browser stored passwords is prohibited',
    classification: SecurityClassification.RESTRICTED,
    confirmationLevel: ConfirmationLevel.NONE,
    examples: ['get chrome passwords', 'read Login Data', 'access browser cookies'],
    keywords: ['Login Data', 'cookies.sqlite', 'key4.db'],
  },

  [QueryIntent.FIREWALL_MODIFICATION]: {
    description: 'Modifying firewall rules is restricted',
    classification: SecurityClassification.RESTRICTED,
    confirmationLevel: ConfirmationLevel.NONE,
    examples: ['iptables -F', 'disable ufw', 'firewall-cmd --remove'],
    keywords: ['iptables -F', 'ufw disable', 'firewall-cmd --remove'],
  },

  // === UNKNOWN ===
  [QueryIntent.UNKNOWN]: {
    description: 'Unrecognized or unsupported query type',
    classification: SecurityClassification.SAFE,
    confirmationLevel: ConfirmationLevel.NONE,
    examples: ['Who is the prime minister of India', 'Buy me a coffee', 'Tell me a joke'],
    keywords: [],
  },
};

/**
 * Helper function to get the security classification for a query intent.
 */
export function getSecurityClassification(intent: QueryIntent): SecurityClassification {
  return QueryIntentMetadata[intent].classification;
}

/**
 * Helper function to check if a query intent requires confirmation.
 */
export function requiresConfirmation(intent: QueryIntent): boolean {
  return QueryIntentMetadata[intent].confirmationLevel !== ConfirmationLevel.NONE;
}

/**
 * Helper function to get the confirmation level for a query intent.
 */
export function getConfirmationLevel(intent: QueryIntent): ConfirmationLevel {
  return QueryIntentMetadata[intent].confirmationLevel;
}

/**
 * Helper function to check if a query intent is restricted (blocked).
 */
export function isRestricted(intent: QueryIntent): boolean {
  return QueryIntentMetadata[intent].classification === SecurityClassification.RESTRICTED;
}
