Reindexar o banco de memória do ink-ops no Qdrant (coleção `ink_ops_memory`).

Garanta que o Qdrant está rodando:
```powershell
docker compose -f docker-compose.rag.yml up -d
```

Reindex incremental (rápido) — usa o venv dedicado do WSL. É **incremental de
verdade**: só re-embeda chunks cujo conteúdo mudou (compara `chunk_hash`) e remove pontos
órfãos (seções/arquivos removidos):
```powershell
wsl ~/ink-ops-rag-venv/bin/python bin/scripts/rag/index.py --no-recreate
```

Rebuild completo (recria a coleção, named vectors + payload indexes). **Necessário uma
vez** após mudar o modelo/dimensão de embedding, pois invalida todos os vetores antigos:
```powershell
wsl ~/ink-ops-rag-venv/bin/python bin/scripts/rag/index.py
```

Diagnóstico do índice:
```powershell
wsl ~/ink-ops-rag-venv/bin/python bin/scripts/rag/health.py
```

Obs.: os hooks (SessionStart em background; PostToolUse em Write/Edit de `.memory/`)
já reindexam automaticamente — este comando é para reindex manual sob demanda.
Se o venv não existir, rode `/rag-setup` primeiro.
