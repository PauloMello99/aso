Buscar manualmente no banco de memória semântica.

Execute (substitua pela sua query):
```powershell
python bin/scripts/rag/query.py "$ARGUMENTS"
```

Exemplos:
```powershell
python bin/scripts/rag/query.py "monorepo conventions"
python bin/scripts/rag/query.py -k 8 "package aliasing"
python bin/scripts/rag/query.py "como adicionar nova app"
```

Nota: O Claude também pode buscar autonomamente via MCP tool `qdrant_find` quando o Qdrant está rodando.
