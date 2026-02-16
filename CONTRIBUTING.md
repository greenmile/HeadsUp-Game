# Contributing Guidelines

## ⚠️ Windows PowerShell Environment

This project is developed in a **Windows PowerShell** environment. Please note the following syntax differences for terminal commands:

### Command Chaining
- **Do NOT use**: `&&` (Bash/standard shell) unless using PowerShell 7+
- **USE**: `;` (Semicolon) to chain commands sequentially

**Incorrect:**
```powershell
git add . && git commit -m "message" && git push
```

**Correct:**
```powershell
git add .; git commit -m "message"; git push
```

### Git Workflow
When pushing changes:
1. Initialize/Add: `git add .`
2. Commit: `git commit -m "Your message"`
3. Push: `git push origin main`
