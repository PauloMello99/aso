Reindexar o banco de memória do ink-ops no Qdrant.

Execute:
```powershell
python bin/scripts/rag/index.py --no-recreate
```

Se precisar de rebuild completo (recria a collection):
```powershell
python bin/scripts/rag/index.py
```

Certifique-se de que o Qdrant está rodando:
```powershell
docker compose -f docker-compose.rag.yml up -d
```
