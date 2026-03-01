# Capabilities

## Intent System

Neura classifies all user input into structured intents. Each intent represents
a category of system operation.

### Intent Categories

#### Safe Operations (Auto-execute)

| Intent                  | Description                     | Examples                                                 |
| ----------------------- | ------------------------------- | -------------------------------------------------------- |
| `file_read`             | Read files and directories      | "Show me package.json", "List files in src/"             |
| `information_retrieval` | Search and retrieve information | "Search for TODO comments", "Find all TypeScript files"  |
| `memory_query`          | Access conversation history     | "What did we discuss earlier?", "Show previous commands" |

#### Sensitive Operations (Require Confirmation)

| Intent                        | Description                                | Examples                                          |
| ----------------------------- | ------------------------------------------ | ------------------------------------------------- |
| `system_command`              | Execute system commands                    | "Create a directory", "Run the build script"      |
| `package_management`          | Install/update/remove packages             | "Install lodash", "Update dependencies"           |
| `file_write`                  | Create, update, delete files               | "Create a new config file", "Delete temp folder"  |
| `process_management`          | Manage system processes                    | "Kill process on port 3000", "Restart the server" |
| `environment_modification`    | Modify environment variables               | "Set NODE_ENV to production"                      |
| `sensitive_network_operation` | Network operations with data exposure risk | "Send POST request with this data"                |

#### Restricted Operations (Blocked)

| Intent                    | Description                   | Examples                               |
| ------------------------- | ----------------------------- | -------------------------------------- |
| `permission_modification` | Change file permissions       | "chmod 777 everything"                 |
| `ssh_key_access`          | Access SSH keys               | "Show my SSH private key"              |
| `password_access`         | Access password files         | "Read /etc/passwd", "Show .env file"   |
| `crypto_mining`           | Cryptocurrency mining         | "Run xmrig", "Start mining"            |
| `suspicious_network`      | Suspicious network operations | "Open reverse shell"                   |
| `security_disable`        | Disable security features     | "Turn off firewall", "Disable SELinux" |
| `browser_password_access` | Access browser passwords      | "Get Chrome passwords"                 |
| `firewall_modification`   | Modify firewall rules         | "iptables -F", "Disable ufw"           |

#### Out of Scope

| Intent    | Description                         | Examples                                |
| --------- | ----------------------------------- | --------------------------------------- |
| `unknown` | Unrecognized or unsupported queries | "Tell me a joke", "What's the weather?" |

## Execution Model

### Request Flow

```
User Input
    ↓
Intent Classification (AI)
    ↓
Security Classification
    ↓
[SAFE] → Auto-execute
[SENSITIVE] → Request confirmation → Execute
[RESTRICTED] → Block with explanation
[UNKNOWN] → Reject with scope clarification
```

### Confirmation Levels

| Level            | Behavior                               | User Experience                                      |
| ---------------- | -------------------------------------- | ---------------------------------------------------- |
| **Auto-execute** | Operation proceeds immediately         | "Done. I've listed the files."                       |
| **Confirm**      | System asks for explicit approval      | "This will install packages. Proceed? (y/n)"         |
| **Block**        | Operation is rejected with explanation | "This operation is restricted for security reasons." |

## Response Schema

Every query returns a structured response:

```typescript
{
    intent: string; // Detected intent
    security: string; // SAFE | SENSITIVE | RESTRICTED
    canExecute: boolean; // Whether execution is permitted
    reason: string; // Explanation of classification
}
```

## Scope Boundaries

### In Scope

Neura handles operations related to:

- Files and directories
- Package managers (npm, pnpm, yarn)
- System processes
- Environment variables
- Controlled network requests
- Development workflows

### Out of Scope

Neura explicitly rejects:

- General knowledge questions
- Conversational queries
- Personal questions
- World facts
- Opinion requests
- Chat-like interactions

## Extensibility

The intent system is designed for extension. New intents can be added by:

1. Defining the intent schema
2. Adding classification examples
3. Setting security classification
4. Implementing the execution handler

See [Development Guide](./development-guide.md) for details on adding new
intents.
