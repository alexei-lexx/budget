---
name: pass-credentials
description: "Retrieves budget app credentials from the local `pass` store (budget/dev/user/email and budget/dev/user/password) and makes them available for the current task. Use this whenever a task requires logging in to the budget app or a playwright script needs credentials — even if the user hasn't explicitly said 'get credentials'."
---

# pass-credentials

Retrieve credentials for the budget app from the local `pass` store and
surface them for use in the current task.

## How to use

Run both commands and capture their output:

```bash
EMAIL=$(pass show budget/dev/user/email)
PASSWORD=$(pass show budget/dev/user/password)
```

Then use `$EMAIL` and `$PASSWORD` wherever the credentials are needed —
for example, filling in a login form with playwright-cli:

```bash
playwright-cli fill <email-field-ref> "$EMAIL"
playwright-cli fill <password-field-ref> "$PASSWORD"
```

## Troubleshooting

If `pass show` hangs or asks for a GPG passphrase interactively, the
gpg-agent may have timed out. Run this to restart it and retry:

```bash
gpg-agent --daemon
pass show budget/dev/user/email
```
