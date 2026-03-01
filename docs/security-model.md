# Security Model

## Overview

Neura implements a defense-in-depth security model with multiple layers of
protection. Every user input passes through classification, risk assessment, and
execution control before any system operation is performed.

## Security Classifications

Operations are classified into three security levels:

| Classification | Risk Level | Execution Behavior                 |
| -------------- | ---------- | ---------------------------------- |
| **SAFE**       | Low        | Auto-execute without confirmation  |
| **SENSITIVE**  | Medium     | Require explicit user confirmation |
| **RESTRICTED** | High       | Blocked entirely                   |

## Classification Rules

### SAFE Intents

These intents are read-only or low-risk operations:

- `file_read` - Reading files and directories
- `information_retrieval` - Searching and retrieving information
- `memory_query` - Accessing conversation history
- `unknown` - Unrecognized intents (default to safe but rejected for scope)

### SENSITIVE Intents

These intents modify system state but are legitimate operations:

- `system_command` - Creating directories, running scripts
- `package_management` - Installing, updating, removing packages
- `file_write` - Creating, updating, deleting files
- `process_management` - Starting, stopping processes
- `environment_modification` - Changing environment variables
- `sensitive_network_operation` - Network operations with data exposure

### RESTRICTED Intents

These intents are security risks and are blocked:

| Intent                    | Risk                 | Example Blocked Operations        |
| ------------------------- | -------------------- | --------------------------------- |
| `permission_modification` | Privilege escalation | `chmod 777`, `chown root`         |
| `ssh_key_access`          | Credential theft     | `cat ~/.ssh/id_rsa`               |
| `password_access`         | Credential theft     | `cat /etc/passwd`, reading `.env` |
| `crypto_mining`           | Resource abuse       | `xmrig`, `minerd`                 |
| `suspicious_network`      | Backdoor creation    | `nc -e /bin/bash`, reverse shells |
| `security_disable`        | Security bypass      | Disabling SELinux, firewall       |
| `browser_password_access` | Credential theft     | Accessing browser password stores |
| `firewall_modification`   | Security bypass      | `iptables -F`, `ufw disable`      |

## Out-of-Scope Detection

Neura rejects queries that are outside its intended purpose. These patterns are
blocked at the input level:

### Blocked Patterns

| Pattern     | Example                   | Reason            |
| ----------- | ------------------------- | ----------------- |
| `who *`     | "Who is the president?"   | General knowledge |
| `what *`    | "What is the weather?"    | General knowledge |
| `where *`   | "Where is Paris?"         | General knowledge |
| `when *`    | "When did WWII end?"      | General knowledge |
| `tell me *` | "Tell me a joke"          | Conversation      |
| `explain *` | "Explain quantum physics" | Education         |
| `joke*`     | "Joke about programmers"  | Entertainment     |
| `buy me *`  | "Buy me coffee"           | E-commerce        |

## Execution Flow

```
User Input
    ↓
[Out-of-Scope Check] → Reject if matches blocked pattern
    ↓
[Intent Classification] → AI determines intent
    ↓
[Security Classification]
    ↓
    ├─ SAFE → Execute immediately
    ├─ SENSITIVE → Request confirmation → Execute if approved
    └─ RESTRICTED → Block with explanation
```

## Confirmation Mechanism

For SENSITIVE operations, Neura requires explicit user confirmation:

```
User: "Delete the node_modules folder"
Neura: "This will permanently delete node_modules. Proceed? (yes/no)"
User: "yes"
Neura: [Executes deletion]
```

## Threat Model

### Threats Addressed

1. **Accidental Data Loss** - Confirmation gates for destructive operations
2. **Privilege Escalation** - Blocked permission modifications
3. **Credential Theft** - Blocked access to sensitive files
4. **Malware Execution** - Blocked crypto mining and suspicious network ops
5. **Security Bypass** - Blocked attempts to disable security features
6. **Scope Creep** - Out-of-scope detection prevents misuse

### Threats Not Addressed

1. **Social Engineering** - Users can still approve malicious operations
2. **System-Level Compromises** - Neura doesn't protect against OS-level attacks
3. **Network Attacks** - Standard network security practices still required
4. **Physical Access** - Assumes secure physical environment

## Security Best Practices

### For Users

1. **Review confirmations carefully** - Don't blindly approve sensitive
   operations
2. **Understand intent classifications** - Read the reasoning provided
3. **Report misclassifications** - Help improve the security model
4. **Keep API keys secure** - Store OpenAI API key in environment variables

### For Developers

1. **Fail secure** - When uncertain, classify as more restrictive
2. **Log security events** - All classifications and blocks are logged
3. **Test security rules** - Add test cases for security classifications
4. **Regular audits** - Review classification accuracy periodically

## Audit and Logging

Security-relevant events are logged:

- Intent classifications
- Security classifications
- Blocked operations
- Confirmation requests and responses
- Execution failures

Log format includes:

- Timestamp
- Input (sanitized)
- Intent detected
- Security classification
- Action taken
- Reasoning

## Future Enhancements

Planned security improvements:

- **Behavioral Analysis** - Detect anomalous request patterns
- **Rate Limiting** - Prevent abuse of sensitive operations
- **Audit Trail** - Persistent log of all security decisions
- **User Profiles** - Customizable security preferences
- **Multi-Factor Confirmation** - Additional verification for critical
  operations
