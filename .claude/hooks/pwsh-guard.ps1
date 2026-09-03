# PreToolUse guard for the shell tool on Windows PowerShell 5.1.
# Blocks the two failure modes behind ~13% of this repo's shell errors
# (caveman learn: learning_loop:error_loop, all "PowerShell failed N times").
# Reads the tool-call JSON on stdin; exit 2 = block + message shown to Claude.

$ErrorActionPreference = 'Stop'
try {
  $raw = [Console]::In.ReadToEnd()
  if (-not $raw) { exit 0 }
  $cmd = ($raw | ConvertFrom-Json).tool_input.command
} catch { exit 0 }               # not a shell call / unparseable -> don't interfere
if (-not $cmd) { exit 0 }

$natives = 'git|pnpm|npm|npx|node|tsc|eslint|nest|jest|vitest|turbo|docker|wsl|supabase|prettier'

# 1) `2>&1` on a native executable: PS 5.1 wraps each stderr line in a
#    NativeCommandError and sets $? to $false even on exit 0. stderr is
#    already captured for you.
if ($cmd -match "(?:^|[;&|(]|\s)(?:$natives)\b[^|`r`n]*2>&1") {
  [Console]::Error.WriteLine("BLOCKED by pwsh-guard: remove '2>&1' from the native command. In Windows PowerShell it wraps stderr in NativeCommandError and flips `$?, producing a false failure. stderr is already captured; just run the command without the redirect. If you truly need merged streams, pipe through: `$_ = & <cmd> 2>&1 | Out-String`.")
  exit 2
}

# 2) `&&` / `||` command chaining: parser error in Windows PowerShell 5.1.
#    Require a space on both sides (how chaining is virtually always written) so
#    a regex literal like -Pattern 'a||b' inside a command is not a false hit.
if ($cmd -match '\s(?:&&|\|\|)\s') {
  [Console]::Error.WriteLine("BLOCKED by pwsh-guard: '&&' and '||' are parser errors in Windows PowerShell 5.1. Chain with ';' and gate on `$?:  A; if (`$?) { B }  for conditional, or  A; B  for unconditional.")
  exit 2
}

exit 0
