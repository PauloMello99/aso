Buscar manualmente no banco de memória semântica (coleção `ink_ops_memory`).

Execute (substitua pela sua query) — usa o venv dedicado do WSL:
```powershell
wsl ~/ink-ops-rag-venv/bin/python bin/scripts/rag/query.py "$ARGUMENTS"
```

Exemplos:
```powershell
wsl ~/ink-ops-rag-venv/bin/python bin/scripts/rag/query.py "monorepo conventions"
wsl ~/ink-ops-rag-venv/bin/python bin/scripts/rag/query.py -k 8 "package aliasing"
wsl ~/ink-ops-rag-venv/bin/python bin/scripts/rag/query.py "onde vivem os use-cases de materiais"
```

Filtros por metadata (escopo da busca):
```powershell
wsl ~/ink-ops-rag-venv/bin/python bin/scripts/rag/query.py --type adr "consequências"
wsl ~/ink-ops-rag-venv/bin/python bin/scripts/rag/query.py --document ADR-0010 "saldo"
wsl ~/ink-ops-rag-venv/bin/python bin/scripts/rag/query.py --section "Consequências" "rls"
```

Diagnóstico do índice (saúde + validação de similaridade):
```powershell
wsl ~/ink-ops-rag-venv/bin/python bin/scripts/rag/health.py
wsl ~/ink-ops-rag-venv/bin/python bin/scripts/rag/health.py --validate --samples 5
```

Busca em código indexado (opt-in):
```powershell
wsl ~/ink-ops-rag-venv/bin/python bin/scripts/rag/query.py --code --app backend --module audit "guard de super_admin"
```

Nota: durante um chat, o Claude deve buscar autonomamente via MCP tool
`memory_search` (servidor `ink-memory`) **antes** de ler o código — aceita os mesmos
filtros (`memory_type`, `document`, `section`, `app`, `module`, `layer`, `include_code`).
Este comando CLI é para inspeção/debug manual.
